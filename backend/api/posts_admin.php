<?php
/**
 * POST /api/posts_admin.php   (JSON body, header X-Upload-Token = admin login token)
 *
 *   {"action":"create",
 *    "title":"...", "slug":"" (optional), "excerpt":"...", "body":"para 1\n\npara 2",
 *    "month":"2026-10" (optional), "byline":"" , "about_writer":"",
 *    "categories":[1,3]}
 *
 * Creates the post and returns its slug. Upload the featured image and
 * gallery afterwards with upload.php (the admin page does this for you).
 *
 *   {"action":"delete", "id":12}
 *
 * Deletes the post, its category links, gallery rows, comments and the
 * image files that no other post uses.
 */
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/auth.php';   // gives us require_admin()

set_exception_handler(function (Throwable $e) {
    error_log($e);
    respond(['error' => 'Server error. Check the Apache error log for details.'], 500);
});

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') respond(['error' => 'Method not allowed'], 405);
require_admin();

// Adjust these if your posts table uses shorter columns (run: DESCRIBE posts;)
const MAX_TITLE   = 255;
const MAX_EXCERPT = 1000;
const MAX_BODY    = 60000;

// Slugs that would clash with your site's own pages (/:slug is a top-level route)
const RESERVED_SLUGS = ['admin', 'category', 'archive', 'about', 'programs', 'gallery', 'contact', 'events', 'news', 'home', 'search'];

function slugify(string $s): string {
    if (function_exists('iconv')) {
        $t = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $s);
        if ($t !== false && $t !== '') $s = $t;
    }
    $s = strtolower($s);
    $s = preg_replace('/[^a-z0-9]+/', '-', $s);
    $s = trim((string)$s, '-');
    return substr($s, 0, 120);
}

$in = json_decode(file_get_contents('php://input'), true);
if (!is_array($in)) respond(['error' => 'Invalid request'], 400);
$action = $in['action'] ?? '';
if (!in_array($action, ['create', 'delete'], true)) respond(['error' => 'Unknown action'], 400);

/** Delete one uploaded file, but only inside uploads/featured or uploads/gallery. */
function remove_upload_file(string $filename): void {
    $root = realpath(UPLOAD_DIR);
    if ($root === false || $filename === '') return;
    $rel = ltrim(str_replace('\\', '/', $filename), '/');
    if (strpos($rel, '..') !== false) return;
    if (strpos($rel, 'featured/') !== 0 && strpos($rel, 'gallery/') !== 0) return; // never touch other folders
    $path = realpath($root . DIRECTORY_SEPARATOR . $rel);
    if ($path === false || strpos($path, $root . DIRECTORY_SEPARATOR) !== 0 || !is_file($path)) return;
    @unlink($path);
    // remove the post's gallery folder if it is now empty
    $dir = dirname($path);
    if ($dir !== $root && basename(dirname($dir)) === 'gallery') @rmdir($dir);
}

// ---------- delete ----------
if ($action === 'delete') {
    $id = (int)($in['id'] ?? 0);
    if ($id < 1) respond(['error' => 'Post id required'], 400);

    $pdo = db();
    $st = $pdo->prepare('SELECT id, featured_image FROM posts WHERE id = ?');
    $st->execute([$id]);
    $post = $st->fetch();
    if (!$post) respond(['error' => 'Post not found'], 404);

    // Files to remove (only those no other post uses)
    $files = [];
    $gi = $pdo->prepare('SELECT filename FROM post_images WHERE post_id = ?');
    $gi->execute([$id]);
    foreach ($gi->fetchAll() as $r) $files[] = (string)$r['filename'];
    if (!empty($post['featured_image'])) $files[] = (string)$post['featured_image'];

    $usedElsewhere = function (string $f) use ($pdo, $id): bool {
        $a = $pdo->prepare('SELECT 1 FROM posts WHERE featured_image = ? AND id <> ? LIMIT 1');
        $a->execute([$f, $id]);
        if ($a->fetchColumn()) return true;
        $b = $pdo->prepare('SELECT 1 FROM post_images WHERE filename = ? AND post_id <> ? LIMIT 1');
        $b->execute([$f, $id]);
        return (bool)$b->fetchColumn();
    };
    $files = array_values(array_filter(array_unique($files), fn($f) => !$usedElsewhere($f)));

    $pdo->beginTransaction();
    try {
        $pdo->prepare('DELETE FROM post_images WHERE post_id = ?')->execute([$id]);
        $pdo->prepare('DELETE FROM post_categories WHERE post_id = ?')->execute([$id]);
        $pdo->prepare('DELETE FROM comments_tbl WHERE post_id = ?')->execute([$id]);
        $pdo->prepare('DELETE FROM posts WHERE id = ?')->execute([$id]);
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $e;
    }

    // Database is done; now remove the files (a failure here never undoes the delete)
    foreach ($files as $f) remove_upload_file($f);

    respond(['data' => ['deleted' => $id]]);
}

