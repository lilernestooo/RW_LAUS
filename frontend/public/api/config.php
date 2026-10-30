<?php
/**
 * Shared config + helpers for the RW 95.1 FM API.
 */

if (realpath(__FILE__) === realpath($_SERVER['SCRIPT_FILENAME'] ?? '')) {
    http_response_code(403);
    header('Content-Type: application/json; charset=utf-8');
    exit(json_encode(['error' => 'Direct access forbidden']));
}

ob_start();
header_remove('X-Powered-By');

ini_set('display_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);

$ENV = [];
$settingsFile = __DIR__ . '/email_connect.php';
if (is_file($settingsFile)) {
    $loaded = require $settingsFile;
    if (is_array($loaded)) $ENV = $loaded;
}
function env(string $key, string $default = ''): string {
    global $ENV;
    return $ENV[$key] ?? $default;
}

require_once __DIR__ . '/mysqli_connect.php';

const UPLOAD_DIR    = __DIR__ . '/../uploads';
const UPLOAD_MAX_MB = 8;

$envOrigins = array_filter(array_map('trim', explode(',', env('ALLOWED_ORIGINS', ''))));
$allowedOrigins = array_merge([
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'https://rw951.fm',
    'https://www.rw951.fm',
], $envOrigins);

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowedOrigins, true)) {
    header("Access-Control-Allow-Origin: $origin");
    header('Vary: Origin');
}
header('Access-Control-Allow-Headers: Content-Type, X-Upload-Token');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Content-Type: application/json; charset=utf-8');
header('X-Robots-Tag: noindex, nofollow');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// TEMPORARY DEBUG: remove the 'debug' lines after the test
set_exception_handler(function (Throwable $e) {
    error_log($e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());
    respond([
        'error' => 'An unexpected server error occurred.',
        'debug' => $e->getMessage() . ' in ' . basename($e->getFile()) . ':' . $e->getLine(),
    ], 500);
});

// TEMPORARY DEBUG: remove the 'debug' lines after the test
register_shutdown_function(function () {
    $e = error_get_last();
    if ($e && in_array($e['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR], true)) {
        error_log($e['message'] . ' in ' . $e['file'] . ':' . $e['line']);
        if (ob_get_length()) ob_clean();
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'error' => 'An unexpected server error occurred.',
            'debug' => $e['message'] . ' in ' . basename($e['file']) . ':' . $e['line'],
        ]);
    }
});

function respond($payload, int $status = 200): void {
    if (ob_get_length()) ob_clean();
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function image_url(?string $filename): ?string {
    if (!$filename) return null;
    $path = implode('/', array_map('rawurlencode', explode('/', $filename)));
    return '/uploads/' . $path;
}

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