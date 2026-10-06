<?php
/**
 * GET /api/categories.php            -> [{id, name, slug, count}]
 * GET /api/categories.php?archives=1 -> months that have dated posts
 */
require __DIR__ . '/config.php';
$pdo = db();

if (!empty($_GET['archives'])) {
    $rows = $pdo->query(
        "SELECT DATE_FORMAT(published_at, '%Y-%m') AS value,
                DATE_FORMAT(published_at, '%M %Y') AS label
           FROM posts
          WHERE published_at IS NOT NULL
          GROUP BY value, label
          ORDER BY value DESC"
    )->fetchAll();
    respond(['data' => $rows]);
}

$rows = $pdo->query(
    'SELECT c.id, c.name, c.slug, COUNT(pc.post_id) AS count
       FROM categories c
       LEFT JOIN post_categories pc ON pc.category_id = c.id
      GROUP BY c.id, c.name, c.slug
      ORDER BY c.id'
)->fetchAll();
foreach ($rows as &$r) { $r['id'] = (int)$r['id']; $r['count'] = (int)$r['count']; }
respond(['data' => $rows]);