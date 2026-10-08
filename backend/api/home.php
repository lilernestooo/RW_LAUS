<?php
/**
 * Homepage content: hero image, award photos, video.
 *
 * GET  home.php
 *      -> {data: {hero: url|null, video: url|null,
 *                 awards: [{id, url, caption}],
 *                 items:  [{id, kind, url, caption}]}}
 *
 * POST home.php  (header X-Upload-Token, multipart/form-data)
 *      kind=hero|award|video   files[]=<files>   caption=<text, awards only>
 *      hero and video REPLACE the current one; awards are added.
 *
 * POST home.php  action=caption  id=<id>  caption=<text>
 * POST home.php  action=delete   id=<id>
 */
require __DIR__ . '/config.php';

const VIDEO_MAX_MB = 200; // must stay below upload_max_filesize in php.ini
const IMAGE_TYPES  = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp', 'image/gif' => 'gif'];
const VIDEO_TYPES  = ['video/mp4' => 'mp4', 'video/webm' => 'webm'];
const FOLDERS      = ['hero' => 'home/hero', 'award' => 'home/awards', 'video' => 'home/video'];

$pdo    = db();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

function clean_name(string $name): string {
    $base = strtolower(pathinfo($name, PATHINFO_FILENAME));
    $base = trim(preg_replace('/[^a-z0-9]+/', '-', $base), '-');
    return substr($base !== '' ? $base : 'file', 0, 60);
}

/** Delete one home_media row and its file (only if the file lives inside uploads/). */
function remove_item(PDO $pdo, array $row, string $root): void {
    $pdo->prepare('DELETE FROM home_media WHERE id = ?')->execute([$row['id']]);
    $path = realpath($root . '/' . $row['filename']);
    if ($path !== false && strpos($path, $root . DIRECTORY_SEPARATOR) === 0 && is_file($path)) {
        unlink($path);
    }
}

// ---------- Read ----------
if ($method === 'GET') {
    try {
        $rows = $pdo->query('SELECT id, kind, filename, caption FROM home_media ORDER BY sort_order, id')->fetchAll();
    } catch (PDOException $e) {
        error_log($e->getMessage());
        respond(['error' => 'The home_media table is missing. Run the home_media SQL in phpMyAdmin.'], 500);
    }
    $out = ['hero' => null, 'video' => null, 'awards' => [], 'items' => []];
    foreach ($rows as $r) {
        $url  = image_url($r['filename']);
        $item = ['id' => (int)$r['id'], 'kind' => $r['kind'], 'url' => $url, 'caption' => $r['caption']];
        $out['items'][] = $item;
        if ($r['kind'] === 'hero')       $out['hero']  = $url;
        elseif ($r['kind'] === 'video')  $out['video'] = $url;
        else                             $out['awards'][] = ['id' => $item['id'], 'url' => $url, 'caption' => $item['caption']];
    }
    respond(['data' => $out]);
}

if ($method !== 'POST') respond(['error' => 'Method not allowed'], 405);

// ---------- Auth ----------
if (UPLOAD_TOKEN === '') respond(['error' => 'UPLOAD_TOKEN is not set in backend/.env'], 500);
$token = $_SERVER['HTTP_X_UPLOAD_TOKEN'] ?? '';
if (!hash_equals(UPLOAD_TOKEN, $token)) respond(['error' => 'Invalid upload token'], 401);

