import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { z } from "zod";
import { Resend } from "resend";
import { confirmationHtmlLV, adminHtmlLV } from "../../../lib/email-lv";
import { google } from "googleapis";

// === Валидация входящих данных ===
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

// === Env ===
const resendApiKey = process.env.RESEND_API_KEY;
const FROM = process.env.MAIL_FROM || "info@rudenskonference.lv";
const ADMIN_TO = process.env.MAIL_ADMIN_TO || "info@rudenskonference.lv";
const EVENT_NAME =
  process.env.EVENT_NAME ||
  "“Skola – kopienā” rudens konference “Vide. Skola. Kopiena.”";

// === Клиент Resend ===
const resend = new Resend(resendApiKey);

// === Запись в Google Sheets (как было) ===
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
    ]]}
  });
}

export async function POST(req: NextRequest) {
  try {
    // Проверка ключа Resend: если нет — не пытаемся слать письма
    if (!resendApiKey) {
      console.error("RESEND_API_KEY is missing");
      return new NextResponse("Email disabled: missing RESEND_API_KEY", { status: 503 });
    }

    // Чтение и валидация входа
    const data = await req.json();
    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      return new NextResponse(parsed.error.errors[0]?.message || "Invalid payload", { status: 400 });
    }
    const p = parsed.data;

    // Запись в Google Sheets — ошибки не ломают регистрацию
    try { await appendToSheet(p); } catch (e) { console.error("Sheets error", e); }

    // === Отправка двух писем (параллельно) ===
    const participantEmail = resend.emails.send({
      from: `Reģistrācija <${FROM}>`,
      to: [p.email],
      subject: `Reģistrācija apstiprināta — ${EVENT_NAME}`,
      html: confirmationHtmlLV({ name: p.fullName, eventName: EVENT_NAME }),
      text:
        `Sveiki, ${p.fullName}!\n` +
        `Paldies, ka reģistrējāties ${EVENT_NAME}.\n` +
        `Ja ir jautājumi, rakstiet: ${ADMIN_TO}\n` +
        `rudenskonference.lv`,
      replyTo: ADMIN_TO,
    });

    const adminEmail = resend.emails.send({
      from: `Reģistrācija <${FROM}>`,
      to: [ADMIN_TO],
      subject: `Jauna reģistrācija — ${p.fullName}`,
      html: adminHtmlLV(p),
      text:
        `Jauna reģistrācija:\n` +
        `Vārds: ${p.fullName}\n` +
        `E-pasts: ${p.email}`,
      replyTo: p.email,
    });

    const [r1, r2] = await Promise.all([participantEmail, adminEmail]);

    // === ЯВНА ПРОВЕРКА ОШИБОК RESEND ===
    const e1 = (r1 as any)?.error;
    const e2 = (r2 as any)?.error;
    if (e1 || e2) {
      console.error("RESEND_SEND_ERROR", { e1, e2 });
      return NextResponse.json({ ok: false, e1, e2 }, { status: 502 });
    }

    console.log("Resend IDs:", { participant: (r1 as any)?.id, admin: (r2 as any)?.id });
    return NextResponse.json({ ok: true });

  } catch (e: any) {
    console.error("REGISTER_API_ERROR", e);
    return new NextResponse(e?.message || "Server error", { status: 500 });
  }
}
