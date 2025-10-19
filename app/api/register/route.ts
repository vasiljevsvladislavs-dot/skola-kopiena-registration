import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { z } from "zod";
import { Resend } from "resend";
import { confirmationHtmlLV, adminHtmlLV } from "../../../lib/email-lv";
import { google } from "googleapis";

const schema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  org: z.string().optional(),
  role: z.string().optional(),
  about: z.enum(["site","social","friends","other"]),
  aboutOther: z.string().optional(),
  notes: z.string().optional(),
  consent: z.boolean(),
});

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.MAIL_FROM || "info@rudenskonference.lv";
const ADMIN_TO = process.env.MAIL_ADMIN_TO || "info@rudenskonference.lv";
const EVENT_NAME = process.env.EVENT_NAME || "“Skola – kopienā” rudens konference “Vide. Skola. Kopiena.”";

async function appendToSheet(payload: any) {
  const SHEET_ID = process.env.GSHEET_ID;
  const SA_JSON = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!SHEET_ID || !SA_JSON) return;

  const creds = JSON.parse(SA_JSON);
  if (creds.private_key && typeof creds.private_key === "string") {
    creds.private_key = creds.private_key.replace(/\\n/g, "\n");
  }

  const auth = new google.auth.JWT(
    creds.client_email,
    undefined,
    creds.private_key,
    ["https://www.googleapis.com/auth/spreadsheets"]
  );
  await auth.authorize();
  const sheets = google.sheets({ version: "v4", auth });

  const ts = new Date().toISOString();
  const aboutMap: Record<string,string> = {
    site: "Projekta “Skola – kopiena” mājaslapā",
    social: "Projekta “Skola – kopiena” sociālajos tīklos (Facebook, Instagram)",
    friends: "No kolēģiem / draugiem",
    other: `Cits: ${payload.aboutOther || ""}`,
  };

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: "A:G",
    valueInputOption: "RAW",
    requestBody: { values: [[
      ts,
      payload.fullName,
      payload.email,
      payload.org || "",
      payload.role || "",
      aboutMap[payload.about] || "",
      payload.notes || "",
    ]]},
  });
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      return new NextResponse(parsed.error.errors[0]?.message || "Invalid payload", { status: 400 });
    }
    const p = parsed.data;

    try { await appendToSheet(p); } catch (e) { console.error("Sheets error", e); }

    // 1) письмо участнику (автоответ)
const r1 = await resend.emails.send({
  from: `Reģistrācija <${FROM}>`,                  // "Reģistrācija <info@rudenskonference.lv>"
  to: [p.email],                                   // массив надёжнее
  subject: `Reģistrācija apstiprināta — ${EVENT_NAME}`,
  html: confirmationHtmlLV({ name: p.fullName, eventName: EVENT_NAME }),
  text: `Sveiki, ${p.fullName}!\nPaldies, ka reģistrējāties ${EVENT_NAME}.\n` +
        `Ja ir jautājumi, rakstiet: info@rudenskonference.lv\nrudenskonference.lv`,
  reply_to: ADMIN_TO,                              // ответ участника попадёт организатору
});

// 2) письмо организатору (уведомление)
const r2 = await resend.emails.send({
  from: `Reģistrācija <${FROM}>`,
  to: [ADMIN_TO],
  subject: `Jauna reģistrācija — ${p.fullName}`,
  html: adminHtmlLV(p),
  text: `Jauna reģistrācija:\nVārds: ${p.fullName}\nE-pasts: ${p.email}`,
  headers: { "Reply-To": p.email },                // удобно сразу ответить участнику
});

// временно логируем, чтобы проверить, что Resend принял письма
console.log("Resend IDs:", { participant: (r1 as any)?.id, admin: (r2 as any)?.id });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error(e);
    return new NextResponse(e?.message || "Server error", { status: 500 });
  }
}