if (empty($_POST) && empty($_FILES) && (int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 0) {
    respond(['error' => 'Upload too large for the server (php.ini post_max_size). Try a smaller file.'], 413);
}

$root = realpath(UPLOAD_DIR);
if ($root === false) respond(['error' => 'uploads folder is missing'], 500);

$action = $_POST['action'] ?? 'upload';
$find   = $pdo->prepare('SELECT id, kind, filename FROM home_media WHERE id = ?');

// ---------- Caption ----------
if ($action === 'caption') {
    $find->execute([(int)($_POST['id'] ?? 0)]);
    $row = $find->fetch();
    if (!$row) respond(['error' => 'Item not found'], 404);
    $caption = mb_substr(trim((string)($_POST['caption'] ?? '')), 0, 255);
    $pdo->prepare('UPDATE home_media SET caption = ? WHERE id = ?')->execute([$caption === '' ? null : $caption, $row['id']]);
    respond(['data' => ['id' => (int)$row['id'], 'caption' => $caption]]);
}

// ---------- Delete ----------
if ($action === 'delete') {
    $find->execute([(int)($_POST['id'] ?? 0)]);
    $row = $find->fetch();
    if (!$row) respond(['error' => 'Item not found'], 404);
    remove_item($pdo, $row, $root);
    respond(['data' => ['deleted' => (int)$row['id']]]);
}

// ---------- Upload ----------
$kind = $_POST['kind'] ?? '';
if (!isset(FOLDERS[$kind])) respond(['error' => 'kind must be hero, award or video'], 400);
if (empty($_FILES['files'])) respond(['error' => 'No files received'], 400);

$isVideo = $kind === 'video';
$types   = $isVideo ? VIDEO_TYPES : IMAGE_TYPES;
$maxMb   = $isVideo ? VIDEO_MAX_MB : UPLOAD_MAX_MB;

$f     = $_FILES['files'];
$names = (array)$f['name'];
$tmps  = (array)$f['tmp_name'];
$errs  = (array)$f['error'];
$sizes = (array)$f['size'];
if ($kind !== 'award') $names = array_slice($names, 0, 1); // hero and video: one file

$relDir = FOLDERS[$kind];
$absDir = $root . '/' . $relDir;
if (!is_dir($absDir) && !mkdir($absDir, 0755, true)) respond(['error' => 'Could not create folder'], 500);

$caption = mb_substr(trim((string)($_POST['caption'] ?? '')), 0, 255);
$caption = ($kind === 'award' && $caption !== '') ? $caption : null;

$order = (int)$pdo->query('SELECT COALESCE(MAX(sort_order), 0) FROM home_media')->fetchColumn();

$finfo    = new finfo(FILEINFO_MIME_TYPE);
$uploaded = [];
$errors   = [];
$newIds   = [];

foreach ($names as $i => $original) {
    if ($errs[$i] !== UPLOAD_ERR_OK) { $errors[] = "$original: upload error code {$errs[$i]}"; continue; }
    if ($sizes[$i] > $maxMb * 1024 * 1024) { $errors[] = "$original: larger than $maxMb MB"; continue; }
    if (!is_uploaded_file($tmps[$i])) { $errors[] = "$original: not an uploaded file"; continue; }

    // Trust the real file contents, never the client's name or type
    $mime = $finfo->file($tmps[$i]);
    if (!isset($types[$mime]) || (!$isVideo && @getimagesize($tmps[$i]) === false)) {
        $errors[] = "$original: " . ($isVideo ? 'not an MP4 or WEBM video' : 'not a JPG, PNG, WEBP or GIF image');
        continue;
    }

    $final = clean_name($original) . '-' . bin2hex(random_bytes(3)) . '.' . $types[$mime];
    if (!move_uploaded_file($tmps[$i], "$absDir/$final")) { $errors[] = "$original: could not save"; continue; }
    $rel = "$relDir/$final";

    try {
        $pdo->prepare('INSERT INTO home_media (kind, filename, caption, sort_order) VALUES (?, ?, ?, ?)')
            ->execute([$kind, $rel, $caption, ++$order]);
        $id = (int)$pdo->lastInsertId();
        $newIds[]   = $id;
        $uploaded[] = ['id' => $id, 'url' => image_url($rel)];
    } catch (PDOException $e) {
        error_log($e->getMessage());
        unlink("$absDir/$final");
        $errors[] = "$original: database error";
    }
}

// Hero and video replace the old one
if ($kind !== 'award' && $newIds) {
    $old = $pdo->prepare('SELECT id, kind, filename FROM home_media WHERE kind = ? AND id <> ?');
    $old->execute([$kind, $newIds[0]]);
    foreach ($old->fetchAll() as $row) remove_item($pdo, $row, $root);
}

respond(['data' => ['uploaded' => $uploaded, 'errors' => $errors]], $uploaded ? 200 : 400);