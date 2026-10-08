<?php
require __DIR__ . '/config.php';
$pdo = db();   // config.php gives the connection through db()

header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors', '0');
set_exception_handler(function (Throwable $e) {
  http_response_code(500);
  echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
});

function out($data, int $code = 200) { http_response_code($code); echo json_encode($data); exit; }
function fail($msg, int $code = 400) { out(['error' => $msg], $code); }

// Stored as "uploads/people/x.jpg"; image_url() adds /uploads/ itself
$urlOf = fn($p) => $p ? image_url(preg_replace('#^uploads/#', '', $p)) : null;

// ---------- READ (public) ----------
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
  header('Cache-Control: no-store');
  $people = $pdo->query(
    "SELECT id, section AS kind, title AS name, subtitle AS role, show_name, schedule, photo
       FROM about_tbl
      WHERE section IN ('dj','anchor') AND is_active = 1
      ORDER BY sort_order, id"
  )->fetchAll(PDO::FETCH_ASSOC);
  foreach ($people as &$p) { $p['photo_url'] = $urlOf($p['photo']); }
  unset($p);

  $milestones = $pdo->query(
    "SELECT id, year, title, description
       FROM about_tbl
      WHERE section = 'milestone' AND is_active = 1
      ORDER BY year, sort_order, id"
  )->fetchAll(PDO::FETCH_ASSOC);

  $programs = $pdo->query(
    "SELECT id, REPLACE(section,'_program','') AS category, title AS name
       FROM about_tbl
      WHERE section IN ('news_program','entertainment_program') AND is_active = 1
      ORDER BY sort_order, id"
  )->fetchAll(PDO::FETCH_ASSOC);

  $b = $pdo->query("SELECT id, title AS caption, photo FROM about_tbl
                     WHERE section='about_banner' AND is_active=1 ORDER BY id DESC LIMIT 1")->fetch(PDO::FETCH_ASSOC);
  $banner = $b ? $b + ['photo_url' => $urlOf($b['photo'])] : null;

  out(['data' => compact('people', 'milestones', 'programs', 'banner')]);
}

// ---------- WRITE (password) ----------
$expected = UPLOAD_TOKEN;   // from .env, defined in config.php
$given    = trim($_SERVER['HTTP_X_UPLOAD_TOKEN'] ?? '');
if (!$expected || !hash_equals($expected, $given)) fail('Wrong upload password.', 401);

$action = $_POST['action'] ?? '';
$s = fn($k, $max = 160) => ($v = trim($_POST[$k] ?? '')) === '' ? null : mb_substr($v, 0, $max);

function next_order(PDO $pdo, string $section): int {
  $q = $pdo->prepare("SELECT COALESCE(MAX(sort_order),0)+1 FROM about_tbl WHERE section=?");
  $q->execute([$section]);
  return (int)$q->fetchColumn();
}

function save_photo(): ?string {
  if (empty($_FILES['photo']) || $_FILES['photo']['error'] === UPLOAD_ERR_NO_FILE) return null;
  $f = $_FILES['photo'];
  if ($f['error'] !== UPLOAD_ERR_OK || $f['size'] > 8 * 1024 * 1024) fail('Photo failed or is over 8 MB.');
  $ext = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'][mime_content_type($f['tmp_name'])] ?? null;
  if (!$ext) fail('Photo must be JPG, PNG or WEBP.');
  $dir = dirname(__DIR__) . '/uploads/people';
  if (!is_dir($dir)) mkdir($dir, 0755, true);
  $name = bin2hex(random_bytes(8)) . ".$ext";
  if (!move_uploaded_file($f['tmp_name'], "$dir/$name")) {
    fail('Could not save the photo. Check that uploads/people exists and is writable.', 500);
  }
  return "uploads/people/$name";
}

function drop_photo(PDO $pdo, int $id) {
  $q = $pdo->prepare("SELECT photo FROM about_tbl WHERE id=? AND section IN ('dj','anchor')");
  $q->execute([$id]);
  if ($old = $q->fetchColumn()) @unlink(dirname(__DIR__) . "/$old");
}

