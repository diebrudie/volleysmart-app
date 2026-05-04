/**
 * Shared branded email template for all VolleySmart emails.
 * Matches the visual style of email-template.html (MJML-compiled).
 * Sender: noreply@volleysmart.app via Resend.
 */

interface EmailTemplateOptions {
  heading: string;
  bodyHtml: string;
  ctaUrl?: string;
  ctaText?: string;
  footerText?: string;
}

export function buildEmailHtml(options: EmailTemplateOptions): string {
  const { heading, bodyHtml, ctaUrl, ctaText, footerText } = options;

  const ctaBlock = ctaUrl && ctaText
    ? `
      <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:separate;width:auto;margin:24px auto 0;">
        <tr>
          <td align="center" bgcolor="#1D4ED8" role="presentation"
              style="border:none;border-radius:8px;cursor:auto;mso-padding-alt:12px 24px;background:#1D4ED8;">
            <a href="${ctaUrl}" rel="noopener" target="_blank"
               style="display:inline-block;background:#1D4ED8;color:#ffffff;font-family:Helvetica,Arial,sans-serif;font-size:14px;font-weight:bold;line-height:120%;margin:0;text-decoration:none;text-transform:none;padding:12px 24px;border-radius:8px;">
              ${ctaText}
            </a>
          </td>
        </tr>
      </table>`
    : "";

  const footer = footerText ?? "You received this email because an action was taken on VolleySmart.";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${heading}</title>
  <style>
    body { margin:0; padding:0; -webkit-text-size-adjust:100%; background-color:#F3F4F6; }
    table, td { border-collapse:collapse; }
    a { text-decoration:none; color:inherit; }
  </style>
</head>
<body style="word-spacing:normal;background-color:#F3F4F6;">
  <div style="background-color:#F3F4F6;padding:32px 0;">
    <!-- Card -->
    <div style="background:#FFFFFF;margin:0 auto;max-width:600px;border-radius:12px;overflow:hidden;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation"
             style="background:#FFFFFF;width:100%;">
        <tbody>
          <!-- Logo -->
          <tr>
            <td style="padding:28px 32px 0;text-align:center;">
              <img src="https://volleysmart.app/logo-volleySmart%20-%20email%20lightmode.png" alt="VolleySmart"
                   style="height:40px;width:auto;" />
            </td>
          </tr>
          <!-- Heading -->
          <tr>
            <td style="padding:24px 32px 8px;">
              <h1 style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:22px;font-weight:bold;color:#111827;text-align:center;">
                ${heading}
              </h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:8px 32px 24px;font-family:Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#374151;">
              ${bodyHtml}
              ${ctaBlock}
            </td>
          </tr>
          <!-- Divider -->
          <tr>
            <td style="padding:0 32px;">
              <hr style="border:none;border-top:1px solid #E5E7EB;margin:0;" />
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px 24px;font-family:Helvetica,Arial,sans-serif;font-size:11px;line-height:1.5;color:#9CA3AF;text-align:center;">
              ${footer}<br/>
              <a href="https://volleysmart.app" style="color:#6B7280;">volleysmart.app</a>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>`;
}

const RESEND_URL = "https://api.resend.com/emails";

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export async function sendEmail(
  apiKey: string,
  options: SendEmailOptions
): Promise<{ ok: boolean; error?: string }> {
  const { to, subject, html, from = "VolleySmart <noreply@volleysmart.app>" } = options;

  try {
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, html }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("Resend API error:", res.status, body);
      return { ok: false, error: `Resend ${res.status}: ${body}` };
    }

    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("sendEmail failed:", msg);
    return { ok: false, error: msg };
  }
}
