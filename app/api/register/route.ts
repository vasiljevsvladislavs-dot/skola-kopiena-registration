import { NextResponse } from "next/server";
import { z } from "zod";
import nodemailer from "nodemailer";

export const runtime = "nodejs";

// Валидация входных данных
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

// ENV
const SES_HOST = process.env.SES_HOST || "email-smtp.us-east-1.amazonaws.com";
const SES_PORT = Number(process.env.SES_PORT || 587);
const SES_USER = process.env.SES_USER!;
const SES_PASS = process.env.SES_PASS!;
const FROM = process.env.MAIL_FROM || "noreply@rudenskonference.lv";
const ADMIN_TO = process.env.MAIL_ADMIN_TO || "info@rudenskonference.lv";
const EVENT_NAME =
  process.env.EVENT_NAME ||
  "“Skola – kopienā” rudens konference “Vide. Skola. Kopiena.”";

// SMTP транспорт Amazon SES
function makeSesTransport() {
  if (!SES_USER || !SES_PASS) throw new Error("SES SMTP creds missing");
  return nodemailer.createTransport({
    host: SES_HOST,
    port: SES_PORT,
    secure: false, // 587 = STARTTLS
    auth: { user: SES_USER, pass: SES_PASS }
  });
}

// Простые HTML шаблоны
function confirmationHtml(name: string) {
  return `<div style="font-family:system-ui,Arial">
    <h2>Reģistrācija apstiprināta 🎉</h2>
    <p>Sveiki, ${name}! Paldies par reģistrāciju: <b>${EVENT_NAME}</b>.</p>
    <p>Ja ir jautājumi, rakstiet: ${ADMIN_TO}</p>
  </div>`;
}
function adminHtml(p: any) {
  return `<div style="font-family:system-ui,Arial">
    <h3>Jauna reģistrācija</h3>
    <p><b>Vārds:</b> ${p.fullName}</p>
    <p><b>E-pasts:</b> ${p.email}</p>
    <p><b>Organizācija:</b> ${p.org || ""}</p>
    <p><b>Amats:</b> ${p.role || ""}</p>
    <p><b>Kā uzzināja:</b> ${p.about}${p.about === "other" ? " — " + (p.aboutOther || "") : ""}</p>
    <p><b>Piezīmes:</b> ${p.notes || ""}</p>
  </div>`;
}

// GET для понятного ответа в браузере
export async function GET() {
  return NextResponse.json({ ok: true, endpoint: "/api/register", use: "POST" });
}

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

    const transport = makeSesTransport();

    // 1) Участнику
    let r1: any = null;
    try {
      r1 = await transport.sendMail({
        from: `Reģistrācija <${FROM}>`,
        to: p.email,
        subject: `Reģistrācija apstiprināta — ${EVENT_NAME}`,
        html: confirmationHtml(p.fullName),
        text: `Sveiki, ${p.fullName}! Paldies par reģistrāciju: ${EVENT_NAME}. Ja ir jautājumi, rakstiet: ${ADMIN_TO}`,
        replyTo: ADMIN_TO
      });
      console.log("SES_PARTICIPANT_MESSAGE_ID", r1?.messageId);
    } catch (e) {
      console.error("SES_PARTICIPANT_ERROR", e);
    }

    // 2) Админу
    let r2: any = null;
    try {
      r2 = await transport.sendMail({
        from: `Reģistrācija <${FROM}>`,
        to: ADMIN_TO,
        subject: `Jauna reģistrācija — ${p.fullName}`,
        html: adminHtml(p),
        text: `Jauna reģistrācija: ${p.fullName}, ${p.email}`,
        replyTo: p.email
      });
      console.log("SES_ADMIN_MESSAGE_ID", r2?.messageId);
    } catch (e) {
      console.error("SES_ADMIN_ERROR", e);
    }

    return NextResponse.json({
      ok: true,
      mail: {
        participantMessageId: r1?.messageId || null,
        adminMessageId: r2?.messageId || null,
        provider: "ses-smtp"
      }
    });
  } catch (e: any) {
    console.error("REGISTER_FATAL", e);
    return NextResponse.json(
      { ok: false, error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}
