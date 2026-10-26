<?php
/**
 * POST contact.php   (JSON)  { name, email, message, website }
 *   -> saves the message in contacts_tbl, then emails it to CONTACT_TO via SMTP (PHPMailer)
 *   <- { data: { saved: true, emailed: true|false } }
 *
 * backend/.env:
 *   SMTP_HOST, SMTP_PORT, SMTP_SECURE (tls|ssl), SMTP_USER, SMTP_PASS
 *   CONTACT_TO, CONTACT_FROM
 *   BANNER_URL=https://yourdomain.com/assets/cropped-NewBanner.jpg   (public https link, no Gmail hover icons)
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
$msgHtml   = nl2br($h($message));

/* ---------- Banner ----------
   1) BANNER_URL (public https link)  -> normal image, NO download/save icons in Gmail
   2) otherwise the local file is embedded (cid) -> Gmail shows hover icons on attachments */
$bannerUrl  = trim(env('BANNER_URL', ''));
$bannerPath = '';
$bannerSrc  = '';

if ($bannerUrl !== '' && preg_match('#^https://#i', $bannerUrl)) {
    $bannerSrc = $bannerUrl;
} else {
    foreach (['/../assets/cropped-NewBanner.jpg', '/../assets/banner/cropped-NewBanner.jpg', '/../uploads/cropped-NewBanner.jpg'] as $rel) {
        if (is_file(__DIR__ . $rel)) { $bannerPath = __DIR__ . $rel; break; }
    }
    if ($bannerPath !== '') $bannerSrc = 'cid:rwbanner';
}
$hasBanner = $bannerSrc !== '';
if (!$hasBanner) error_log('contact.php: banner image not found');

// Banner only (no red bar). Wrapped in an anchor with inline styles and Gmail suppression
// to completely prevent Gmail from overlaying the Download, Google Drive, and Google Photos icons.
$headerHtml = $hasBanner
  ? '<tr><td bgcolor="#111111" align="center" style="background:#111111;padding:0;line-height:0;font-size:0;text-align:center;">'
    . '<a href="#" target="_blank" rel="noopener noreferrer" style="text-decoration:none;border:none;outline:none;display:block;cursor:default;pointer-events:none;line-height:0;">'
    . '<img src="' . $h($bannerSrc) . '" width="640" alt="RW 95.1 FM" '
    . 'style="display:block;width:100%;max-width:640px;height:auto;border:0;outline:none;text-decoration:none;pointer-events:none;margin:0 auto;" draggable="false">'
    . '</a>'
    . '</td></tr>'
  : '<tr><td bgcolor="#111111" align="center" style="background:#111111;padding:28px;font-family:Arial,Helvetica,sans-serif;font-size:24px;font-weight:bold;color:#ffffff;">RW 95.1 FM</td></tr>';

// Short text shown in the inbox preview (hidden in the email itself)
$preheader = $h(mb_strimwidth(preg_replace('/\s+/', ' ', $message), 0, 110, '…', 'UTF-8'));

$font  = "font-family:'Segoe UI',Arial,Helvetica,sans-serif;";
$label = $font . 'font-size:11px;font-weight:bold;letter-spacing:1px;color:#8a8a8a;';

