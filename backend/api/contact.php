<?php
/**
 * POST contact.php   (JSON)  { name, email, message, website }
 *   -> saves the message in contacts_tbl, then emails it to CONTACT_TO via SMTP (PHPMailer)
 *   <- { data: { saved: true, emailed: true|false } }
 *
 * backend/.env:
 *   SMTP_HOST, SMTP_PORT, SMTP_SECURE (tls|ssl), SMTP_USER, SMTP_PASS
 *   CONTACT_TO, CONTACT_FROM
 *   SMTP_VERIFY_SSL=false   (local XAMPP only)
 * If SMTP_HOST is empty, it falls back to PHP's mail().
 */
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception as MailException;

require __DIR__ . '/config.php';

if (file_exists(__DIR__ . '/vendor/autoload.php')) {
    require __DIR__ . '/vendor/autoload.php';
} else {
    require __DIR__ . '/lib/PHPMailer/src/Exception.php';
    require __DIR__ . '/lib/PHPMailer/src/PHPMailer.php';
    require __DIR__ . '/lib/PHPMailer/src/SMTP.php';
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') respond(['error' => 'Method not allowed'], 405);

$in = json_decode(file_get_contents('php://input'), true);
if (!is_array($in)) respond(['error' => 'Invalid request.'], 400);

// Spam trap
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
$to       = env('CONTACT_TO', 'ernestlazatin69@gmail.com');
$smtpUser = env('SMTP_USER', '');
$from     = env('CONTACT_FROM', $smtpUser !== '' ? $smtpUser : 'noreply@localhost');

$h = function (string $s): string { return htmlspecialchars($s, ENT_QUOTES, 'UTF-8'); };
$safeName = preg_replace('/[\r\n]+/', ' ', $name);

$subject = 'New message from ' . $safeName . ' (RW 95.1 FM website)';

$body = '<html><body style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#222">'
      . '<p>New message from the RW 95.1 FM <b>Contact Us</b> page.</p>'
      . '<p><b>Name:</b> ' . $h($name) . '<br>'
      . '<b>E-mail:</b> ' . $h($email) . '<br>'
      . '<b>Record #:</b> ' . $recId . '</p>'
      . '<p><b>Message:</b><br>' . ($message !== '' ? nl2br($h($message)) : '<i>(no message)</i>') . '</p>'
      . '</body></html>';

$altBody = "New message from the RW 95.1 FM Contact Us page.\n\n"
         . "Name: $name\nE-mail: $email\nRecord #: $recId\n\n"
         . "Message:\n" . ($message !== '' ? $message : '(no message)');

$sent = false;
$mail = new PHPMailer(true);
try {
    $smtpHost = env('SMTP_HOST', '');

    if ($smtpHost !== '') {
        $mail->isSMTP();
        $mail->Host       = $smtpHost;
        $mail->Port       = (int) env('SMTP_PORT', '587');
        $mail->SMTPAuth   = true;
        $mail->Username   = $smtpUser;
        $mail->Password   = env('SMTP_PASS', '');
        $mail->SMTPSecure = strtolower(env('SMTP_SECURE', 'tls')) === 'ssl'
            ? PHPMailer::ENCRYPTION_SMTPS
            : PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Timeout    = 10; // don't let the form hang if the mail server is unreachable

        // Local XAMPP often has no CA bundle; only disable verification when .env says so
        if (strtolower(env('SMTP_VERIFY_SSL', 'true')) === 'false') {
            $mail->SMTPOptions = ['ssl' => [
                'verify_peer'       => false,
                'verify_peer_name'  => false,
                'allow_self_signed' => true,
            ]];
        }
    } else {
        $mail->isMail(); // fallback for hosts where mail() already works
    }

    $mail->CharSet = 'UTF-8';
    $mail->setFrom($from, 'RW 95.1 FM Website');
    $mail->addAddress($to);
    $mail->addReplyTo($email, $safeName);
    $mail->isHTML(true);
    $mail->Subject = $subject;
    $mail->Body    = $body;
    $mail->AltBody = $altBody;

    $sent = $mail->send();
} catch (MailException $e) {
    error_log("contact.php: mail failed for rec_id $recId: " . $mail->ErrorInfo);
    $sent = false;
}

if ($sent) {
    $pdo->prepare('UPDATE contacts_tbl SET emailed = 1 WHERE rec_id = ?')->execute([$recId]);
}

respond(['data' => ['saved' => true, 'emailed' => $sent]]);