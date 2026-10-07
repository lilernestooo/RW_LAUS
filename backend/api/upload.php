<?php
/**
 * GET  upload.php?slug=...        -> gallery images of a post: [{id, url}]
 *
 * POST upload.php  (multipart/form-data, header X-Upload-Token)
 *      slug=<post slug>  type=gallery|featured  images[]=<files>
 *
 * POST upload.php  action=delete  id=<post_images id>   (header X-Upload-Token)
 */
require __DIR__ . '/config.php';

$pdo    = db();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

const ALLOWED_TYPES = [
    'image/jpeg' => 'jpg',
    'image/png'  => 'png',
    'image/webp' => 'webp',
    'image/gif'  => 'gif',
];

function find_post(PDO $pdo, string $slug): array {
    $s = $pdo->prepare('SELECT id, slug FROM posts WHERE slug = ? LIMIT 1');
    $s->execute([$slug]);
    $post = $s->fetch();
    if (!$post) respond(['error' => 'Post not found'], 404);
    return $post;
}

function refresh_gallery_count(PDO $pdo, int $postId): int {
    $pdo->prepare(
        'UPDATE posts SET gallery_count = (SELECT COUNT(*) FROM post_images WHERE post_id = ?) WHERE id = ?'
    )->execute([$postId, $postId]);
    $c = $pdo->prepare('SELECT gallery_count FROM posts WHERE id = ?');
    $c->execute([$postId]);
    return (int)$c->fetchColumn();
}

function clean_name(string $name): string {
    $base = strtolower(pathinfo($name, PATHINFO_FILENAME));
    $base = trim(preg_replace('/[^a-z0-9]+/', '-', $base), '-');
    return substr($base !== '' ? $base : 'photo', 0, 60);
}

// ---------- List ----------
if ($method === 'GET') {
    $post = find_post($pdo, $_GET['slug'] ?? '');
    $s = $pdo->prepare('SELECT id, filename FROM post_images WHERE post_id = ? ORDER BY sort_order, id');
    $s->execute([$post['id']]);
    respond(['data' => array_map(
        fn($r) => ['id' => (int)$r['id'], 'url' => image_url($r['filename'])],
        $s->fetchAll()
    )]);
}

if ($method !== 'POST') respond(['error' => 'Method not allowed'], 405);

// ---------- Auth ----------
if (UPLOAD_TOKEN === '') respond(['error' => 'UPLOAD_TOKEN is not set in backend/.env'], 500);
$token = $_SERVER['HTTP_X_UPLOAD_TOKEN'] ?? '';
if (!hash_equals(UPLOAD_TOKEN, $token)) respond(['error' => 'Invalid upload token'], 401);

// Body bigger than post_max_size arrives empty
if (empty($_POST) && empty($_FILES) && (int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 0) {
    respond(['error' => 'Upload too large. Send fewer or smaller images at once.'], 413);
}

$uploadRoot = realpath(UPLOAD_DIR);
if ($uploadRoot === false) respond(['error' => 'uploads folder is missing'], 500);

// ---------- Delete ----------
if (($_POST['action'] ?? '') === 'delete') {
    $s = $pdo->prepare('SELECT id, post_id, filename FROM post_images WHERE id = ?');
    $s->execute([(int)($_POST['id'] ?? 0)]);
    $row = $s->fetch();
    if (!$row) respond(['error' => 'Image not found'], 404);

    $pdo->prepare('DELETE FROM post_images WHERE id = ?')->execute([$row['id']]);

    // Only delete files that really live inside uploads/
    $path = realpath($uploadRoot . '/' . $row['filename']);
    if ($path !== false && strpos($path, $uploadRoot . DIRECTORY_SEPARATOR) === 0 && is_file($path)) {
        unlink($path);
    }
    respond(['data' => ['deleted' => (int)$row['id'], 'gallery_count' => refresh_gallery_count($pdo, (int)$row['post_id'])]]);
}

// ---------- Upload ----------
$post = find_post($pdo, $_POST['slug'] ?? '');
$type = $_POST['type'] ?? 'gallery';
if (!in_array($type, ['gallery', 'featured'], true)) respond(['error' => 'type must be gallery or featured'], 400);
if (empty($_FILES['images'])) respond(['error' => 'No files received'], 400);

// Normalise $_FILES (works for one file or many)
$f = $_FILES['images'];
$names = (array)$f['name'];
$tmps  = (array)$f['tmp_name'];
$errs  = (array)$f['error'];
$sizes = (array)$f['size'];
if ($type === 'featured') { $names = array_slice($names, 0, 1); }

$relDir = $type === 'gallery'
    ? 'gallery/' . preg_replace('/[^A-Za-z0-9_-]/', '-', $post['slug'])
    : 'featured';
$absDir = $uploadRoot . '/' . $relDir;
if (!is_dir($absDir) && !mkdir($absDir, 0755, true)) respond(['error' => 'Could not create folder'], 500);

$order = 0;
if ($type === 'gallery') {
    $m = $pdo->prepare('SELECT COALESCE(MAX(sort_order), 0) FROM post_images WHERE post_id = ?');
    $m->execute([$post['id']]);
    $order = (int)$m->fetchColumn();
}

$finfo    = new finfo(FILEINFO_MIME_TYPE);
$uploaded = [];
$errors   = [];

foreach ($names as $i => $original) {
    if ($errs[$i] !== UPLOAD_ERR_OK) { $errors[] = "$original: upload error code {$errs[$i]}"; continue; }
    if ($sizes[$i] > UPLOAD_MAX_MB * 1024 * 1024) { $errors[] = "$original: larger than " . UPLOAD_MAX_MB . ' MB'; continue; }
    if (!is_uploaded_file($tmps[$i])) { $errors[] = "$original: not an uploaded file"; continue; }

    // Trust the real file contents, never the client's name or type
    $mime = $finfo->file($tmps[$i]);
    if (!isset(ALLOWED_TYPES[$mime]) || @getimagesize($tmps[$i]) === false) {
        $errors[] = "$original: not a JPG, PNG, WEBP or GIF image";
        continue;
    }

    $final = clean_name($original) . '-' . bin2hex(random_bytes(3)) . '.' . ALLOWED_TYPES[$mime];
    if (!move_uploaded_file($tmps[$i], "$absDir/$final")) { $errors[] = "$original: could not save"; continue; }
    $rel = "$relDir/$final";

    try {
        if ($type === 'gallery') {
            $pdo->prepare('INSERT INTO post_images (post_id, filename, sort_order) VALUES (?, ?, ?)')
                ->execute([$post['id'], $rel, ++$order]);
            $uploaded[] = ['id' => (int)$pdo->lastInsertId(), 'url' => image_url($rel)];
        } else {
            $pdo->prepare('UPDATE posts SET featured_image = ? WHERE id = ?')->execute([$rel, $post['id']]);
            $uploaded[] = ['url' => image_url($rel)];
        }
    } catch (PDOException $e) {
        error_log($e->getMessage());
        unlink("$absDir/$final");
        $errors[] = "$original: database error";
    }
}

$count = $type === 'gallery' ? refresh_gallery_count($pdo, (int)$post['id']) : null;

respond(
    ['data' => ['uploaded' => $uploaded, 'errors' => $errors, 'gallery_count' => $count]],
    $uploaded ? 200 : 400
);