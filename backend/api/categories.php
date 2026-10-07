<?php
/**
 * GET /api/categories.php          -> [{id, name, slug, count}]
 * GET /api/categories.php?archives=1 -> months that have dated posts, e.g. [{value:"2026-09", label:"September 2026"}]
 */
require __DIR__ . '/config.php';
$pdo = db();

if (!empty($_GET['archives'])) {
    $months = [];

    // 1) Months saved in the `archives` table (full list from the old site)
    try {
        foreach ($pdo->query('SELECT value, label FROM archives')->fetchAll() as $r) {
            $months[$r['value']] = $r['label'];
        }
    } catch (PDOException $e) {
        // table not created yet: fall back to posts only
    }

    // 2) Months of posts that have a date (so new posts add their month automatically)
    $rows = $pdo->query(
        "SELECT DATE_FORMAT(published_at, '%Y-%m') AS value,
                DATE_FORMAT(published_at, '%M %Y') AS label
           FROM posts
          WHERE published_at IS NOT NULL
          GROUP BY value, label"
    )->fetchAll();
    foreach ($rows as $r) $months[$r['value']] = $r['label'];

    krsort($months); // newest first
    $out = [];
    foreach ($months as $value => $label) $out[] = ['value' => (string)$value, 'label' => $label];
    respond(['data' => $out]);
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