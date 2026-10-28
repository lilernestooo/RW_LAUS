<?php
/**
 * Admin API for Contact Form Messages and Recipient Configuration
 *
 * POST /api/contacts_admin.php
 * Header: X-Upload-Token: <admin_jwt_token>
 *
 * Actions:
 *   admin_list     -> list messages from contacts_tbl, with counts and current recipient
 *   save_recipient -> update the contact recipient email address
 *   get_settings   -> get current recipient settings
 *   toggle_emailed -> mark a message as emailed or un-emailed
 *   delete         -> delete a message by rec_id
 *   bulk_delete    -> delete multiple messages by rec_ids
 */
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/auth.php';

set_exception_handler(function (Throwable $e) {
    error_log($e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());
    respond(['error' => 'Server error occurred while managing contacts.'], 500);
});

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(['error' => 'Method not allowed'], 405);
}

require_admin();

$pdo = db();

// Ensure settings_tbl exists
$pdo->exec(
    "CREATE TABLE IF NOT EXISTS settings_tbl (
        setting_key VARCHAR(64) PRIMARY KEY,
        setting_value TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
);

$in = json_decode(file_get_contents('php://input'), true);
if (!is_array($in)) respond(['error' => 'Invalid JSON request'], 400);

$action = $in['action'] ?? 'admin_list';

// Helper to get active recipient
function get_active_recipient(PDO $pdo): string {
    try {
        $stmt = $pdo->prepare("SELECT setting_value FROM settings_tbl WHERE setting_key = 'contact_recipient' LIMIT 1");
        $stmt->execute();
        $dbVal = trim((string)$stmt->fetchColumn());
        if ($dbVal !== '' && filter_var($dbVal, FILTER_VALIDATE_EMAIL)) {
            return $dbVal;
        }
    } catch (Throwable $e) {}
    return env('CONTACT_TO', 'dwrw951fm@yahoo.com');
}

// Helper to get active settings
function get_all_contact_settings(PDO $pdo): array {
    return [
        'recipient'      => get_active_recipient($pdo),
        'env_recipient'  => env('CONTACT_TO', 'dwrw951fm@yahoo.com'),
        'from_address'   => env('CONTACT_FROM', env('SMTP_USER', '')),
        'from_name'      => env('CONTACT_FROM_NAME', 'DWRW Contact Form'),
        'subject_prefix' => env('CONTACT_SUBJECT_PREFIX', 'DWRW Contact Form'),
        'rate_limit'     => (int) env('CONTACT_RATE_LIMIT', '5'),
    ];
}

// ----------------------------------------------------
// 1) List contact messages
// ----------------------------------------------------
if ($action === 'admin_list') {
    $filter = in_array($in['filter'] ?? 'all', ['all', 'emailed', 'not_emailed'], true) ? $in['filter'] : 'all';

    $where = '';
    $params = [];
    if ($filter === 'emailed') {
        $where = 'WHERE emailed = 1';
    } elseif ($filter === 'not_emailed') {
        $where = 'WHERE emailed = 0';
    }

    // Get total counts
    $countsStmt = $pdo->query(
        "SELECT 
            COUNT(*) AS `all`,
            SUM(CASE WHEN emailed = 1 THEN 1 ELSE 0 END) AS emailed,
            SUM(CASE WHEN emailed = 0 THEN 1 ELSE 0 END) AS not_emailed
         FROM contacts_tbl"
    );
    $counts = $countsStmt->fetch(PDO::FETCH_ASSOC) ?: ['all' => 0, 'emailed' => 0, 'not_emailed' => 0];

    // Fetch messages
    $stmt = $pdo->prepare(
        "SELECT rec_id, name, email, message, ip_address, emailed, created_at
           FROM contacts_tbl
           $where
          ORDER BY created_at DESC"
    );
    $stmt->execute($params);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    respond([
        'data'     => $rows,
        'meta'     => [
            'total'  => (int)($counts['all'] ?? 0),
            'counts' => [
                'all'         => (int)($counts['all'] ?? 0),
                'emailed'     => (int)($counts['emailed'] ?? 0),
                'not_emailed' => (int)($counts['not_emailed'] ?? 0),
            ],
        ],
        'settings' => get_all_contact_settings($pdo),
    ]);
}

// ----------------------------------------------------
// 2) Get current settings
// ----------------------------------------------------
if ($action === 'get_settings') {
    respond(['data' => get_all_contact_settings($pdo)]);
}

// ----------------------------------------------------
// 3) Update contact recipient email
// ----------------------------------------------------
if ($action === 'save_recipient') {
    $newEmail = trim((string)($in['recipient'] ?? ''));
    if (mb_strlen($newEmail) > 150 || !filter_var($newEmail, FILTER_VALIDATE_EMAIL)) {
        respond(['error' => 'Please enter a valid recipient email address (max 150 characters).'], 422);
    }

    $stmt = $pdo->prepare(
        "INSERT INTO settings_tbl (setting_key, setting_value) 
         VALUES ('contact_recipient', ?)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)"
    );
    $stmt->execute([$newEmail]);

    respond([
        'data' => [
            'ok'        => true,
            'recipient' => $newEmail,
            'message'   => 'Contact form recipient updated successfully.',
        ],
    ]);
}

// ----------------------------------------------------
// 4) Toggle or set emailed status
// ----------------------------------------------------
if ($action === 'toggle_emailed') {
    $recId = (int)($in['id'] ?? 0);
    $emailed = isset($in['emailed']) ? ((int)$in['emailed'] ? 1 : 0) : null;

    if ($recId < 1) respond(['error' => 'Invalid message ID'], 400);

    if ($emailed === null) {
        $stmt = $pdo->prepare("UPDATE contacts_tbl SET emailed = IF(emailed = 1, 0, 1) WHERE rec_id = ?");
        $stmt->execute([$recId]);
    } else {
        $stmt = $pdo->prepare("UPDATE contacts_tbl SET emailed = ? WHERE rec_id = ?");
        $stmt->execute([$emailed, $recId]);
    }

    respond(['data' => ['ok' => true]]);
}

// ----------------------------------------------------
// 5) Delete a message
// ----------------------------------------------------
if ($action === 'delete') {
    $recId = (int)($in['id'] ?? 0);
    if ($recId < 1) respond(['error' => 'Invalid message ID'], 400);

    $stmt = $pdo->prepare("DELETE FROM contacts_tbl WHERE rec_id = ?");
    $stmt->execute([$recId]);

    respond(['data' => ['ok' => true]]);
}

// ----------------------------------------------------
// 6) Bulk delete messages
// ----------------------------------------------------
if ($action === 'bulk_delete') {
    $ids = array_filter(array_map('intval', (array)($in['ids'] ?? [])));
    if (empty($ids)) respond(['error' => 'No message IDs specified'], 400);

    $inPlaceholders = implode(',', array_fill(0, count($ids), '?'));
    $stmt = $pdo->prepare("DELETE FROM contacts_tbl WHERE rec_id IN ($inPlaceholders)");
    $stmt->execute(array_values($ids));

    respond(['data' => ['ok' => true, 'deleted' => count($ids)]]);
}

respond(['error' => 'Unknown action: ' . htmlspecialchars($action)], 400);
