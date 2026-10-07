<?php
/**
 * POST dates.php   (JSON body, header X-Upload-Token)
 *   {"dates": {"post-slug": "2018-11-06", "another-slug": ""}}
 * An empty string clears the date.
 */
require __DIR__ . '/config.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') respond(['error' => 'Method not allowed'], 405);

if (UPLOAD_TOKEN === '') respond(['error' => 'UPLOAD_TOKEN is not set in backend/.env'], 500);
$token = $_SERVER['HTTP_X_UPLOAD_TOKEN'] ?? '';
if (!hash_equals(UPLOAD_TOKEN, $token)) respond(['error' => 'Invalid upload token'], 401);

$body  = json_decode(file_get_contents('php://input'), true);
$dates = is_array($body) ? ($body['dates'] ?? null) : null;
if (!is_array($dates)) respond(['error' => 'Send {"dates": {"slug": "YYYY-MM-DD"}}'], 400);

$pdo    = db();
$find   = $pdo->prepare('SELECT id FROM posts WHERE slug = ?');
$update = $pdo->prepare('UPDATE posts SET published_at = ? WHERE id = ?');

$saved  = 0;
$errors = [];

$pdo->beginTransaction();
foreach ($dates as $slug => $date) {
    $slug = (string)$slug;
    $date = is_string($date) ? trim($date) : '';

    if ($date !== '') {
        $ok = preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $date, $m) && checkdate((int)$m[2], (int)$m[3], (int)$m[1]);
        if (!$ok) { $errors[] = "$slug: '$date' is not a valid YYYY-MM-DD date"; continue; }
    }

    $find->execute([$slug]);
    $id = $find->fetchColumn();
    if ($id === false) { $errors[] = "$slug: post not found"; continue; }

    $update->execute([$date === '' ? null : $date, $id]);
    $saved++;
}
$pdo->commit();

respond(['data' => ['saved' => $saved, 'errors' => $errors]], $saved || !$errors ? 200 : 400);