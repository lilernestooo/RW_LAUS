<?php
/**
 * POST contact.php   (JSON)  { name, email, message, website }
 *   -> saves the message in contacts_tbl, then emails it to CONTACT_TO
 *   <- { data: { saved: true, emailed: true|false } }
 *
 * Optional lines for backend/.env (the defaults below work without them):
 *   CONTACT_TO=ernestlazatin69@gmail.com      who receives the messages
 *   CONTACT_FROM=noreply@yourdomain.com       sender shown on the email (use your real domain when live)
 */
require __DIR__ . '/config.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') respond(['error' => 'Method not allowed'], 405);

$in = json_decode(file_get_contents('php://input'), true);
if (!is_array($in)) respond(['error' => 'Invalid request.'], 400);

// Spam trap: real visitors never fill this in. Bots get a fake "ok" and nothing is saved.
if (trim((string) ($in['website'] ?? '')) !== '') {
    respond(['data' => ['saved' => true, 'emailed' => false]]);
}

$name    = trim((string) ($in['name'] ?? ''));
$email   = trim((string) ($in['email'] ?? ''));
$message = trim((string) ($in['message'] ?? ''));

if ($name === '' || mb_strlen($name) > 100) respond(['error' => 'Please enter your name.'], 422);
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 150) respond(['error' => 'Please enter a valid e-mail.'], 422);
if (mb_strlen($message) > 2000) respond(['error' => 'Your message is too long (2000 characters max).'], 422);

$pdo = db();
$ip  = substr($_SERVER['REMOTE_ADDR'] ?? '', 0, 45);

// At most 5 messages per hour from one connection, so the form can't be used to flood your inbox
$recent = $pdo->prepare('SELECT COUNT(*) FROM contacts_tbl WHERE ip_address = ? AND created_at > (NOW() - INTERVAL 1 HOUR)');
$recent->execute([$ip]);
if ((int) $recent->fetchColumn() >= 5) {
    respond(['error' => 'Too many messages from your connection. Please try again later.'], 429);
}

// 1) Save first, so a message is never lost even if the email fails
try {
    $pdo->prepare('INSERT INTO contacts_tbl (name, email, message, ip_address) VALUES (?, ?, ?, ?)')
        ->execute([$name, $email, $message, $ip]);
    $recId = (int) $pdo->lastInsertId();
} catch (PDOException $e) {
    error_log($e->getMessage());
    respond(['error' => 'Could not save your message. Please try again.'], 500);
}

// 2) Email it
$to   = env('CONTACT_TO', 'ernestlazatin69@gmail.com'); // temporary landing address
$from = env('CONTACT_FROM', 'noreply@localhost');

$h = function (string $s): string { return htmlspecialchars($s, ENT_QUOTES, 'UTF-8'); };
$safeName = preg_replace('/[\r\n]+/', ' ', $name);       // keeps visitors from injecting mail headers

$subject = '=?UTF-8?B?' . base64_encode('New message from ' . $safeName . ' (RW 95.1 FM website)') . '?=';

$body = '<html><body style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#222">'
      . '<p>New message from the RW 95.1 FM <b>Contact Us</b> page.</p>'
      . '<p><b>Name:</b> ' . $h($name) . '<br>'
      . '<b>E-mail:</b> ' . $h($email) . '<br>'
      . '<b>Record #:</b> ' . $recId . '</p>'
      . '<p><b>Message:</b><br>' . ($message !== '' ? nl2br($h($message)) : '<i>(no message)</i>') . '</p>'
      . '</body></html>';

$headers  = "MIME-Version: 1.0\r\n";
$headers .= "Content-type: text/html; charset=UTF-8\r\n";
$headers .= 'From: RW 95.1 FM Website <' . $from . ">\r\n";
$headers .= 'Reply-To: ' . $email . "\r\n";               // the e-mail was validated above, so it has no line breaks

$sent = @mail($to, $subject, $body, $headers);

if ($sent) {
    $pdo->prepare('UPDATE contacts_tbl SET emailed = 1 WHERE rec_id = ?')->execute([$recId]);
} else {
    error_log("contact.php: mail() failed for rec_id $recId");
}

respond(['data' => ['saved' => true, 'emailed' => $sent]]);