$body = '<!DOCTYPE html>'
  . '<html lang="en" xmlns="http://www.w3.org/1999/xhtml"><head>'
  . '<meta charset="UTF-8">'
  . '<meta name="viewport" content="width=device-width,initial-scale=1">'
  . '<meta http-equiv="X-UA-Compatible" content="IE=edge">'
  . '<meta name="color-scheme" content="light dark">'
  . '<meta name="supported-color-schemes" content="light dark">'
  . '<title>' . $h($subject) . '</title>'
  . '<style>'
  . ':root{color-scheme:light dark;supported-color-schemes:light dark;}'
  . 'body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}'
  . 'img{-ms-interpolation-mode:bicubic;}'
  /* Suppress Gmail image hover action toolbar and download/drive icons */
  . '.a5q, span.a5q, div.a5q, .a6S{display:none !important;opacity:0 !important;visibility:hidden !important;pointer-events:none !important;}'
  . 'img + div{display:none !important;}'
  . '@media only screen and (max-width:640px){'
  .   '.px{padding-left:20px !important;padding-right:20px !important;}'
  .   '.btn a{display:block !important;}'
  . '}'
  /* Dark mode (Apple Mail, Outlook, Gmail app and others that support it) */
  . '@media (prefers-color-scheme:dark){'
  .   '.bg-page{background:#121212 !important;}'
  .   '.bg-card{background:#1e1e1e !important;}'
  .   '.bg-soft{background:#262626 !important;}'
  .   '.bg-foot{background:#181818 !important;border-top-color:#2e2e2e !important;}'
  .   '.t-main{color:#f2f2f2 !important;}'
  .   '.t-muted{color:#a8a8a8 !important;}'
  .   '.t-link{color:#ff6b6b !important;}'
  .   '.line{border-color:#333333 !important;}'
  . '}'
  . '[data-ogsc] .t-main{color:#f2f2f2 !important;}'
  . '[data-ogsc] .t-muted{color:#a8a8a8 !important;}'
  . '[data-ogsc] .t-link{color:#ff6b6b !important;}'
  . '[data-ogsb] .bg-page{background:#121212 !important;}'
  . '[data-ogsb] .bg-card{background:#1e1e1e !important;}'
  . '[data-ogsb] .bg-soft{background:#262626 !important;}'
  . '[data-ogsb] .bg-foot{background:#181818 !important;}'
  . '</style></head>'
  . '<body class="bg-page" style="margin:0;padding:0;background:#f3f4f6;">'

  // hidden preview text
  . '<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;font-size:1px;line-height:1px;">' . $preheader . '</div>'

  . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="bg-page" style="background:#f3f4f6;"><tr>'
  . '<td align="center" style="padding:28px 12px;">'

  . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="bg-card" '
  . 'style="max-width:640px;background:#ffffff;border-radius:8px;overflow:hidden;border-bottom:4px solid #e60000;">'

  // banner
  . $headerHtml

  // title
  . '<tr><td class="px" style="padding:30px 36px 4px;">'
  . '<div class="t-main" style="' . $font . 'font-size:22px;font-weight:bold;color:#1f2933;line-height:1.3;">New Contact Message</div>'
  . '<div class="t-muted" style="' . $font . 'font-size:14px;color:#6b7280;margin-top:6px;line-height:1.5;">'
  . 'Someone sent a message through the Contact Us page of your website.</div>'
  . '</td></tr>'

  // sender details
  . '<tr><td class="px" style="padding:22px 36px 0;">'
  . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">'
  . '<tr><td class="line" style="padding:14px 0;border-top:1px solid #e5e7eb;">'
  .   '<div class="t-muted" style="' . $label . '">NAME</div>'
  .   '<div class="t-main" style="' . $font . 'font-size:16px;color:#1f2933;margin-top:4px;">' . $h($name) . '</div>'
  . '</td></tr>'
  . '<tr><td class="line" style="padding:14px 0;border-top:1px solid #e5e7eb;">'
  .   '<div class="t-muted" style="' . $label . '">E-MAIL</div>'
  .   '<div style="' . $font . 'font-size:16px;margin-top:4px;">'
  .   '<a class="t-link" href="mailto:' . $h($email) . '" style="color:#e60000;text-decoration:none;">' . $h($email) . '</a></div>'
  . '</td></tr>'
  . '<tr><td class="line" style="padding:14px 0 0;border-top:1px solid #e5e7eb;">'
  .   '<div class="t-muted" style="' . $label . '">MESSAGE</div>'
  . '</td></tr>'
  . '</table>'
  . '</td></tr>'

  // message box
  . '<tr><td class="px" style="padding:8px 36px 0;">'
  . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>'
  . '<td width="4" bgcolor="#e60000" style="background:#e60000;font-size:0;line-height:0;">&nbsp;</td>'
  . '<td class="bg-soft t-main" bgcolor="#f7f7f8" style="' . $font . 'background:#f7f7f8;padding:16px 18px;font-size:15px;line-height:1.7;color:#1f2933;word-break:break-word;">'
  . $msgHtml
  . '</td></tr></table>'
  . '</td></tr>'

  // reply button
  . '<tr><td class="px btn" style="padding:28px 36px 34px;">'
  . '<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>'
  . '<td align="center" bgcolor="#e60000" style="background:#e60000;border-radius:4px;">'
  . '<a href="' . $h($replyHref) . '" style="' . $font . 'display:inline-block;padding:13px 30px;font-size:14px;font-weight:bold;color:#ffffff;text-decoration:none;">Reply to ' . $h($safeName) . '</a>'
  . '</td></tr></table>'
  . '</td></tr>'

  // footer
  . '<tr><td class="px bg-foot" bgcolor="#fafafa" style="background:#fafafa;border-top:1px solid #eeeeee;padding:18px 36px;">'
  . '<div class="t-muted" style="' . $font . 'font-size:12px;line-height:1.7;color:#8a8a8a;">'
  . 'Received on ' . $h($sentAt) . ' (Philippine time)<br>'
  . 'You can also reply directly to this e-mail to answer the sender.'
  . '</div>'
  . '<div class="t-muted" style="' . $font . 'font-size:12px;line-height:1.7;color:#8a8a8a;margin-top:10px;">'
  . '<strong>RW 95.1 FM</strong> &middot; Jose Abad Santos Avenue, City of San Fernando, Pampanga'
  . '</div>'
  . '</td></tr>'

  . '</table>'
  . '</td></tr></table>'
  . '</body></html>';

$altBody = "NEW CONTACT MESSAGE - RW 95.1 FM\n"
         . "----------------------------------------------\n"
         . "Name:   $name\n"
         . "E-mail: $email\n\n"
         . "Message:\n$message\n\n"
         . "----------------------------------------------\n"
         . "Received $sentAt (Philippine time)\n"
         . "Reply directly to this e-mail to answer the sender.";

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

        $ssl = $mail->SMTPOptions['ssl'] ?? [];

        // Local XAMPP only: some networks time out on IPv6, so connect over IPv4
        if (strtolower(env('SMTP_FORCE_IPV4', 'false')) === 'true') {
            $ip4 = gethostbyname($smtpHost);
            if ($ip4 !== $smtpHost) {
                $mail->Host = $ip4;
                $ssl['peer_name'] = $smtpHost;
            }
        }

        // Local XAMPP often has no CA bundle; only disable verification when .env says so
        if (strtolower(env('SMTP_VERIFY_SSL', 'true')) === 'false') {
            $ssl['verify_peer']       = false;
            $ssl['verify_peer_name']  = false;
            $ssl['allow_self_signed'] = true;
        }

        if (!empty($ssl)) {
            $mail->SMTPOptions = ['ssl' => $ssl];
        }
    } else {
        $mail->isMail(); // fallback for hosts where mail() already works
    }

    $mail->CharSet = 'UTF-8';
    $mail->setFrom($from, 'RW 95.1 FM Website');
    $mail->addAddress($to);
    $mail->addReplyTo($email, $safeName);

    // Only embed the picture when no public BANNER_URL is used
    if ($bannerPath !== '') {
        $mail->addEmbeddedImage($bannerPath, 'rwbanner', '', 'base64', 'image/jpeg', 'inline');
    }

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