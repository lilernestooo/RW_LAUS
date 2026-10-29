<?php
// One file for the admin login.
//  - Opened directly (POST /api/auth.php) it signs you in and returns a token.
//  - Other endpoints use it with:  require_once __DIR__ . '/auth.php';  require_admin();
// Needs ADMIN_TOKEN_SECRET (32+ random characters) in api/email_connect.php
//   php -r "echo bin2hex(random_bytes(32));"
require_once __DIR__ . '/config.php';   // gives us db(), env(), respond() and the CORS headers

// ---------- token helpers ----------
function admin_secret(): string {
    $s = env('ADMIN_TOKEN_SECRET');
    if (strlen($s) < 32) respond(['error' => 'ADMIN_TOKEN_SECRET is missing or too short in email_connect.php'], 500);
    return $s;
}
function b64u_enc(string $d): string { return rtrim(strtr(base64_encode($d), '+/', '-_'), '='); }
function b64u_dec(string $d): string { return (string) base64_decode(strtr($d, '-_', '+/')); }

function issue_token(int $id, string $username, int $ttl = 43200): string { // valid 12 hours
    $payload = b64u_enc(json_encode(['id' => $id, 'u' => $username, 'exp' => time() + $ttl]));
    return $payload . '.' . b64u_enc(hash_hmac('sha256', $payload, admin_secret(), true));
}

function verify_token(string $token): ?array {
    $parts = explode('.', $token);
    if (count($parts) !== 2) return null;
    [$payload, $sig] = $parts;
    if (!hash_equals(b64u_enc(hash_hmac('sha256', $payload, admin_secret(), true)), $sig)) return null;
    $data = json_decode(b64u_dec($payload), true);
    return (is_array($data) && ($data['exp'] ?? 0) >= time()) ? $data : null;
}

// React sends the token in the X-Upload-Token header.
function current_admin(): ?array {
    $t = trim($_SERVER['HTTP_X_UPLOAD_TOKEN'] ?? '');
    if ($t === '') return null;
    return verify_token($t);
}

function require_admin(): array {
    $admin = current_admin();
    if (!$admin) respond(['error' => 'Please sign in again.'], 401);
    return $admin;
}

// ---------- the login endpoint (only runs when this file is opened directly) ----------
if (realpath(__FILE__) === realpath($_SERVER['SCRIPT_FILENAME'] ?? '')) {

    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'GET') {   // "is my saved token still good?"
        $a = require_admin();
        respond(['data' => ['user' => ['username' => $a['u']]]]);
    }

    $in = json_decode(file_get_contents('php://input'), true) ?: [];
    if (($in['action'] ?? '') === 'login') {
        $st = db()->prepare('SELECT id, username, password_hash FROM admin_tbl WHERE username = ? LIMIT 1');
        $st->execute([trim((string) ($in['username'] ?? ''))]);
        $row = $st->fetch();

        if (!$row || !password_verify((string) ($in['password'] ?? ''), $row['password_hash'])) {
            usleep(700000); // slows down password guessing
            respond(['error' => 'Wrong username or password.'], 401);
        }
        respond(['data' => [
            'token' => issue_token((int) $row['id'], $row['username']),
            'user'  => ['username' => $row['username']],
        ]]);
    }

    respond(['error' => 'Unknown action.'], 400);
}