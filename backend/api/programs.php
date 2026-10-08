<?php
/**
 * Programs page, all in ONE table: programs_tbl
 *
 *   kind = 'card'    one row per category card on the Programs page.
 *                    title = card title, image = card background, category = slug.
 *   kind = 'program' one row per program inside a category
 *                    (title, host, schedule, description, image, audio).
 *
 * GET  programs.php                 -> {data: {categories: [...]}}
 * GET  programs.php?category=slug   -> same, only that category
 *
 *   category = {id, slug, title, background: url|null,
 *               programs: [{id, title, host, schedule, description, image, audio}]}
 *
 * POST programs.php  (header X-Upload-Token, multipart/form-data)
 *   action=set_background     category=<slug>  photo=<file>
 *   action=delete_background  category=<slug>
 *   action=add_program        category=<slug>  title host schedule description  image=<file>  audio=<file>
 *   action=update_program     id  title host schedule description  image=<file>  audio=<file>
 *                             remove_image=1  remove_audio=1
 *   action=delete_program     id
 *   action=reorder            ids=<comma separated program ids, in the new order>
 */
require __DIR__ . '/config.php';

const IMAGE_TYPES  = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp', 'image/gif' => 'gif'];
const AUDIO_TYPES  = [
    'audio/mpeg'  => 'mp3',
    'audio/mp4'   => 'm4a',
    'audio/x-m4a' => 'm4a',
    'audio/ogg'   => 'ogg',
    'audio/wav'   => 'wav',
    'audio/x-wav' => 'wav',
];
const AUDIO_MAX_MB = 25; // must stay below upload_max_filesize in php.ini

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

function text_field(string $key, int $max): ?string {
    $v = mb_substr(trim((string)($_POST[$key] ?? '')), 0, $max);
    return $v === '' ? null : $v;
}

/**
 * Save one uploaded file from $_FILES[$field].
 * Returns [relative path or null, error message or null].
 * [null, null] means no file was chosen.
 */
function save_upload(string $field, array $types, int $maxMb, string $relDir, string $root, bool $isImage): array {
    if (empty($_FILES[$field]) || $_FILES[$field]['error'] === UPLOAD_ERR_NO_FILE) return [null, null];

    $f    = $_FILES[$field];
    $name = (string)$f['name'];
    if ($f['error'] !== UPLOAD_ERR_OK)          return [null, "$name: upload error code {$f['error']}"];
    if ($f['size'] > $maxMb * 1024 * 1024)      return [null, "$name: larger than $maxMb MB"];
    if (!is_uploaded_file($f['tmp_name']))      return [null, "$name: not an uploaded file"];

    // Trust the real file contents, never the client's name or type
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($f['tmp_name']);
    if (!isset($types[$mime]) || ($isImage && @getimagesize($f['tmp_name']) === false)) {
        return [null, "$name: " . ($isImage ? 'not a JPG, PNG, WEBP or GIF image' : 'not an MP3, M4A, OGG or WAV audio file')];
    }

    $absDir = $root . '/' . $relDir;
    if (!is_dir($absDir) && !mkdir($absDir, 0755, true)) return [null, 'Could not create folder'];

    $final = clean_name($name) . '-' . bin2hex(random_bytes(3)) . '.' . $types[$mime];
    if (!move_uploaded_file($f['tmp_name'], "$absDir/$final")) return [null, "$name: could not save"];

    return ["$relDir/$final", null];
}

