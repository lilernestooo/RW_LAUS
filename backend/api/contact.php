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

if ($name === '' || mb_strlen($name) < 2 || mb_strlen($name) > 100) respond(['error' => 'Please enter your full name (2–100 characters).'], 422);
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 150) respond(['error' => 'Please enter a valid e-mail.'], 422);
if (mb_strlen($message) < 10) respond(['error' => 'Your message is too short (at least 10 characters).'], 422);
if (mb_strlen($message) > 2000) respond(['error' => 'Your message is too long (2000 characters max).'], 422);

$pdo = db();
$ip  = substr($_SERVER['REMOTE_ADDR'] ?? '', 0, 45);

$recent = $pdo->prepare('SELECT COUNT(*) FROM contacts_tbl WHERE ip_address = ? AND created_at > (NOW() - INTERVAL 1 HOUR)');
$recent->execute([$ip]);
$limit = (int) env('CONTACT_RATE_LIMIT', '5');
if ((int) $recent->fetchColumn() >= $limit) {
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

$sentAt    = (new DateTime('now', new DateTimeZone('Asia/Manila')))->format('F j, Y \a\t g:i A');
$replyHref = 'mailto:' . $email . '?subject=' . rawurlencode('Re: Your message to RW 95.1 FM');
$msgHtml   = $message !== '' ? nl2br($h($message)) : '<i style="color:#888888">(no message)</i>';
$label     = 'font-size:11px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:#888888;';

// Banner picture: looked for in these folders (backend/assets/ is the one to use)
$bannerPath = '';
foreach (['/../assets/cropped-NewBanner.jpg', '/../assets/banner/cropped-NewBanner.jpg', '/../uploads/cropped-NewBanner.jpg'] as $rel) {
    if (is_file(__DIR__ . $rel)) { $bannerPath = __DIR__ . $rel; break; }
}
$hasBanner = $bannerPath !== '';
if (!$hasBanner) error_log('contact.php: banner image not found');

// With the banner: picture on top, thin red bar below. Without it: the red text header.
$headerHtml = $hasBanner
  ? '<tr><td style="padding:0;line-height:0;"><img src="cid:rwbanner" width="600" alt="RW 95.1 FM" style="display:block;width:100%;max-width:600px;height:auto;border:0;"></td></tr>'
    . '<tr><td style="background:#e60000;padding:10px 28px;font-size:13px;color:#ffffff;">New message from the Contact Us page</td></tr>'
  : '<tr><td style="background:#e60000;padding:20px 28px;">'
    . '<div style="font-size:22px;font-weight:bold;color:#ffffff;">RW 95.1 FM</div>'
    . '<div style="font-size:13px;color:#ffd6d6;margin-top:4px;">New message from the Contact Us page</div>'
    . '</td></tr>';

$body = '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>'
  . '<body style="margin:0;padding:0;background:#f2f2f2;">'
  . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f2f2;padding:24px 12px;"><tr><td align="center">'
  . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#222222;">'

  // header
  . $headerHtml

  // sender details + message
  . '<tr><td style="padding:28px 28px 8px;">'
  . '<div style="' . $label . '">Name</div>'
  . '<div style="font-size:17px;margin:4px 0 18px;">' . $h($name) . '</div>'
  . '<div style="' . $label . '">E-mail</div>'
  . '<div style="font-size:17px;margin:4px 0 18px;"><a href="mailto:' . $h($email) . '" style="color:#e60000;text-decoration:none;">' . $h($email) . '</a></div>'
  . '<div style="' . $label . '">Message</div>'
  . '<div style="font-size:15px;line-height:1.6;margin-top:8px;padding:14px 16px;background:#f7f7f7;border-left:4px solid #e60000;">' . $msgHtml . '</div>'
  . '</td></tr>'

  // reply button
  . '<tr><td style="padding:22px 28px 30px;">'
  . '<a href="' . $h($replyHref) . '" style="display:inline-block;background:#e60000;color:#ffffff;font-weight:bold;font-size:14px;text-decoration:none;padding:12px 24px;">Reply to ' . $h($safeName) . '</a>'
  . '</td></tr>'

  // footer
  . '<tr><td style="background:#fafafa;border-top:1px solid #eeeeee;padding:14px 28px;font-size:12px;color:#999999;">'
  . 'Received ' . $sentAt . ' (Philippine time) &middot; You can also just reply to this e-mail to answer the sender.'
  . '</td></tr>'

  . '</table></td></tr></table></body></html>';

$altBody = "New message from the RW 95.1 FM Contact Us page\n"
         . "----------------------------------------------\n"
         . "Name:   $name\n"
         . "E-mail: $email\n\n"
         . "Message:\n" . ($message !== '' ? $message : '(no message)') . "\n\n"
         . "Received $sentAt (Philippine time)";

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
        $mail->Timeout    = 20;

        // Local XAMPP only: some networks time out on IPv6, so connect over IPv4
        if (strtolower(env('SMTP_FORCE_IPV4', 'false')) === 'true') {
            $ip4 = gethostbyname($smtpHost);
            if ($ip4 !== $smtpHost) {
                $mail->Host = $ip4;
                $ssl = $mail->SMTPOptions['ssl'] ?? [];
                $ssl['peer_name'] = $smtpHost;
                $mail->SMTPOptions = ['ssl' => $ssl];
            }
        }

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
    if ($hasBanner) $mail->addEmbeddedImage($bannerPath, 'rwbanner', 'banner.jpg', 'base64', 'image/jpeg');
    $mail->isHTML(true);
    $mail->Subject = $subject;
    $mail->Body    = $body;
    $mail->AltBody = $altBody;

    $attempts = 0;
    while (!$sent && $attempts < 2) {
        $attempts++;
        try {
            $sent = $mail->send();
        } catch (MailException $e) {
            error_log("contact.php: attempt $attempts failed for rec_id $recId: " . $mail->ErrorInfo);
            $mail->smtpClose();
            if ($attempts < 2) sleep(1);
        }
    }
} catch (MailException $e) {
    error_log("contact.php: mail failed for rec_id $recId: " . $mail->ErrorInfo);
    $sent = false;
}

if ($sent) {
    $pdo->prepare('UPDATE contacts_tbl SET emailed = 1 WHERE rec_id = ?')->execute([$recId]);
}

respond(['data' => ['saved' => true, 'emailed' => $sent]]);