// lib/email-lv.ts
export function participantConfirmHtml(opts: { name?: string; eventName: string }) {
  const { name, eventName } = opts;
  return `
    <div style="font-family: Arial, sans-serif; line-height:1.6; color:#222;">
      <p>Sveiki${name ? `, ${name}` : ''}!</p>
      <p>Paldies, ka reģistrējāties <b>${eventName}</b>.</p>
      <p>Mēs esam saņēmuši jūsu pieteikumu. Ja radīsies jautājumi, atbildiet uz šo e-pastu.</p>
      <hr style="border:none;border-top:1px solid #eee; margin:16px 0"/>
      <p style="font-size:12px;color:#777">Šis ir automātisks apstiprinājums no rudenskonference.lv</p>
    </div>
  `;
}

export function adminNotifyHtml(form: Record<string, any>) {
  const rows = Object.entries(form)
    .map(([k, v]) => `<tr><td><b>${k}</b></td><td>${String(v ?? '—')}</td></tr>`)
    .join('');
  return `
    <div style="font-family: Arial, sans-serif">
      <h3>Jauna reģistrācija</h3>
      <table cellpadding="6" border="0" style="border-collapse:collapse">${rows}</table>
      <p style="font-size:12px;color:#777">Laiks: ${new Date().toLocaleString('lv-LV')}</p>
    </div>
  `;
}