// ---------- Read ----------
if ($method === 'GET') {
    try {
        $rows = $pdo->query(
            'SELECT id, kind, category, title, host, schedule, description, image, audio
               FROM programs_tbl ORDER BY sort_order, id'
        )->fetchAll();
    } catch (PDOException $e) {
        error_log($e->getMessage());
        respond(['error' => 'The programs_tbl table is missing or out of date. Run the programs SQL in phpMyAdmin.'], 500);
    }

    $cards = [];
    $byCat = [];
    foreach ($rows as $r) {
        if ($r['kind'] === 'card') { $cards[] = $r; continue; }
        $byCat[$r['category']][] = [
            'id'          => (int)$r['id'],
            'title'       => $r['title'],
            'host'        => $r['host'],
            'schedule'    => $r['schedule'],
            'description' => $r['description'],
            'image'       => image_url($r['image']),
            'audio'       => image_url($r['audio']),
        ];
    }

    $want = $_GET['category'] ?? '';
    $out  = [];
    foreach ($cards as $c) {
        if ($want !== '' && $c['category'] !== $want) continue;
        $out[] = [
            'id'         => (int)$c['id'],
            'slug'       => $c['category'],
            'title'      => $c['title'],
            'background' => image_url($c['image']),
            'programs'   => $byCat[$c['category']] ?? [],
        ];
    }
    if ($want !== '' && !$out) respond(['error' => 'Category not found'], 404);
    respond(['data' => ['categories' => $out]]);
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

$action = $_POST['action'] ?? '';

/** The 'card' row of a category (holds the card title and background). */
function find_category(PDO $pdo): array {
    $stmt = $pdo->prepare("SELECT id, category, image FROM programs_tbl WHERE kind = 'card' AND category = ?");
    $stmt->execute([(string)($_POST['category'] ?? '')]);
    $row = $stmt->fetch();
    if (!$row) respond(['error' => 'Category not found'], 404);
    return $row;
}

/** A 'program' row. Card rows can never be matched here. */
function find_program(PDO $pdo): array {
    $stmt = $pdo->prepare("SELECT id, category, image, audio FROM programs_tbl WHERE kind = 'program' AND id = ?");
    $stmt->execute([(int)($_POST['id'] ?? 0)]);
    $row = $stmt->fetch();
    if (!$row) respond(['error' => 'Program not found'], 404);
    return $row;
}

// ---------- Card background ----------
if ($action === 'set_background') {
    $cat = find_category($pdo);
    [$rel, $err] = save_upload('photo', IMAGE_TYPES, UPLOAD_MAX_MB, 'programs/backgrounds', $root, true);
    if ($err)  respond(['error' => $err], 400);
    if (!$rel) respond(['error' => 'Choose a photo first'], 400);
    $pdo->prepare('UPDATE programs_tbl SET image = ? WHERE id = ?')->execute([$rel, $cat['id']]);
    remove_file($root, $cat['image']);
    respond(['data' => ['slug' => $cat['category'], 'background' => image_url($rel)]]);
}

if ($action === 'delete_background') {
    $cat = find_category($pdo);
    $pdo->prepare('UPDATE programs_tbl SET image = NULL WHERE id = ?')->execute([$cat['id']]);
    remove_file($root, $cat['image']);
    respond(['data' => ['slug' => $cat['category']]]);
}

// ---------- Add a program ----------
if ($action === 'add_program') {
    $cat   = find_category($pdo);
    $title = text_field('title', 160);
    if ($title === null) respond(['error' => 'Program title is required'], 400);

    [$img, $imgErr] = save_upload('image', IMAGE_TYPES, UPLOAD_MAX_MB, 'programs/images', $root, true);
    [$aud, $audErr] = save_upload('audio', AUDIO_TYPES, AUDIO_MAX_MB, 'programs/audio', $root, false);
    if ($imgErr || $audErr) {
        remove_file($root, $img);
        remove_file($root, $aud);
        respond(['error' => $imgErr ?: $audErr], 400);
    }

    $stmt = $pdo->prepare("SELECT COALESCE(MAX(sort_order), 0) FROM programs_tbl WHERE kind = 'program' AND category = ?");
    $stmt->execute([$cat['category']]);
    $order = (int)$stmt->fetchColumn() + 1;

    try {
        $pdo->prepare(
            "INSERT INTO programs_tbl (kind, category, title, host, schedule, description, image, audio, sort_order)
             VALUES ('program', ?, ?, ?, ?, ?, ?, ?, ?)"
        )->execute([
            $cat['category'], $title, text_field('host', 160), text_field('schedule', 255),
            text_field('description', 2000), $img, $aud, $order,
        ]);
    } catch (PDOException $e) {
        error_log($e->getMessage());
        remove_file($root, $img);
        remove_file($root, $aud);
        respond(['error' => 'Database error'], 500);
    }
    respond(['data' => ['id' => (int)$pdo->lastInsertId()]]);
}

// ---------- Edit a program ----------
if ($action === 'update_program') {
    $row   = find_program($pdo);
    $title = text_field('title', 160);
    if ($title === null) respond(['error' => 'Program title is required'], 400);

    [$img, $imgErr] = save_upload('image', IMAGE_TYPES, UPLOAD_MAX_MB, 'programs/images', $root, true);
    [$aud, $audErr] = save_upload('audio', AUDIO_TYPES, AUDIO_MAX_MB, 'programs/audio', $root, false);
    if ($imgErr || $audErr) {
        remove_file($root, $img);
        remove_file($root, $aud);
        respond(['error' => $imgErr ?: $audErr], 400);
    }

    $newImage = $row['image'];
    if ($img) { $newImage = $img; }
    elseif (!empty($_POST['remove_image'])) { $newImage = null; }

    $newAudio = $row['audio'];
    if ($aud) { $newAudio = $aud; }
    elseif (!empty($_POST['remove_audio'])) { $newAudio = null; }

    try {
        $pdo->prepare(
            'UPDATE programs_tbl SET title = ?, host = ?, schedule = ?, description = ?, image = ?, audio = ? WHERE id = ?'
        )->execute([
            $title, text_field('host', 160), text_field('schedule', 255),
            text_field('description', 2000), $newImage, $newAudio, $row['id'],
        ]);
    } catch (PDOException $e) {
        error_log($e->getMessage());
        remove_file($root, $img);
        remove_file($root, $aud);
        respond(['error' => 'Database error'], 500);
    }

    // Only now that the row is saved, delete the files that were replaced or removed
    if ($newImage !== $row['image']) remove_file($root, $row['image']);
    if ($newAudio !== $row['audio']) remove_file($root, $row['audio']);
    respond(['data' => ['id' => (int)$row['id']]]);
}

// ---------- Delete a program ----------
if ($action === 'delete_program') {
    $row = find_program($pdo);
    $pdo->prepare('DELETE FROM programs_tbl WHERE id = ?')->execute([$row['id']]);
    remove_file($root, $row['image']);
    remove_file($root, $row['audio']);
    respond(['data' => ['deleted' => (int)$row['id']]]);
}

// ---------- Reorder ----------
if ($action === 'reorder') {
    $ids = array_values(array_filter(array_map('intval', explode(',', (string)($_POST['ids'] ?? '')))));
    if (!$ids) respond(['error' => 'No ids received'], 400);
    $upd = $pdo->prepare("UPDATE programs_tbl SET sort_order = ? WHERE id = ? AND kind = 'program'");
    $pdo->beginTransaction();
    foreach ($ids as $i => $id) $upd->execute([$i + 1, $id]);
    $pdo->commit();
    respond(['data' => ['reordered' => count($ids)]]);
}

respond(['error' => 'Unknown action'], 400);