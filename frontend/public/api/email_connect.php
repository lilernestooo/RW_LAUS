<?php
if (realpath(__FILE__) === realpath($_SERVER['SCRIPT_FILENAME'] ?? '')) {
    http_response_code(403);
    header('Content-Type: application/json; charset=utf-8');
    exit(json_encode(['error' => 'Direct access forbidden']));
}

return [
    'ADMIN_TOKEN_SECRET' => '$2y$10$URxKVFFKTb24JmPXfnxdJurURLYMpo0uTuvd3ds.QjbxJH/4Ivo4W',

    'ALLOWED_ORIGINS' => 'https://rw951.fm,https://www.rw951.fm',

    // Leave SMTP blank to use the server's built-in mailer (no password needed on the live server)
    'SMTP_HOST'   => '',
    'SMTP_PORT'   => '',
    'SMTP_SECURE' => '',
    'SMTP_USER'   => '',
    'SMTP_PASS'   => '',

    'CONTACT_TO'             => 'dwrw951fm@yahoo.com',
    'CONTACT_FROM'           => 'noreply@rw951.fm',
    'CONTACT_FROM_NAME'      => 'DWRW Contact Form',
    'CONTACT_SUBJECT'        => 'DWRW Contact Form',
    'CONTACT_RATE_LIMIT'     => '5',

    'BANNER_URL' => 'https://rw951.fm/assets/cropped-NewBanner.jpg',
    'SITE_TITLE' => 'RW 95.1 FM',
    'SITE_URL'   => 'https://rw951.fm',
];
