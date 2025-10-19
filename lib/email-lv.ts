// lib/email-lv.ts

export function adminHtmlLV(form: Record<string, unknown>) {
  const rows = Object.entries(form).map(
    ([k, v]) =>
      `<tr>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;"><b>${escapeHtml(k)}</b></td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;">${escapeHtml(String(v ?? "—"))}</td>
      </tr>`
  );

  return `
  <div style="font-family:Arial,Helvetica,sans-serif;color:#222;">
    <h3 style="margin:0 0 12px 0;">Jauna reģistrācija</h3>
    <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;min-width:320px;">
      ${rows.join("")}
    </table>
    <p style="font-size:12px;color:#777;margin-top:12px;">
      Laiks: ${new Date().toLocaleString("lv-LV")}
    </p>
  </div>`;
}

/** Автоответ участнику — фирменный стиль skola-kopiena.lv, без логотипа */
export function confirmationHtmlLV(opts: { name?: string; eventName: string }) {
  const { name, eventName } = opts;

  return `<!DOCTYPE html>
  <html lang="lv">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Paldies par reģistrāciju</title>
    <style>
      body, table, td, a { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
      body { margin:0; padding:0; width:100% !important; background:#f6f5f1; font-family:Arial,Helvetica,sans-serif; color:#333; }
      table { border-collapse:collapse !important; }
      .container { width:100%; max-width:640px; margin:0 auto; background:#ffffff; border-radius:8px; overflow:hidden; }
      .content { padding:32px 28px; line-height:1.6; }
      h1 { font-size:22px; font-weight:600; color:#264d38; margin-bottom:16px; }
      p { margin:0 0 12px 0; }
      a.button { display:inline-block; background:#3c7b59; color:#fff !important; text-decoration:none; padding:12px 28px; border-radius:6px; font-weight:600; margin-top:24px; }
      .footer { background:#f6f5f1; text-align:center; padding:20px; font-size:12px; color:#666; }
      @media screen and (max-width:480px) { .content { padding:20px 16px; } }
    </style>
  </head>
  <body>
    <table width="100%" bgcolor="#f6f5f1" role="presentation">
      <tr><td align="center">
        <table class="container" role="presentation">
          <tr>
            <td class="content">
              <h1>Paldies par reģistrāciju!</h1>
              <p>Sveiki${name ? `, ${escapeHtml(name)}` : ""}!</p>
              <p>Paldies, ka reģistrējāties <strong>${escapeHtml(eventName)}</strong>.</p>
              <p>Mēs esam saņēmuši jūsu pieteikumu.</p>
              <p>Jautājumu gadījumā rakstiet uz
                <a href="mailto:info@rudenskonference.lv" style="color:#3c7b59; text-decoration:none; font-weight:600;">
                  info@rudenskonference.lv
                </a>.
              </p>
              <a href="https://www.skola-kopiena.lv" class="button">Apskatīt mājaslapu</a>
            </td>
          </tr>
          <tr>
            <td class="footer">
              <p>Šis ir automātisks apstiprinājums no <strong>rudenskonference.lv</strong></p>
              <p style="margin-top:6px;">Komanda “Skola – kopienā”</p>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </body>
  </html>`;
}

/** Простейшая экранизация для безопасности письма */
function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
