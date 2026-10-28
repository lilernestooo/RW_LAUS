<?php
/**
 * GET  /api/comments.php?post_id=12          -> approved comments (public)
 * POST /api/comments.php {action:"submit"}   -> new comment (public, saved as pending)
 * POST (admin, token required): action = admin_list | set_status | delete
 */
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/auth.php';   // provides require_admin() (checks the X-Upload-Token login token)

set_exception_handler(function (Throwable $e) {
    error_log($e);
    respond(['error' => 'Server error'], 500);
});

$pdo = db();

// ---------- GET: approved comments for one post ----------
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'GET') {
    $postId = (int)($_GET['post_id'] ?? 0);
    if ($postId < 1) respond(['error' => 'post_id required'], 400);

    $stmt = $pdo->prepare(
        "SELECT id, name, website, comment, created_at
           FROM comments_tbl
          WHERE post_id = ? AND status = 'approved'
          ORDER BY created_at ASC"
    );
    $stmt->execute([$postId]);
    respond(['data' => $stmt->fetchAll()]);   // email is never returned
}

// ---------- POST ----------
$in = json_decode(file_get_contents('php://input'), true);
if (!is_array($in)) respond(['error' => 'Invalid request'], 400);
$action = $in['action'] ?? '';

if ($action === 'submit') {
    // Honeypot: real users leave this empty
    if (!empty($in['hp'])) respond(['data' => ['saved' => true]]);

    $postId  = (int)($in['post_id'] ?? 0);
    $name    = trim((string)($in['name'] ?? ''));
    $email   = trim((string)($in['email'] ?? ''));
    $website = trim((string)($in['website'] ?? ''));
    $comment = trim((string)($in['comment'] ?? ''));

    if ($postId < 1 || $name === '' || $comment === '') respond(['error' => 'Please fill in all required fields.'], 400);
    if (!filter_var($email, FILTER_VALIDATE_EMAIL))      respond(['error' => 'Invalid email address.'], 400);
    if (mb_strlen($name) > 100 || mb_strlen($email) > 190 || mb_strlen($comment) > 3000)
        respond(['error' => 'One of the fields is too long.'], 400);
    if ($website !== '') {
        if (!preg_match('#^https?://#i', $website)) $website = 'https://' . $website;
        if (!filter_var($website, FILTER_VALIDATE_URL) || mb_strlen($website) > 255) $website = '';
    }

    $chk = $pdo->prepare('SELECT 1 FROM posts WHERE id = ?');
    $chk->execute([$postId]);
    if (!$chk->fetchColumn()) respond(['error' => 'Post not found'], 404);

    // Rate limit: 5 comments per IP per hour
    $ip = $_SERVER['REMOTE_ADDR'] ?? null;
    $rl = $pdo->prepare('SELECT COUNT(*) FROM comments_tbl WHERE ip_address = ? AND created_at > (NOW() - INTERVAL 1 HOUR)');
    $rl->execute([$ip]);
    if ((int)$rl->fetchColumn() >= 5) respond(['error' => 'Too many comments. Please try again later.'], 429);

    $ins = $pdo->prepare(
        'INSERT INTO comments_tbl (post_id, name, email, website, comment, ip_address)
         VALUES (?, ?, ?, ?, ?, ?)'
    );
    $ins->execute([$postId, $name, $email, $website ?: null, $comment, $ip]);
    respond(['data' => ['saved' => true, 'status' => 'pending']], 201);
}

// ---------- Admin actions ----------
require_admin();

if ($action === 'admin_list') {
    $status  = $in['status'] ?? 'all';
    $page    = max(1, (int)($in['page'] ?? 1));
    $perPage = 20;
    $where   = in_array($status, ['pending', 'approved', 'spam'], true) ? 'WHERE c.status = ?' : '';
    $params  = $where ? [$status] : [];

    $cnt = $pdo->prepare("SELECT COUNT(*) FROM comments_tbl c $where");
    $cnt->execute($params);
    $total = (int)$cnt->fetchColumn();

    $stmt = $pdo->prepare(
        "SELECT c.*, p.title AS post_title, p.slug AS post_slug
           FROM comments_tbl c JOIN posts p ON p.id = c.post_id
           $where
          ORDER BY c.created_at DESC
          LIMIT ? OFFSET ?"
    );
    $i = 1;
    foreach ($params as $v) $stmt->bindValue($i++, $v);
    $stmt->bindValue($i++, $perPage, PDO::PARAM_INT);
    $stmt->bindValue($i,   ($page - 1) * $perPage, PDO::PARAM_INT);
    $stmt->execute();

    $counts = $pdo->query('SELECT status, COUNT(*) n FROM comments_tbl GROUP BY status')
                  ->fetchAll(PDO::FETCH_KEY_PAIR);

    respond(['data' => $stmt->fetchAll(), 'meta' => [
        'page' => $page, 'total' => $total,
        'total_pages' => (int)ceil($total / $perPage), 'counts' => $counts,
    ]]);
}

if ($action === 'set_status') {
    $status = $in['status'] ?? '';
    if (!in_array($status, ['pending', 'approved', 'spam'], true)) respond(['error' => 'Invalid status'], 400);
    $pdo->prepare('UPDATE comments_tbl SET status = ? WHERE id = ?')->execute([$status, (int)($in['id'] ?? 0)]);
    respond(['data' => ['ok' => true]]);
}

if ($action === 'delete') {
    $pdo->prepare('DELETE FROM comments_tbl WHERE id = ?')->execute([(int)($in['id'] ?? 0)]);
    respond(['data' => ['ok' => true]]);
}

respond(['error' => 'Unknown action'], 400);