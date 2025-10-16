# Reģistrācijas lapa (LV) — e‑pasts + Google Sheets

## Kas iekšā
- LV forma (Next.js 14 + Tailwind)
- `/api/register` sūta e‑pastus (Resend Hosted Domain) un pieraksta rindas Google Sheets

## Soļi Vercel
1) Importē projektu Vercel (vai ielādē ZIP).
2) Project → Settings → Environment Variables → pievieno:
   - `RESEND_API_KEY` — Resend API key
   - `MAIL_FROM` — pagaidām `noreply@onresend.com` (vēlāk nomainīsi uz savu domēnu)
   - `MAIL_ADMIN_TO` — Gmail, kur sūtīt kopiju
   - `EVENT_NAME` — nosaukums
   - `GOOGLE_SERVICE_ACCOUNT_JSON` — *pilns* Service Account JSON vienā rindā
   - `GSHEET_ID` — tava Sheet ID
3) Deploy. Aizpildi formu → pārbaudi e‑pastu un Sheet ierakstu.

### Google Service Account īsi
- Google Cloud Console → izveido Service Account
- Ieslēdz “Google Sheets API” projektam
- Lejupielādē JSON (service account key)
- Atver attiecīgo Google Sheet → Share → pievieno `client_email` no JSON ar Editor tiesībām
- Ievieto JSON saturu `.env` mainīgajā `GOOGLE_SERVICE_ACCOUNT_JSON` (vienā rindā).

### Kur ko labot
- Forma: `app/page.tsx`
- API (e‑pasti + Sheets): `app/api/register/route.ts`
- LV e‑pasta šabloni: `lib/email-lv.ts`

