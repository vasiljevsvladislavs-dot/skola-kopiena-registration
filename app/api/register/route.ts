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
const SES_HOST = process.env.SES_HOST || "email-smtp.us-east-1.amazonaws.com";
const SES_PORT = Number(process.env.SES_PORT || 587);
const SES_USER = process.env.SES_USER || "";
const SES_PASS = process.env.SES_PASS || "";

const FROM = process.env.MAIL_FROM || "noreply@rudenskonference.lv";
const ADMIN_TO = process.env.MAIL_ADMIN_TO || "info@rudenskonference.lv";
const EVENT_NAME =
  process.env.EVENT_NAME ||
  "Skola – kopienā rudens konference “Vide. Skola. Kopiena.”";

const GSHEET_ID = process.env.GSHEET_ID; // ID таблицы
const SA_JSON_RAW = process.env.GOOGLE_SERVICE_ACCOUNT_JSON; // строка JSON ключа

/* -------------------- SMTP (SES) -------------------- */
const transporter = nodemailer.createTransport({
  host: SES_HOST,
  port: SES_PORT,
  secure: SES_PORT === 465, // 465 = SSL, 587 = STARTTLS
  auth: { user: SES_USER, pass: SES_PASS },
});

/* -------------------- Google Sheets -------------------- */
async function appendToSheet(payload: any) {
  if (!GSHEET_ID || !SA_JSON_RAW) return;

  // ключ приходит как строка JSON; \n в приватном ключе нужно "разэкранировать"
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
    range: "A:G", // первая свободная строка, колонки A..G
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

/* -------------------- Email шаблоны (LV) -------------------- */
function confirmationSubjectLV() {
  return `Paldies par reģistrāciju — ${EVENT_NAME}`;
}

function confirmationTextLV(name: string) {
  return [
    "Paldies par reģistrāciju!",
    `\nSveiki, ${name}!`,
    `\nPaldies, ka reģistrējāties ${EVENT_NAME}.`,
    "\nMēs esam saņēmuši jūsu pieteikumu.",
    `\nJautājumu gadījumā rakstiet uz ${ADMIN_TO} .`,
  ].join("\n");
}

function confirmationHtmlLV(name: string) {
  return `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;line-height:1.5;color:#111">
    <h2 style="margin:0 0 12px">Paldies par reģistrāciju!</h2>
    <p style="margin:0 0 10px">Sveiki, ${name}!</p>
    <p style="margin:0 0 10px">Paldies, ka reģistrējāties <b>${EVENT_NAME}</b>.</p>
    <p style="margin:0 0 10px">Mēs esam saņēmuši jūsu pieteikumu.</p>
    <p style="margin:0 0 10px">Jautājumu gadījumā rakstiet uz <a href="mailto:${ADMIN_TO}">${ADMIN_TO}</a> .</p>
  </div>`;
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

function adminHtmlLV(p: any) {
  return `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;line-height:1.5;color:#111">
    <h3 style="margin:0 0 12px">Jauna reģistrācija</h3>
    <p style="margin:0 0 6px"><b>Vārds:</b> ${p.fullName}</p>
    <p style="margin:0 0 6px"><b>E-pasts:</b> ${p.email}</p>
    <p style="margin:0 0 6px"><b>Organizācija:</b> ${p.org || ""}</p>
    <p style="margin:0 0 6px"><b>Amats:</b> ${p.role || ""}</p>
    <p style="margin:0 0 6px"><b>Kā uzzināja:</b> ${p.about}${p.about === "other" ? " — " + (p.aboutOther || "") : ""}</p>
    <p style="margin:0 0 6px"><b>Piezīmes:</b> ${p.notes || ""}</p>
  </div>`;
}

/* -------------------- Для проверки -------------------- */
export async function GET() {
  return NextResponse.json({ ok: true, endpoint: "/api/register", method: "POST" });
}

/* -------------------- Основной обработчик -------------------- */
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

    // 0) Пишем в Google Sheets (не валим запрос из-за этой части)
    try { await appendToSheet(p); } catch (e) { console.error("Sheets error:", e); }

    // 1) Письмо участнику
    let participantInfo: any = null;
    try {
      participantInfo = await transporter.sendMail({
        from: `Reģistrācija <${FROM}>`,
        to: p.email,
        subject: confirmationSubjectLV(),
        text: confirmationTextLV(p.fullName),
        html: confirmationHtmlLV(p.fullName),
        replyTo: ADMIN_TO,
      });
      console.log("SES_PARTICIPANT_MESSAGE_ID", participantInfo?.messageId);
    } catch (e) {
      console.error("SES_PARTICIPANT_ERROR", e);
    }

    // 2) Письмо администратору
    let adminInfo: any = null;
    try {
      adminInfo = await transporter.sendMail({
        from: `Reģistrācija <${FROM}>`,
        to: ADMIN_TO,
        subject: adminSubjectLV(p.fullName),
        text: adminTextLV(p),
        html: adminHtmlLV(p),
        replyTo: p.email,
      });
      console.log("SES_ADMIN_MESSAGE_ID", adminInfo?.messageId);
    } catch (e) {
      console.error("SES_ADMIN_ERROR", e);
    }

    return NextResponse.json({
      ok: true,
      mail: {
        participantMessageId: participantInfo?.messageId || null,
        adminMessageId: adminInfo?.messageId || null,
        provider: "ses-smtp",
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
