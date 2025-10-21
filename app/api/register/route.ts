// app/api/register/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import nodemailer from "nodemailer";
import { google } from "googleapis";

export const runtime = "nodejs";

/* -------------------- Валидация -------------------- */
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
const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = Number(process.env.SMTP_PORT || 465);
const SMTP_USER = process.env.SMTP_USER || "rudenskonference@gmail.com";

const FROM =
  process.env.MAIL_FROM || `Reģistrācija <rudenskonference@gmail.com>`;
const ADMIN_TO =
  process.env.MAIL_ADMIN_TO || "rudenskonference@gmail.com";

const EVENT_NAME =
  process.env.EVENT_NAME ||
  "Skola – kopienā rudens konference “Vide. Skola. Kopiena.”";

const GSHEET_ID = process.env.GSHEET_ID;
const SA_JSON_RAW = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

/* -------------------- Транспорт -------------------- */
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465,
  auth: {
    user: SMTP_USER,
    pass: process.env.SMTP_PASS, // 🔒 читается только из среды (не хранится в коде)
  },
});

/* -------------------- Google Sheets -------------------- */
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

/* -------------------- Email -------------------- */
function confirmationSubjectLV() {
  return `Paldies par reģistrāciju — ${EVENT_NAME}`;
}

function confirmationTextLV(name: string) {
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

/* -------------------- Обработчики -------------------- */
export async function GET() {
  return NextResponse.json({ ok: true });
}

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
    try { await appendToSheet(p); } catch (e) { console.error("Sheets error:", e); }

    const participantInfo = await transporter.sendMail({
      from: FROM,
      to: p.email,
      subject: confirmationSubjectLV(),
      text: confirmationTextLV(p.fullName),
      replyTo: "rudenskonference@gmail.com",
    });

    const adminInfo = await transporter.sendMail({
      from: FROM,
      to: ADMIN_TO,
      subject: adminSubjectLV(p.fullName),
      text: adminTextLV(p),
      replyTo: "rudenskonference@gmail.com",
    });

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
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