// ---------- create ----------

// ---------- read + validate ----------
$title   = trim((string)($in['title'] ?? ''));
$excerpt = trim((string)($in['excerpt'] ?? ''));
$bodyRaw = str_replace("\r\n", "\n", trim((string)($in['body'] ?? '')));
$month   = trim((string)($in['month'] ?? ''));
$byline  = trim((string)($in['byline'] ?? ''));
$about   = trim((string)($in['about_writer'] ?? ''));

if ($title === '')   respond(['error' => 'Please enter a title.'], 400);
if ($excerpt === '') respond(['error' => 'Please enter a short excerpt.'], 400);
if (mb_strlen($title) > MAX_TITLE)     respond(['error' => 'The title is too long.'], 400);
if (mb_strlen($excerpt) > MAX_EXCERPT) respond(['error' => 'The excerpt is too long.'], 400);
if (mb_strlen($bodyRaw) > MAX_BODY)    respond(['error' => 'The body is too long.'], 400);

$publishedAt = null;
if ($month !== '') {
    if (!preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $month)) respond(['error' => 'Month must look like 2026-10.'], 400);
    $publishedAt = $month . '-01';
}

// Body is stored as a JSON list of paragraphs (split on blank lines)
$paragraphs = [];
if ($bodyRaw !== '') {
    foreach (preg_split('/\n\s*\n/', $bodyRaw) as $p) {
        $p = trim($p);
        if ($p !== '') $paragraphs[] = $p;
    }
}
if (!$paragraphs) $paragraphs = [$excerpt];
$bodyJson = json_encode($paragraphs, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

$catIds = [];
if (isset($in['categories']) && is_array($in['categories'])) {
    foreach ($in['categories'] as $c) if ((int)$c > 0) $catIds[(int)$c] = true;
    $catIds = array_keys($catIds);
}

$pdo = db();

if ($catIds) {
    $ph  = implode(',', array_fill(0, count($catIds), '?'));
    $chk = $pdo->prepare("SELECT COUNT(*) FROM categories WHERE id IN ($ph)");
    $chk->execute($catIds);
    if ((int)$chk->fetchColumn() !== count($catIds)) respond(['error' => 'One of the categories does not exist.'], 400);
}

// ---------- slug ----------
$slug = slugify(trim((string)($in['slug'] ?? '')) !== '' ? (string)$in['slug'] : $title);
if ($slug === '') $slug = 'post';

$exists = $pdo->prepare('SELECT 1 FROM posts WHERE slug = ? LIMIT 1');
$base = $slug;
$n = 2;
while (in_array($slug, RESERVED_SLUGS, true) || (function () use ($exists, $slug) { $exists->execute([$slug]); return (bool)$exists->fetchColumn(); })()) {
    $slug = $base . '-' . $n++;
}

// ---------- save ----------
$pdo->beginTransaction();
try {
    // New posts go to the top of the list (lowest sort_order is shown first)
    $pdo->exec('UPDATE posts SET sort_order = sort_order + 1');

    $ins = $pdo->prepare(
        'INSERT INTO posts
            (slug, title, excerpt, body, published_at, featured_image,
             gallery_count, gallery_columns, byline, byline_italic,
             show_title_above_byline, about_writer, sort_order)
         VALUES (?, ?, ?, ?, ?, NULL, 0, NULL, ?, 0, 0, ?, 0)'
    );
    $ins->execute([
        $slug, $title, $excerpt, $bodyJson, $publishedAt,
        $byline !== '' ? $byline : null,
        $about  !== '' ? $about  : null,
    ]);
    $postId = (int)$pdo->lastInsertId();

    if ($catIds) {
        $pc = $pdo->prepare('INSERT INTO post_categories (post_id, category_id) VALUES (?, ?)');
        foreach ($catIds as $cid) $pc->execute([$postId, $cid]);
    }

    $pdo->commit();
} catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    throw $e;
}

respond(['data' => ['id' => $postId, 'slug' => $slug]], 201);