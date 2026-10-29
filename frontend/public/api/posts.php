<?php
/**
 * GET /api/posts.php
 *   ?slug=some-slug                -> one post (full body, gallery, related)
 *   ?page=1&per_page=10            -> paginated list (no body)
 *   &category=events               -> filter by category slug
 *   &q=lani                        -> search title / excerpt / body
 *   &archive=2026-09               -> filter by published month (YYYY-MM)
 */
require __DIR__ . '/config.php';

$pdo = db();

if (!empty($_GET['slug']) && is_string($_GET['slug'])) {
    $stmt = $pdo->prepare('SELECT * FROM posts WHERE slug = ? LIMIT 1');
    $stmt->execute([$_GET['slug']]);
    $row = $stmt->fetch();
    if (!$row) respond(['error' => 'Post not found'], 404);

    $cats = categories_for([$row['id']]);
    $post = shape_post($row, $cats, true);

    $g = $pdo->prepare('SELECT filename FROM post_images WHERE post_id = ? ORDER BY sort_order, id');
    $g->execute([$row['id']]);
    $post['gallery'] = array_map(fn($r) => image_url($r['filename']), $g->fetchAll());

    $prev = $pdo->prepare(
        'SELECT slug, title FROM posts
          WHERE sort_order > ? OR (sort_order = ? AND id > ?)
          ORDER BY sort_order ASC, id ASC LIMIT 1'
    );
    $prev->execute([$row['sort_order'], $row['sort_order'], $row['id']]);
    $post['previous'] = $prev->fetch() ?: null;

    $nextStmt = $pdo->prepare(
        'SELECT slug, title FROM posts
          WHERE sort_order < ? OR (sort_order = ? AND id < ?)
          ORDER BY sort_order DESC, id DESC LIMIT 1'
    );
    $nextStmt->execute([$row['sort_order'], $row['sort_order'], $row['id']]);
    $post['next'] = $nextStmt->fetch() ?: null;

    $rel = $pdo->prepare(
        'SELECT DISTINCT p.*
           FROM posts p
           JOIN post_categories pc ON pc.post_id = p.id
          WHERE pc.category_id IN (SELECT category_id FROM post_categories WHERE post_id = ?)
            AND p.id <> ?
          ORDER BY p.sort_order, p.id
          LIMIT 3'
    );
    $rel->execute([$row['id'], $row['id']]);
    $relRows = $rel->fetchAll();
    $relCats = categories_for(array_column($relRows, 'id'));
    $post['related'] = array_map(fn($r) => shape_post($r, $relCats), $relRows);

    respond(['data' => $post]);
}

$page    = max(1, (int)($_GET['page'] ?? 1));
$perPage = min(50, max(1, (int)($_GET['per_page'] ?? 10)));
$offset  = ($page - 1) * $perPage;

$where  = [];
$params = [];

if (!empty($_GET['category']) && is_string($_GET['category'])) {
    $where[]  = 'p.id IN (SELECT pc.post_id FROM post_categories pc
                           JOIN categories c ON c.id = pc.category_id
                          WHERE c.slug = ?)';
    $params[] = $_GET['category'];
}
if (!empty($_GET['q']) && is_string($_GET['q'])) {
    $like = '%' . str_replace(['%', '_'], ['\%', '\_'], $_GET['q']) . '%';
    $where[]  = '(p.title LIKE ? OR p.excerpt LIKE ? OR p.body LIKE ?)';
    array_push($params, $like, $like, $like);
}
if (!empty($_GET['archive']) && is_string($_GET['archive']) && preg_match('/^\d{4}-\d{2}$/', $_GET['archive'])) {
    $where[]  = "DATE_FORMAT(p.published_at, '%Y-%m') = ?";
    $params[] = $_GET['archive'];
}
$whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';

$count = $pdo->prepare("SELECT COUNT(*) FROM posts p $whereSql");
$count->execute($params);
$total = (int)$count->fetchColumn();

$stmt = $pdo->prepare("SELECT p.* FROM posts p $whereSql ORDER BY p.sort_order, p.id LIMIT $perPage OFFSET $offset");
$stmt->execute($params);
$rows = $stmt->fetchAll();

$cats = categories_for(array_column($rows, 'id'));

respond([
    'data' => array_map(fn($r) => shape_post($r, $cats), $rows),
    'meta' => [
        'page'        => $page,
        'per_page'    => $perPage,
        'total'       => $total,
        'total_pages' => (int)ceil($total / $perPage),
    ],
]);