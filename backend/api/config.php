<?php
/**
 * Shared config + helpers for the RW 95.1 FM API.
 */

// ---- Database (XAMPP defaults) ----
const DB_HOST = '127.0.0.1';
const DB_NAME = 'db_rw';
const DB_USER = 'root';
const DB_PASS = '';

// URL path where the backend folder lives under htdocs   <-- CHANGED
const BASE_PATH = '/RW_LAUS/backend';

// ---- CORS (Vite dev server). Tighten for production. ----
$allowedOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowedOrigins, true)) {
    header("Access-Control-Allow-Origin: $origin");
    header('Vary: Origin');
}
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Content-Type: application/json; charset=utf-8');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function respond($payload, int $status = 200): void {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function db(): PDO {
    static $pdo = null;
    if ($pdo) return $pdo;
    try {
        $pdo = new PDO(
            'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
            DB_USER,
            DB_PASS,
            [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]
        );
    } catch (PDOException $e) {
        error_log($e->getMessage());
        respond(['error' => 'Database connection failed'], 500);
    }
    return $pdo;
}

/** Turn a stored filename like "page1/hero.png" into a full URL. */
function image_url(?string $filename): ?string {
    if (!$filename) return null;
    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host   = $_SERVER['HTTP_HOST'] ?? 'localhost';
    $path   = implode('/', array_map('rawurlencode', explode('/', $filename)));
    return "$scheme://$host" . BASE_PATH . '/uploads/' . $path;
}

/** Fetch category names for a set of post ids: [post_id => ['Events','News']] */
function categories_for(array $postIds): array {
    if (!$postIds) return [];
    $in = implode(',', array_fill(0, count($postIds), '?'));
    $stmt = db()->prepare(
        "SELECT pc.post_id, c.name
           FROM post_categories pc
           JOIN categories c ON c.id = pc.category_id
          WHERE pc.post_id IN ($in)
          ORDER BY c.id"
    );
    $stmt->execute(array_values($postIds));
    $map = [];
    foreach ($stmt->fetchAll() as $r) $map[$r['post_id']][] = $r['name'];
    return $map;
}

/** Shape a DB row like an entry in posts.js */
function shape_post(array $row, array $cats, bool $full = false): array {
    $post = [
        'id'                  => (int)$row['id'],
        'slug'                => $row['slug'],
        'title'               => $row['title'],
        'categories'          => $cats[$row['id']] ?? [],
        'excerpt'             => $row['excerpt'],
        'date'                => $row['published_at'],
        'image'               => image_url($row['featured_image']),
        'galleryCount'        => (int)$row['gallery_count'],
        'galleryColumns'      => $row['gallery_columns'] !== null ? (int)$row['gallery_columns'] : null,
        'byline'              => null,
        'bylineLines'         => null,
        'bylineItalic'        => (bool)$row['byline_italic'],
        'showTitleAboveByline'=> (bool)$row['show_title_above_byline'],
        'aboutWriter'         => $row['about_writer'],
    ];

    // Multi-line bylines are stored with "\n" between lines.
    if ($row['byline'] !== null && strpos($row['byline'], "\n") !== false) {
        $post['bylineLines'] = explode("\n", $row['byline']);
    } else {
        $post['byline'] = $row['byline'];
    }

    if ($full) {
        $post['body'] = json_decode($row['body'], true) ?: [];
    }
    return $post;
}