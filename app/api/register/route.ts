// app/api/register/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import nodemailer from "nodemailer";
import { google } from "googleapis";

export const runtime = "nodejs";

/* -------------------- Валидация входа -------------------- */
// Обязательные: fullName, email, org, municipality, role, about, consent=true
// Если about=other — обязателен aboutOther
const schema = z.object({
  fullName: z.string().trim().min(2, "Lūdzu, ievadiet vārdu un uzvārdu"),
  email: z.string().trim().email("Nederīga e-pasta adrese"),
  org: z.string().trim().min(1, "Lūdzu, ievadiet iestādi / organizāciju"),
  municipality: z.string().trim().min(1, "Lūdzu, ievadiet pašvaldību"),
  role: z.string().trim().min(1, "Lūdzu, ievadiet amatu"),
  about: z.enum(["site", "social", "friends", "other"], {
    required_error: "Lūdzu, izvēlieties variantu",
  }),
  aboutOther: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  consent: z.literal(true, {
    errorMap: () => ({ message: "Nepieciešama piekrišana" }),
  }),
}).superRefine((val, ctx) => {
  if (val.about === "other" && (!val.aboutOther || val.aboutOther.trim() === "")) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["aboutOther"],
      message: "Lūdzu, precizējiet 'Cits' lauku",
    });
  }
});

/* -------------------- ENV -------------------- */
// Gmail SMTP
const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = Number(process.env.SMTP_PORT || 465);
const SMTP_USER = process.env.SMTP_USER || "rudenskonference@gmail.com";
const SMTP_PASS = process.env.SMTP_PASS || ""; // App Password

// От кого и куда шлём
const FROM = process.env.MAIL_FROM || `Reģistrācija <rudenskonference@gmail.com>`;
const ADMIN_TO = process.env.MAIL_ADMIN_TO || "rudenskonference@gmail.com";

// (используется только в письме админу)
const EVENT_NAME =
  process.env.EVENT_NAME ||
  "Skola – kopienā rudens konference “Vide. Skola. Kopiena.”";

// Google Sheets (опционально)
const GSHEET_ID = process.env.GSHEET_ID;
const SA_JSON_RAW = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

/* -------------------- Транспорт (Gmail SMTP) -------------------- */
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465, // Gmail рекомендует 465/SSL
  auth: { user: SMTP_USER, pass: SMTP_PASS },
});

/* -------------------- Google Sheets (опционально) -------------------- */
async function appendToSheet(payload: z.infer<typeof schema>) {
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
  const aboutMap: Record<z.infer<typeof schema>["about"], string> = {
    site: 'Projekta “Skola – kopiena” mājaslapā',
    social: 'Projekta “Skola – kopiena” sociālajos tīklos (Facebook, Instagram)',
    friends: 'No kolēģiem / draugiem',
    other: `Cits: ${payload.aboutOther || ""}`,
  };

  await sheets.spreadsheets.values.append({
    spreadsheetId: GSHEET_ID,
    range: "A:H",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[
        ts,                         // A – Timestamp
        payload.fullName,           // B – Vārds, uzvārds
        payload.email,              // C – E-pasts
        payload.org,                // D – Organizācija
        payload.municipality,       // E – Pašvaldība
        payload.role,               // F – Amats
        aboutMap[payload.about],    // G – Kā uzzināja
        payload.notes || "",        // H – Piezīmes
      ]],
    },
  });
}

/* -------------------- Письма -------------------- */
// Тема/тексты для участника — ровно как согласовано
function confirmationSubjectLV() {
  return "Reģistrācija projekta “Skola – kopienā” rudens konferencei “Vide. Skola. Kopiena.” ir apstiprināta!";
}

function confirmationTextLV() {
  return [
    "Pateicamies par reģistrāciju projekta “Skola – kopienā” rudens konferencē “Vide. Skola. Kopiena.”, kas notiks 7. novembrī plkst. 11.00, tiešraidē.",
    "Tiešraide būs skatāma projekta Facebook lapā (https://www.facebook.com/skolakopiena.lv) un projekta tīmekļvietnē www.skola-kopiena.lv.",
    "",
    "Ja radušies kādi jautājumi, lūdzu, sazinieties ar mums e-pastā rudenskonference@gmail.com",
    "",
    "Projekta “Skola – kopienā” komanda",
    "🌐 www.skola-kopiena.lv/news",
  ].join("\n");
}

// Админу: чёткое резюме заявки
function adminSubjectLV(name: string) {
  return `Jauna reģistrācija — ${name}`;
}
function adminTextLV(p: z.infer<typeof schema>) {
  const aboutReadable =
    p.about === "site"
      ? 'Projekta “Skola – kopiena” mājaslapā'
      : p.about === "social"
      ? 'Projekta “Skola – kopiena” sociālajos tīklos (Facebook, Instagram)'
      : p.about === "friends"
      ? "No kolēģiem / draugiem"
      : `Cits — ${p.aboutOther || ""}`;

  return [
    `Pasākums: ${EVENT_NAME}`,
    "— — —",
    `Vārds: ${p.fullName}`,
    `E-pasts: ${p.email}`,
    `Iestāde/organizācija: ${p.org}`,
    `Pašvaldība: ${p.municipality}`,
    `Amats: ${p.role}`,
    `Kā uzzināja: ${aboutReadable}`,
    p.notes ? `Piezīmes: ${p.notes}` : "",
  ].filter(Boolean).join("\n");
}

/* -------------------- Проверка GET -------------------- */
export async function GET() {
  return NextResponse.json({ ok: true, endpoint: "/api/register", method: "POST" });
}

/* -------------------- Основной POST -------------------- */
export async function POST(req: Request) {
  try {
    const data = await req.json();

    // Тримминг и строгая валидация
    const parsed = schema.safeParse({
      ...data,
      fullName: String(data.fullName || "").trim(),
      email: String(data.email || "").trim(),
      org: String(data.org || "").trim(),
      municipality: String(data.municipality || "").trim(),
      role: String(data.role || "").trim(),
      about: data.about,
      aboutOther: String(data.aboutOther || "").trim(),
      notes: String(data.notes || "").trim(),
      consent: Boolean(data.consent),
    });

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.errors[0]?.message || "Invalid payload" },
        { status: 400 }
      );
    }
    const p = parsed.data;

    // 0) Google Sheets (не валим запрос при ошибке)
    try { await appendToSheet(p); } catch (e) { console.error("Sheets error:", e); }

    // 1) Письмо участнику
    let participantInfo: any = null;
    try {
      participantInfo = await transporter.sendMail({
        from: FROM, // "Reģistrācija <rudenskonference@gmail.com>"
        to: p.email,
        subject: confirmationSubjectLV(),
        text: confirmationTextLV(),
        replyTo: "rudenskonference@gmail.com",
      });
      console.log("GMAIL_PARTICIPANT_MESSAGE_ID", participantInfo?.messageId);
    } catch (e) {
      console.error("GMAIL_PARTICIPANT_ERROR", e);
    }

    // 2) Письмо админу
    let adminInfo: any = null;
    try {
      adminInfo = await transporter.sendMail({
        from: FROM,
        to: ADMIN_TO,
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
