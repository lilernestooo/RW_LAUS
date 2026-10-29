<?php
if (realpath(__FILE__) === realpath($_SERVER['SCRIPT_FILENAME'] ?? '')) {
    http_response_code(403);
    header('Content-Type: application/json; charset=utf-8');
    exit(json_encode(['error' => 'Direct access forbidden']));
}

return [
    // Admin login (32+ random characters, different on the server)
    'ADMIN_TOKEN_SECRET' => '$2y$10$URxKVFFKTb24JmPXfnxdJurURLYMpo0uTuvd3ds.QjbxJH/4Ivo4W',

    'ALLOWED_ORIGINS' => 'https://rw951.fm,https://www.rw951.fm',

    'SMTP_HOST'   => 'smtp.gmail.com',
    'SMTP_PORT'   => '465',
    'SMTP_SECURE' => 'ssl',
    'SMTP_USER'   => 'ernestlazatin69@gmail.com',
    'SMTP_PASS'   => 'qtaegzodwdhcagjb',

    'CONTACT_TO'             => 'dwrw951fm@yahoo.com',
    'CONTACT_FROM'           => 'ernestlazatin69@gmail.com',
    'CONTACT_FROM_NAME'      => 'DWRW Contact Form',
    'CONTACT_SUBJECT_PREFIX' => 'DWRW Contact Form',
    'CONTACT_RATE_LIMIT'     => '5',

    'BANNER_URL' => 'https://rw951.fm/assets/cropped-NewBanner.jpg',
    'SITE_TITLE' => 'RW 95.1 FM',
    'SITE_URL'   => 'https://rw951.fm',

    // Local XAMPP only. Leave these two out on the server.
    // 'SMTP_VERIFY_SSL' => 'false',
    // 'SMTP_FORCE_IPV4' => 'true',
];