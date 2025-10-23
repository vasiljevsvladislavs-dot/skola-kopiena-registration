// app/api/register/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import nodemailer from "nodemailer";
import { google } from "googleapis";

export const runtime = "nodejs";

/* -------------------- Валидация входа -------------------- */
const schema = z
  .object({
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
  })
  .superRefine((val, ctx) => {
    if (val.about === "other" && (!val.aboutOther || val.aboutOther.trim() === "")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["aboutOther"],
        message: "Lūdzu, precizējiet 'Cits' lauku",
      });
    }
  });

/* -------------------- ENV -------------------- */
const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = Number(process.env.SMTP_PORT || 465);
const SMTP_USER = process.env.SMTP_USER || "rudenskonference@gmail.com";
const SMTP_PASS = process.env.SMTP_PASS || "";

const FROM = process.env.MAIL_FROM || `Reģistrācija <rudenskonference@gmail.com>`;
const ADMIN_TO = process.env.MAIL_ADMIN_TO || "rudenskonference@gmail.com";

const EVENT_NAME =
  process.env.EVENT_NAME ||
  "Skola – kopienā rudens konference “Vide. Skola. Kopiena.”";

const GSHEET_ID = process.env.GSHEET_ID;
const SA_JSON_RAW = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

/* -------------------- Транспорт (Gmail SMTP) -------------------- */
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465,
  auth: { user: SMTP_USER, pass: SMTP_PASS },
});

/* -------------------- Google Sheets -------------------- */
async function appendToSheet(payload: z.infer<typeof schema>) {
  if (!GSHEET_ID || !SA_JSON_RAW) return;
  const creds = JSON.parse(SA_JSON_RAW);
  if (typeof creds?.private_key === "string")
    creds.private_key = creds.private_key.replace(/\\n/g, "\n");

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
        ts,
        payload.fullName,
        payload.email,
        payload.org,
        payload.municipality,
        payload.role,
        aboutMap[payload.about],
        payload.notes || "",
      ]],
    },
  });
}

/* -------------------- Письма -------------------- */
function confirmationSubjectLV() {
  return 'Reģistrācija projekta “Skola – kopienā” rudens konferencei “Vide. Skola. Kopiena.” ir apstiprināta!';
}

// HTML письмо участнику (с гиперссылками)
function confirmationTextLV() {
  return `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.6;color:#111">
      <p>
        Pateicamies par reģistrāciju projekta “Skola – kopienā” rudens
        konferencē “Vide. Skola. Kopiena.”, kas notiks
        <strong>7. novembrī plkst. 11.00</strong>, tiešraidē.
      </p>
      <p>
        Tiešraide būs skatāma projekta
        <a href="https://www.facebook.com/skolakopiena.lv"
           style="color:#4a2961;text-decoration:none;font-weight:500">
          Facebook
        </a>
        lapā un projekta tīmekļvietnē
        <a href="https://www.skola-kopiena.lv/news"
           style="color:#4a2961;text-decoration:none;font-weight:500">
          www.skola-kopiena.lv/news
        </a>.
      </p>
      <p>
        Ja radušies kādi jautājumi, lūdzu, sazinieties ar mums e-pastā
        <a href="mailto:rudenskonference@gmail.com"
           style="color:#4a2961;text-decoration:none;font-weight:500">
          rudenskonference@gmail.com
        </a>
      </p>
      <p>
        Projekta “Skola – kopienā” komanda<br/>
        🌐
        <a href="https://www.skola-kopiena.lv/news"
           style="color:#4a2961;text-decoration:none;font-weight:500">
          www.skola-kopiena.lv/news
        </a>
      </p>
    </div>
  `;
}

// письмо админу
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
  ]
    .filter(Boolean)
    .join("\n");
}

/* -------------------- GET -------------------- */
export async function GET() {
  return NextResponse.json({ ok: true, endpoint: "/api/register", method: "POST" });
}

/* -------------------- POST -------------------- */
export async function POST(req: Request) {
  try {
    const data = await req.json();

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

    try {
      await appendToSheet(p);
    } catch (e) {
      console.error("Sheets error:", e);
    }

    // Письмо участнику (HTML)
    let participantInfo: any = null;
    try {
      participantInfo = await transporter.sendMail({
        from: FROM,
        to: p.email,
        subject: confirmationSubjectLV(),
        html: confirmationTextLV(),
        replyTo: "rudenskonference@gmail.com",
      });
      console.log("GMAIL_PARTICIPANT_MESSAGE_ID", participantInfo?.messageId);
    } catch (e) {
      console.error("GMAIL_PARTICIPANT_ERROR", e);
    }

    // Письмо админу
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
