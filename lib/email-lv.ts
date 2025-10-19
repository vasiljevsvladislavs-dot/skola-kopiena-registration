// lib/email-lv.ts

/** Письмо администратору: табличкой выводим все поля формы */
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
  </div>
  `;
}

/** Автоответ участнику — красивый адаптивный HTML */
export function confirmationHtmlLV(opts: { name?: string; eventName: string }) {
  const { name, eventName } = opts;

  return `
  <!DOCTYPE html>
  <html lang="lv">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Paldies par reģistrāciju</title>
    <style>
      body, table, td, a { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
      body { margin:0; padding:0; width:100% !important; background:#f4f4f4; }
      table { border-collapse:collapse !important; }
      img { border:0; height:auto; line-height:100%; outline:none; text-decoration:none; max-width:100%; }
      .container { width:100%; max-width:600px; margin:0 auto; background:#ffffff; }
      .content { padding:20px; font-family:Arial,Helvetica,sans-serif; color:#333; line-height:1.5; }
      .button { display:inline-block; padding:12px 24px; margin:20px 0; font-size:16px; color:#fff;
                background:#e67e22; text-decoration:none; border-radius:4px; }
      .footer { padding:20px; font-size:12px; color:#777; text-align:center; }
      @media screen and (max-width:480px) {
        .content { padding:15px; }
        .button { width:100%; box-sizing:border-box; text-align:center; }
      }
    </style>
  </head>
  <body>
    <table width="100%" bgcolor="#f4f4f4" role="presentation">
      <tr>
        <td align="center">
          <table class="container" role="presentation">
            <tr>
              <td class="header" style="padding:16px 20px; background:#fafafa; text-align:center;">
                <!-- SVG логотип с PNG fallback -->
                <picture>
                  <source srcset="https://www.skola-kopiena.lv/images/Skola_kopiena_Logo_krasu2.svg" type="image/svg+xml">
                  <img src="https://www.skola-kopiena.lv/images/Skola_kopiena_Logo_krasu2.png"
                       alt="Skola – kopienā"
                       style="max-width:180px; height:auto;" />
                </picture>
              </td>
            </tr>
            <tr>
              <td class="content">
                <h1 style="color:#333;margin:0 0 12px 0;">Paldies par reģistrāciju!</h1>
                <p style="margin:0 0 10px 0;">Sveiki${name ? `, ${escapeHtml(name)}` : ""}!</p>
                <p style="margin:0 0 10px 0;">
                  Paldies, ka reģistrējāties <strong>${escapeHtml(eventName)}</strong>.
                  Mēs esam saņēmuši jūsu pieteikumu un drīzumā ar jums sazināsimies ar papildinformāciju.
                </p>
                <p style="margin:0 0 16px 0;">
                  Jautājumu gadījumā rakstiet uz
                  <a href="mailto:info@rudenskonference.lv" style="color:#e67e22;">info@rudenskonference.lv</a>.
                </p>
                <a href="https://rudenskonference.lv" class="button">Apskatīt mājaslapu</a>
              </td>
            </tr>
            <tr>
              <td class="footer">
                <p style="margin:0;">Šis ir automātisks apstiprinājums no <strong>rudenskonference.lv</strong></p>
                <p style="margin:6px 0 0 0;">Komanda “Skola – kopienā”</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;
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
