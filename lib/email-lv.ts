export function participantConfirmHtml(opts: { name?: string; eventName: string }) {
  const { name, eventName } = opts;

  return `
  <!DOCTYPE html>
  <html lang="lv">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Paldies par reģistrāciju</title>
    <style type="text/css">
      body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
      body { margin: 0; padding: 0; width: 100% !important; background-color: #f4f4f4; }
      table { border-collapse: collapse !important; }
      img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; max-width: 100%; }
      .container { width: 100%; max-width: 600px; margin: 0 auto; background-color: #ffffff; }
      .header { padding: 20px; text-align: center; }
      .header img { max-width: 150px; }
      .content { padding: 20px; font-family: Arial, sans-serif; color: #333333; line-height: 1.5; }
      .button { display: inline-block; padding: 12px 24px; margin: 20px 0; font-size: 16px; color: #ffffff;
                background-color: #e67e22; text-decoration: none; border-radius: 4px; }
      .footer { padding: 20px; font-size: 12px; color: #777777; text-align: center; }
      @media screen and (max-width: 480px) {
        .content { padding: 15px; }
        .button { width: 100%; box-sizing: border-box; text-align: center; }
      }
    </style>
  </head>
  <body>
    <table width="100%" bgcolor="#f4f4f4" role="presentation">
      <tr>
        <td align="center">
          <table class="container" role="presentation">
            <tr>
              <td class="header">
                <!-- Замените src на URL вашего логотипа -->
                <img src="https://rudenskonference.lv/logo.png" alt="Rudens Konference Logo" />
              </td>
            </tr>
            <tr>
              <td class="content">
                <h1 style="color:#333333;">Paldies par reģistrāciju!</h1>
                <p>Sveiki${name ? `, ${name}` : ''}!</p>
                <p>Paldies, ka reģistrējāties <strong>${eventName}</strong>. 
                Mēs esam saņēmuši jūsu pieteikumu un drīzumā ar jums sazināsimies ar papildinformāciju.</p>
                <p>Ja jums ir kādi jautājumi līdz tam, rakstiet uz 
                  <a href="mailto:info@rudenskonference.lv" style="color:#e67e22;">info@rudenskonference.lv</a>.
                </p>
                <a href="https://rudenskonference.lv" class="button">Apskatīt mājaslapu</a>
              </td>
            </tr>
            <tr>
              <td class="footer">
                <p>Šis ir automātisks apstiprinājums no <strong>rudenskonference.lv</strong></p>
                <p>Komanda „Skola – kopienā”</p>
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
