/** Автоответ участнику — фирменный фиолетовый стиль (skola-kopiena.lv) */
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
      body {
        margin:0; padding:0; width:100% !important;
        font-family:Arial,Helvetica,sans-serif; color:#fff;
        background:linear-gradient(180deg, #4a2961 0%, #5a3474 100%);
      }
      table { border-collapse:collapse !important; }
      .container {
        width:100%; max-width:640px; margin:0 auto;
        background:#fff; border-radius:10px; overflow:hidden;
        color:#333;
      }
      .content {
        padding:36px 32px; line-height:1.6;
      }
      h1 {
        font-size:24px; font-weight:600; color:#4a2961;
        margin-bottom:16px;
      }
      p { margin:0 0 12px 0; color:#333; }
      a.button {
        display:inline-block;
        background:#4a2961;
        color:#fff !important;
        text-decoration:none;
        padding:12px 28px;
        border-radius:6px;
        font-weight:600;
        margin-top:24px;
      }
      .footer {
        text-align:center;
        padding:20px;
        font-size:12px;
        color:#ddd;
      }
      @media screen and (max-width:480px) {
        .content { padding:24px 18px; }
        h1 { font-size:20px; }
      }
    </style>
  </head>
  <body>
    <table width="100%" bgcolor="#4a2961" role="presentation">
      <tr>
        <td align="center" style="padding:40px 0;">
          <table class="container" role="presentation">
            <tr>
              <td class="content">
                <h1>Paldies par reģistrāciju!</h1>
                <p>Sveiki${name ? `, ${escapeHtml(name)}` : ""}!</p>
                <p>
                  Paldies, ka reģistrējāties
                  <strong>${escapeHtml(eventName)}</strong>.
                </p>
                <p>
                  Mēs esam saņēmuši jūsu pieteikumu un drīzumā ar jums sazināsimies ar papildinformāciju.
                </p>
                <p>
                  Jautājumu gadījumā rakstiet uz
                  <a href="mailto:info@rudenskonference.lv" style="color:#4a2961; font-weight:600; text-decoration:none;">
                    info@rudenskonference.lv
                  </a>.
                </p>
                <a href="https://www.skola-kopiena.lv" class="button">Apskatīt mājaslapu</a>
              </td>
            </tr>
          </table>
          <div class="footer">
            Šis ir automātisks apstiprinājums no rudenskonference.lv<br/>
            Komanda “Skola – kopienā”
          </div>
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