switch ($action) {
  case 'add_person':
    $kind = $_POST['kind'] ?? '';
    if (!in_array($kind, ['dj', 'anchor'], true) || !$s('name', 120)) fail('Kind and name are required.');
    $pdo->prepare("INSERT INTO about_tbl (section,title,subtitle,show_name,schedule,photo,sort_order)
                   VALUES (?,?,?,?,?,?,?)")
        ->execute([$kind, $s('name', 120), $s('role'), $s('show_name'), $s('schedule'), save_photo(), next_order($pdo, $kind)]);
    break;

  case 'update_person':
    $id = (int)($_POST['id'] ?? 0);
    if (!$s('name', 120)) fail('Name is required.');
    $photo = save_photo();
    if ($photo) drop_photo($pdo, $id);
    $pdo->prepare("UPDATE about_tbl SET title=?, subtitle=?, show_name=?, schedule=?, photo=COALESCE(?, photo)
                   WHERE id=? AND section IN ('dj','anchor')")
        ->execute([$s('name', 120), $s('role'), $s('show_name'), $s('schedule'), $photo, $id]);
    break;

  case 'delete_person':
    $id = (int)($_POST['id'] ?? 0);
    drop_photo($pdo, $id);
    $pdo->prepare("DELETE FROM about_tbl WHERE id=? AND section IN ('dj','anchor')")->execute([$id]);
    break;

  case 'add_milestone':
    $year = (int)($_POST['year'] ?? 0);
    if ($year < 1900 || $year > 2100 || !$s('title')) fail('Year and title are required.');
    $pdo->prepare("INSERT INTO about_tbl (section,year,title,description,sort_order) VALUES ('milestone',?,?,?,?)")
        ->execute([$year, $s('title'), $s('description', 500), next_order($pdo, 'milestone')]);
    break;

  case 'delete_milestone':
    $pdo->prepare("DELETE FROM about_tbl WHERE id=? AND section='milestone'")->execute([(int)($_POST['id'] ?? 0)]);
    break;

  case 'add_program':
    $cat = $_POST['category'] ?? '';
    if (!in_array($cat, ['news', 'entertainment'], true) || !$s('name', 120)) fail('Category and name are required.');
    $section = $cat . '_program';
    $pdo->prepare("INSERT INTO about_tbl (section,title,sort_order) VALUES (?,?,?)")
        ->execute([$section, $s('name', 120), next_order($pdo, $section)]);
    break;

  case 'delete_program':
    $pdo->prepare("DELETE FROM about_tbl WHERE id=? AND section IN ('news_program','entertainment_program')")
        ->execute([(int)($_POST['id'] ?? 0)]);
    break;

  case 'set_banner':
    $photo = save_photo();
    if (!$photo) fail('Choose a photo.');
    foreach ($pdo->query("SELECT photo FROM about_tbl WHERE section='about_banner'")->fetchAll(PDO::FETCH_COLUMN) as $old) {
      if ($old) @unlink(dirname(__DIR__) . "/$old");
    }
    $pdo->exec("DELETE FROM about_tbl WHERE section='about_banner'");
    $pdo->prepare("INSERT INTO about_tbl (section,title,photo) VALUES ('about_banner',?,?)")
        ->execute([$s('caption', 160) ?? 'About banner', $photo]);
    break;

  case 'delete_banner':
    foreach ($pdo->query("SELECT photo FROM about_tbl WHERE section='about_banner'")->fetchAll(PDO::FETCH_COLUMN) as $old) {
      if ($old) @unlink(dirname(__DIR__) . "/$old");
    }
    $pdo->exec("DELETE FROM about_tbl WHERE section='about_banner'");
    break;

  case 'reorder_people':
    $kind = $_POST['kind'] ?? '';
    if (!in_array($kind, ['dj', 'anchor'], true)) fail('Bad type.');
    $ids = array_values(array_filter(array_map('intval', explode(',', $_POST['ids'] ?? ''))));
    if (!$ids) fail('Nothing to reorder.');
    $pdo->beginTransaction();
    $st = $pdo->prepare("UPDATE about_tbl SET sort_order=? WHERE id=? AND section=?");
    foreach ($ids as $i => $id) $st->execute([$i + 1, $id, $kind]);
    $pdo->commit();
    break;

  default: fail('Unknown action.');
}
out(['data' => ['ok' => true]]);