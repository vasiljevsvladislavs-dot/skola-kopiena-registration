// app/api/register/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import nodemailer from "nodemailer";
import { google } from "googleapis";

export const runtime = "nodejs";

/* -------------------- Валидация входа -------------------- */
const schema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  org: z.string().optional(),
  role: z.string().optional(),
  about: z.enum(["site", "social", "friends", "other"]),
  aboutOther: z.string().optional(),
  notes: z.string().optional(),
  consent: z.boolean(),
});

/* -------------------- ENV -------------------- */
/** Gmail SMTP (используем только его) */
const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = Number(process.env.SMTP_PORT || 465);
const SMTP_USER = process.env.SMTP_USER || "rudenskonference@gmail.com";
const SMTP_PASS = process.env.SMTP_PASS || "bzyolvcsguvhheel "; // 16-символьный App Password

/** От кого и куда шлём */
const FROM =
  process.env.MAIL_FROM || `Reģistrācija <rudenskonference@gmail.com>`;
const ADMIN_TO =
  process.env.MAIL_ADMIN_TO || "rudenskonference@gmail.com";

/** Текст мероприятия */
const EVENT_NAME =
  process.env.EVENT_NAME ||
  "Skola – kopienā rudens konference “Vide. Skola. Kopiena.”";

/** Google Sheets (опционально; можно оставить пустыми — тогда запись пропустится) */
const GSHEET_ID = process.env.GSHEET_ID; // ID таблицы
const SA_JSON_RAW = process.env.GOOGLE_SERVICE_ACCOUNT_JSON; // JSON сервис-аккаунта (одной строкой)

/* -------------------- Транспорт (Gmail SMTP) -------------------- */
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465, // 465 = SSL, 587 = STARTTLS (для Gmail лучше 465)
  auth: { user: SMTP_USER, pass: SMTP_PASS },
});

/* -------------------- Google Sheets (опционально) -------------------- */
async function appendToSheet(payload: any) {
  if (!GSHEET_ID || !SA_JSON_RAW) return;

  const creds = JSON.parse(SA_JSON_RAW);
  if (typeof creds?.private_key === "string") {
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
  const aboutMap: Record<string, string> = {
    site: 'Projekta “Skola – kopiena” mājaslapā',
    social: 'Projekta “Skola – kopiena” sociālajos tīklos (Facebook, Instagram)',
    friends: 'No kolēģiem / draugiem',
    other: `Cits: ${payload.aboutOther || ""}`,
  };

  await sheets.spreadsheets.values.append({
    spreadsheetId: GSHEET_ID,
    range: "A:G",
    valueInputOption: "RAW",
    requestBody: {
      values: [[
        ts,
        payload.fullName,
        payload.email,
        payload.org || "",
        payload.role || "",
        aboutMap[payload.about] || "",
        payload.notes || "",
      ]],
    },
  });
}

/* -------------------- Шаблоны писем -------------------- */
function confirmationSubjectLV() {
  return `Paldies par reģistrāciju — ${EVENT_NAME}`;
}

function confirmationTextLV(name: string) {
  // ТОЛЬКО текст — чтобы гос-домены принимали надёжнее
  return [
    "Paldies par reģistrāciju!",
    `Sveiki, ${name}!`,
    `Paldies, ka reģistrējāties ${EVENT_NAME}.`,
    "Mēs esam saņēmuši jūsu pieteikumu.",
    `Jautājumu gadījumā rakstiet uz rudenskonference@gmail.com`,
  ].join("\n\n");
}

function adminSubjectLV(name: string) {
  return `Jauna reģistrācija — ${name}`;
}

function adminTextLV(p: any) {
  return [
    "Jauna reģistrācija:",
    `Vārds: ${p.fullName}`,
    `E-pasts: ${p.email}`,
    `Organizācija: ${p.org || ""}`,
    `Amats: ${p.role || ""}`,
    `Kā uzzināja: ${p.about}${p.about === "other" ? " — " + (p.aboutOther || "") : ""}`,
    `Piezīmes: ${p.notes || ""}`,
  ].join("\n");
}

/* -------------------- Проверка GET -------------------- */
export async function GET() {
  return NextResponse.json({ ok: true, endpoint: "/api/register", method: "POST" });
}

/* -------------------- Основной POST -------------------- */
export async function POST(req: Request) {
  try {
    const data = await req.json();
    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.errors[0]?.message || "Invalid payload" },
        { status: 400 }
      );
    }
    const p = parsed.data;

    // 0) Пишем в Google Sheets (не валим запрос при ошибке)
    try { await appendToSheet(p); } catch (e) { console.error("Sheets error:", e); }

    // 1) Письмо участнику
    let participantInfo: any = null;
    try {
      participantInfo = await transporter.sendMail({
        from: FROM,                      // Gmail-адрес
        to: p.email,                     // участнику
        subject: confirmationSubjectLV(),
        text: confirmationTextLV(p.fullName),
        replyTo: "rudenskonference@gmail.com",
      });
      console.log("GMAIL_PARTICIPANT_MESSAGE_ID", participantInfo?.messageId);
    } catch (e) {
      console.error("GMAIL_PARTICIPANT_ERROR", e);
    }

    // 2) Письмо админу (на тот же Gmail)
    let adminInfo: any = null;
    try {
      adminInfo = await transporter.sendMail({
        from: FROM,
        to: ADMIN_TO,                    // rudenskonference@gmail.com
        subject: adminSubjectLV(p.fullName),
        text: adminTextLV(p),
        replyTo: "rudenskonference@gmail.com",
      });
      console.log("GMAIL_ADMIN_MESSAGE_ID", adminInfo?.messageId);
    } catch (e) {
      console.error("GMAIL_ADMIN_ERROR", e);
    }

    return NextResponse.json({
      ok: true,
      mail: {
        participantMessageId: participantInfo?.messageId || null,
        adminMessageId: adminInfo?.messageId || null,
        provider: "gmail-smtp",
      },
    });
  } catch (e: any) {
    console.error("REGISTER_FATAL", e);
    return NextResponse.json(
      { ok: false, error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}
