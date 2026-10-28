<?php
/**
 * Shared config + helpers for the RW 95.1 FM API.
 * Lives in frontend/public/api/ (served at /api/ in dev and production).
 */

// Prevent direct browser execution of config.php
if (realpath(__FILE__) === realpath($_SERVER['SCRIPT_FILENAME'] ?? '')) {
    http_response_code(403);
    exit(json_encode(['error' => 'Direct access forbidden']));
}

// Security: Never display raw errors or stack traces to clients in production
ini_set('display_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);

// ---- Load secrets from .env (plain KEY=value lines) ----
// Currently resolves to frontend/public/.env. Make sure public/.htaccess blocks it.
function load_env(string $file): array {
    if (!is_file($file)) return [];
    $env = [];
    foreach (file($file, FILE_IGNORE_NEW_LINES) as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#' || strpos($line, '=') === false) continue;
        [$key, $val] = explode('=', $line, 2);
        $val = trim($val);
        if (strlen($val) >= 2 && ($val[0] === '"' || $val[0] === "'") && substr($val, -1) === $val[0]) {
            $val = substr($val, 1, -1);
        }
        $env[trim($key)] = $val;
    }
    return $env;
}
$ENV = load_env(__DIR__ . '/../.env');
function env(string $key, string $default = ''): string {
    global $ENV;
    return $ENV[$key] ?? $default;
}

// ---- Database (values come from .env) ----
define('DB_HOST', env('DB_HOST', '127.0.0.1'));
define('DB_NAME', env('DB_NAME', 'db_rw'));
define('DB_USER', env('DB_USER', 'root'));
define('DB_PASS', env('DB_PASS', ''));

// ---- Uploads ----
define('UPLOAD_TOKEN', env('UPLOAD_TOKEN', ''));   // set in .env; empty = uploads disabled
const UPLOAD_DIR    = __DIR__ . '/../uploads';     // -> frontend/public/uploads
const UPLOAD_MAX_MB = 8;                           // per image

// ---- CORS (Vite dev server + production) ----
$envOrigins = array_filter(array_map('trim', explode(',', env('ALLOWED_ORIGINS', ''))));
$allowedOrigins = array_merge([
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'https://rw951.fm',        // production domain
    'https://www.rw951.fm',    // www variant
], $envOrigins);

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowedOrigins, true)) {
    header("Access-Control-Allow-Origin: $origin");
    header('Vary: Origin');
}
header('Access-Control-Allow-Headers: Content-Type, X-Upload-Token');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Content-Type: application/json; charset=utf-8');
header('X-Robots-Tag: noindex, nofollow');  // hide API from search engines
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');
header('Referrer-Policy: strict-origin-when-cross-origin');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Global exception safety so unhandled errors never leak DB credentials or traces
set_exception_handler(function (Throwable $e) {
    error_log($e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());
    respond(['error' => 'An unexpected server error occurred.'], 500);
});

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

/**
 * Turn a stored filename like "page1/hero.png" into a root-relative URL.
 * Returns "/uploads/page1/hero.png", which Vite serves from public/uploads
 * in dev and which works the same on the production domain.
 */
function image_url(?string $filename): ?string {
    if (!$filename) return null;
    $path = implode('/', array_map('rawurlencode', explode('/', $filename)));
    return '/uploads/' . $path;
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