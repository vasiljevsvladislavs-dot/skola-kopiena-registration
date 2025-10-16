type Payload = {
  fullName: string;
  email: string;
  org?: string;
  role?: string;
  about: "site"|"social"|"friends"|"other";
  aboutOther?: string;
  notes?: string;
};

export function confirmationHtmlLV(p: Payload, eventName: string) {
  return `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.55;color:#0a0f1a;">
    <h2 style="margin:0 0 12px;">Reģistrācija apstiprināta</h2>
    <p style="margin:0 0 8px;">Sveicināti, <b>${escapeHtml(p.fullName)}</b>!</p>
    <p style="margin:0 0 8px;">Pateicamies par reģistrāciju: <b>${escapeHtml(eventName)}</b>.</p>
    <p style="margin:0 0 8px;">Konference notiks <b>7. novembrī plkst. 11.00</b> tiešraidē.</p>
    <hr style="margin:16px 0;border:none;border-top:1px solid #e5e7eb"/>
    <p style="font-size:12px;color:#6b7280;margin:0;">Ja reģistrāciju neveicāt jūs, ignorējiet šo vēstuli.</p>
  </div>`;
}

export function adminHtmlLV(p: Payload, eventName: string) {
  const aboutMap: Record<string,string> = {
    site: "Projekta “Skola – kopiena” mājaslapā",
    social: "Projekta “Skola – kopiena” sociālajos tīklos (Facebook, Instagram)",
    friends: "No kolēģiem / draugiem",
    other: `Cits: ${escapeHtml(p.aboutOther || "")}`,
  };
  return `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.55;color:#0a0f1a;">
    <h2 style="margin:0 0 12px;">Jauna reģistrācija — ${escapeHtml(eventName)}</h2>
    <p style="margin:0 0 6px;"><b>Vārds, uzvārds:</b> ${escapeHtml(p.fullName)}</p>
    <p style="margin:0 0 6px;"><b>E-pasts:</b> ${escapeHtml(p.email)}</p>
    ${p.org ? `<p style="margin:0 0 6px;"><b>Organizācija:</b> ${escapeHtml(p.org)}</p>` : ""}
    ${p.role ? `<p style="margin:0 0 6px;"><b>Amats:</b> ${escapeHtml(p.role)}</p>` : ""}
    <p style="margin:0 0 6px;"><b>Kā uzzināja:</b> ${aboutMap[p.about]}</p>
    ${p.notes ? `<p style="margin:8px 0 0;"><b>Piezīmes:</b><br/>${escapeHtml(p.notes)}</p>` : ""}
  </div>`;
}

function escapeHtml(str: string) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
