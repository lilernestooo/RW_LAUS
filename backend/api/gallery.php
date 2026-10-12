 <?php
/**
 * Gallery page photos, all in ONE table: gallery_tbl
 *
 * GET  gallery.php
 *      -> {data: {photos: [{id, url, caption}]}}   (in the order shown on the site)
 *
 * POST gallery.php  (header X-Upload-Token, multipart/form-data)
 *      files[]=<images>  caption=<text, optional, applied to this batch>
 *          New photos are added at the END of the gallery (the first photo posted stays first).
 * POST gallery.php  action=caption  id=<id>  caption=<text>
 * POST gallery.php  action=delete   id=<id>
 * POST gallery.php  action=reorder  ids=<comma separated ids, in the new order>
 */
require __DIR__ . '/config.php';

const IMAGE_TYPES = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp', 'image/gif' => 'gif'];
const GALLERY_DIR = 'gallery'; // inside uploads/

$pdo    = db();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

function clean_name(string $name): string {
    $base = strtolower(pathinfo($name, PATHINFO_FILENAME));
    $base = trim(preg_replace('/[^a-z0-9]+/', '-', $base), '-');
    return substr($base !== '' ? $base : 'file', 0, 60);
}

/** Delete a file, only if it lives inside uploads/. */
function remove_file(string $root, ?string $rel): void {
    if (!$rel) return;
    $path = realpath($root . '/' . $rel);
    if ($path !== false && strpos($path, $root . DIRECTORY_SEPARATOR) === 0 && is_file($path)) {
        unlink($path);
    }
}

// ---------- Read ----------
if ($method === 'GET') {
    try {
        $rows = $pdo->query('SELECT id, filename, caption FROM gallery_tbl ORDER BY sort_order, id')->fetchAll();
    } catch (PDOException $e) {
        error_log($e->getMessage());
        respond(['error' => 'The gallery_tbl table is missing. Run the gallery SQL in phpMyAdmin.'], 500);
    }
    $photos = [];
    foreach ($rows as $r) {
        $photos[] = ['id' => (int)$r['id'], 'url' => image_url($r['filename']), 'caption' => $r['caption']];
    }
    respond(['data' => ['photos' => $photos]]);
}

if ($method !== 'POST') respond(['error' => 'Method not allowed'], 405);

// ---------- Auth ----------
if (UPLOAD_TOKEN === '') respond(['error' => 'UPLOAD_TOKEN is not set in backend/.env'], 500);
$token = $_SERVER['HTTP_X_UPLOAD_TOKEN'] ?? '';
if (!hash_equals(UPLOAD_TOKEN, $token)) respond(['error' => 'Invalid upload token'], 401);

if (empty($_POST) && empty($_FILES) && (int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 0) {
    respond(['error' => 'Upload too large for the server (php.ini post_max_size). Try fewer or smaller photos.'], 413);
}

$root = realpath(UPLOAD_DIR);
if ($root === false) respond(['error' => 'uploads folder is missing'], 500);

$action = $_POST['action'] ?? 'upload';
$find   = $pdo->prepare('SELECT id, filename FROM gallery_tbl WHERE id = ?');

// ---------- Caption ----------
if ($action === 'caption') {
    $find->execute([(int)($_POST['id'] ?? 0)]);
    $row = $find->fetch();
    if (!$row) respond(['error' => 'Photo not found'], 404);
    $caption = mb_substr(trim((string)($_POST['caption'] ?? '')), 0, 255);
    $pdo->prepare('UPDATE gallery_tbl SET caption = ? WHERE id = ?')->execute([$caption === '' ? null : $caption, $row['id']]);
    respond(['data' => ['id' => (int)$row['id'], 'caption' => $caption]]);
}

// ---------- Delete ----------
if ($action === 'delete') {
    $find->execute([(int)($_POST['id'] ?? 0)]);
    $row = $find->fetch();
    if (!$row) respond(['error' => 'Photo not found'], 404);
    $pdo->prepare('DELETE FROM gallery_tbl WHERE id = ?')->execute([$row['id']]);
    remove_file($root, $row['filename']);
    respond(['data' => ['deleted' => (int)$row['id']]]);
}

// ---------- Reorder ----------
if ($action === 'reorder') {
    $ids = array_values(array_filter(array_map('intval', explode(',', (string)($_POST['ids'] ?? '')))));
    if (!$ids) respond(['error' => 'No ids received'], 400);
    $upd = $pdo->prepare('UPDATE gallery_tbl SET sort_order = ? WHERE id = ?');
    $pdo->beginTransaction();
    foreach ($ids as $i => $id) $upd->execute([$i + 1, $id]);
    $pdo->commit();
    respond(['data' => ['reordered' => count($ids)]]);
}

// ---------- Upload ----------
if ($action !== 'upload') respond(['error' => 'Unknown action'], 400);
if (empty($_FILES['files'])) respond(['error' => 'No files received'], 400);

$f     = $_FILES['files'];
$names = (array)$f['name'];
$tmps  = (array)$f['tmp_name'];
$errs  = (array)$f['error'];
$sizes = (array)$f['size'];

$absDir = $root . '/' . GALLERY_DIR;
if (!is_dir($absDir) && !mkdir($absDir, 0755, true)) respond(['error' => 'Could not create folder'], 500);

$caption = mb_substr(trim((string)($_POST['caption'] ?? '')), 0, 255);
$caption = $caption === '' ? null : $caption;

// New photos go to the END, in the same order the files were chosen, so the first
// photo posted stays first and later batches never jump above earlier ones.
$order = (int)$pdo->query('SELECT COALESCE(MAX(sort_order), 0) FROM gallery_tbl')->fetchColumn();

$finfo    = new finfo(FILEINFO_MIME_TYPE);
$uploaded = [];
$errors   = [];

foreach ($names as $i => $original) {
    if ($errs[$i] !== UPLOAD_ERR_OK) { $errors[] = "$original: upload error code {$errs[$i]}"; continue; }
    if ($sizes[$i] > UPLOAD_MAX_MB * 1024 * 1024) { $errors[] = "$original: larger than " . UPLOAD_MAX_MB . ' MB'; continue; }
    if (!is_uploaded_file($tmps[$i])) { $errors[] = "$original: not an uploaded file"; continue; }

    // Trust the real file contents, never the client's name or type
    $mime = $finfo->file($tmps[$i]);
    if (!isset(IMAGE_TYPES[$mime]) || @getimagesize($tmps[$i]) === false) {
        $errors[] = "$original: not a JPG, PNG, WEBP or GIF image";
        continue;
    }

    $final = clean_name($original) . '-' . bin2hex(random_bytes(3)) . '.' . IMAGE_TYPES[$mime];
    if (!move_uploaded_file($tmps[$i], "$absDir/$final")) { $errors[] = "$original: could not save"; continue; }
    $rel = GALLERY_DIR . "/$final";

    try {
        $pdo->prepare('INSERT INTO gallery_tbl (filename, caption, sort_order) VALUES (?, ?, ?)')
            ->execute([$rel, $caption, ++$order]);
        $uploaded[] = ['id' => (int)$pdo->lastInsertId(), 'url' => image_url($rel)];
    } catch (PDOException $e) {
        error_log($e->getMessage());
        unlink("$absDir/$final");
        $errors[] = "$original: database error";
    }
}

respond(['data' => ['uploaded' => $uploaded, 'errors' => $errors]], $uploaded ? 200 : 400);