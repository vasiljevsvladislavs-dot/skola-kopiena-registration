import { NextResponse } from "next/server";
import { z } from "zod";
import nodemailer from "nodemailer";

export const runtime = "nodejs";

/** Валидация входных данных формы */
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

/** ENV */
const SES_HOST = process.env.SES_HOST || "email-smtp.us-east-1.amazonaws.com";
const SES_PORT = Number(process.env.SES_PORT || 587);
const SES_USER = process.env.SES_USER || "";
const SES_PASS = process.env.SES_PASS || "";

const FROM = process.env.MAIL_FROM || "noreply@rudenskonference.lv";
const ADMIN_TO = process.env.MAIL_ADMIN_TO || "info@rudenskonference.lv";
const EVENT_NAME =
  process.env.EVENT_NAME ||
  "Skola – kopienā rudens konference “Vide. Skola. Kopiena.”";

/** Транспорт через Amazon SES (SMTP) */
const transporter = nodemailer.createTransport({
  host: SES_HOST,
  port: SES_PORT,
  secure: SES_PORT === 465, // 465 = SSL, 587 = STARTTLS
  auth: {
    user: SES_USER,
    pass: SES_PASS,
  },
});

/** -------- Email шаблоны (LV) -------- */
function confirmationSubjectLV() {
  return `Paldies par reģistrāciju — ${EVENT_NAME}`;
}

function confirmationTextLV(name: string) {
  // Текст, который вы попросили вернуть 1-в-1, с подстановками
  return [
    "Paldies par reģistrāciju!",
    `\nSveiki, ${name}!`,
    `\nPaldies, ka reģistrējāties ${EVENT_NAME}.`,
    "\nMēs esam saņēmuši jūsu pieteikumu.",
    `\nJautājumu gadījumā rakstiet uz ${ADMIN_TO} .`,
  ].join("\n");
}

function confirmationHtmlLV(name: string) {
  // Небольшая типографика + те же фразы
  return `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;line-height:1.5;color:#111">
    <h2 style="margin:0 0 12px">Paldies par reģistrāciju!</h2>
    <p style="margin:0 0 10px">Sveiki, ${name}!</p>
    <p style="margin:0 0 10px">
      Paldies, ka reģistrējāties <b>${EVENT_NAME}</b>.
    </p>
    <p style="margin:0 0 10px">Mēs esam saņēmuši jūsu pieteikumu.</p>
    <p style="margin:0 0 10px">
      Jautājumu gadījumā rakstiet uz <a href="mailto:${ADMIN_TO}">${ADMIN_TO}</a> .
    </p>
  </div>`;
}

function adminSubjectLV(name: string) {
  return `Jauna reģistrācija — ${name}`;
}

function adminTextLV(payload: any) {
  return [
    "Jauna reģistrācija:",
    `Vārds: ${payload.fullName}`,
    `E-pasts: ${payload.email}`,
    `Organizācija: ${payload.org || ""}`,
    `Amats: ${payload.role || ""}`,
    `Kā uzzināja: ${payload.about}${
      payload.about === "other" ? " — " + (payload.aboutOther || "") : ""
    }`,
    `Piezīmes: ${payload.notes || ""}`,
  ].join("\n");
}

function adminHtmlLV(payload: any) {
  return `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;line-height:1.5;color:#111">
    <h3 style="margin:0 0 12px">Jauna reģistrācija</h3>
    <p style="margin:0 0 6px"><b>Vārds:</b> ${payload.fullName}</p>
    <p style="margin:0 0 6px"><b>E-pasts:</b> ${payload.email}</p>
    <p style="margin:0 0 6px"><b>Organizācija:</b> ${payload.org || ""}</p>
    <p style="margin:0 0 6px"><b>Amats:</b> ${payload.role || ""}</p>
    <p style="margin:0 0 6px"><b>Kā uzzināja:</b> ${payload.about}${
      payload.about === "other" ? " — " + (payload.aboutOther || "") : ""
    }</p>
    <p style="margin:0 0 6px"><b>Piezīmes:</b> ${payload.notes || ""}</p>
  </div>`;
}

/** Для быстрой проверки в браузере */
export async function GET() {
  return NextResponse.json({ ok: true, endpoint: "/api/register", method: "POST" });
}

/** Основной обработчик регистрации */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.errors[0]?.message || "Invalid payload" },
        { status: 400 }
      );
    }
    const p = parsed.data;

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
    } catch (err) {
      console.error("SES_PARTICIPANT_ERROR", err);
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
    } catch (err) {
      console.error("SES_ADMIN_ERROR", err);
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
