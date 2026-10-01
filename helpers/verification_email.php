<?php
// Purpose: Build the HTML and plain-text email containing a verification code.
// Used by auth_controller.php before sending through helpers/mailer.php.

// A simple, self-contained transactional email. Images, tracking pixels and
// promotional links are intentionally absent so the message stays clear.
function verification_email_html(string $code): string
{
    $safeCode = htmlspecialchars($code, ENT_QUOTES, 'UTF-8');

    return <<<HTML
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Verify your PennyLedger email</title>
</head>
<body style="margin:0;padding:0;background:#f2f5f2;color:#17251d;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Use your six-digit code to verify your PennyLedger account. It expires in 10 minutes.</div>
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;background:#f2f5f2;">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;border-collapse:collapse;background:#ffffff;border:1px solid #dce5dd;border-radius:12px;">
        <tr><td style="padding:24px 32px;background:#172a20;color:#ffffff;border-radius:12px 12px 0 0;font-size:20px;font-weight:bold;letter-spacing:.2px;">PennyLedger</td></tr>
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 16px;font-size:26px;line-height:1.3;color:#17251d;">Verify your email address</h1>
          <p style="margin:0 0 24px;font-size:16px;line-height:1.6;">Hello,</p>
          <p style="margin:0 0 24px;font-size:16px;line-height:1.6;">We received a request to create a PennyLedger account with this email address. Enter the code below on the verification page to finish setting up your account.</p>
          <p style="margin:0 0 10px;font-size:13px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:#526356;">Your verification code</p>
          <p style="margin:0 0 24px;padding:18px 12px;background:#eef4ef;border:1px solid #dce5dd;border-radius:8px;text-align:center;color:#172a20;font-size:34px;font-weight:bold;letter-spacing:8px;line-height:1.2;">{$safeCode}</p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">This code expires in <strong>10 minutes</strong>. For your security, do not share it with anyone.</p>
          <p style="margin:0;font-size:15px;line-height:1.6;">If you did not request a PennyLedger account, you can ignore this email.</p>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #e6ece7;color:#657267;font-size:12px;line-height:1.5;">This is an automated account verification message from PennyLedger.</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
HTML;
}

// Explicit plain text reads well in mail clients that do not display HTML.
function verification_email_text(string $code): string
{
    return "PennyLedger - Verify your email address\n\n"
        . "We received a request to create a PennyLedger account with this email address.\n"
        . "Enter this code on the verification page: {$code}\n\n"
        . "This code expires in 10 minutes. Do not share it with anyone.\n\n"
        . "If you did not request a PennyLedger account, you can ignore this email.\n";
}