import { NextResponse } from "next/server";
import { z } from "zod";
import { Resend } from "resend";

// <— если хочешь красивые шаблоны, можешь подключить позже
// import { confirmationHtmlLV, adminHtmlLV } from "../../../lib/email-lv";

export const runtime = "nodejs";

// схема тела запроса
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

// env
const resendApiKey = process.env.RESEND_API_KEY;
const FROM = process.env.MAIL_FROM || "info@rudenskonference.lv";
const ADMIN_TO = process.env.MAIL_ADMIN_TO || "info@rudenskonference.lv";
const EVENT_NAME =
  process.env.EVENT_NAME ||
  "“Skola – kopienā” rudens konference “Vide. Skola. Kopiena.”";

const resend = resendApiKey ? new Resend(resendApiKey) : null;

// примитивные html/текст (без внешних импортов — надёжно)
function confirmationHtml(name: string) {
  return `<div style="font-family:system-ui,Arial">
    <h2>Reģistrācija apstiprināta 🎉</h2>
    <p>Sveiki, ${name}! Paldies par reģistrāciju: <b>${EVENT_NAME}</b>.</p>
    <p>Ja ir jautājumi, rakstiet: ${ADMIN_TO}</p>
  </div>`;
}
function adminHtml(payload: any) {
  return `<div style="font-family:system-ui,Arial">
    <h3>Jauna reģistrācija</h3>
    <p><b>Vārds:</b> ${payload.fullName}</p>
    <p><b>E-pasts:</b> ${payload.email}</p>
    <p><b>Organizācija:</b> ${payload.org || ""}</p>
    <p><b>Amats:</b> ${payload.role || ""}</p>
    <p><b>Kā uzzināja:</b> ${payload.about}${payload.about === "other" ? " — " + (payload.aboutOther || "") : ""}</p>
    <p><b>Piezīmes:</b> ${payload.notes || ""}</p>
  </div>`;
}

export async function GET() {
  // чтобы в браузере по GET было понятно, что всё живо
  return NextResponse.json({ ok: true, endpoint: "/api/register", use: "POST" });
}

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.errors[0]?.message || "Invalid payload" },
        { status: 400 }
      );
    }
    const p = parsed.data;

    // ЛОГИ — чтобы увидеть в Vercel Function Logs
    console.log("REGISTER_START", {
      hasResend: !!resend,
      FROM,
      ADMIN_TO
    });

    // ——— отправка 2х писем (если есть ключ)
    let r1: any = null, r2: any = null;
    if (resend) {
      try {
        r1 = await resend.emails.send({
          from: `Reģistrācija <${FROM}>`,
          to: [p.email],
          subject: `Reģistrācija apstiprināta — ${EVENT_NAME}`,
          html: confirmationHtml(p.fullName),
          text: `Sveiki, ${p.fullName}! Paldies par reģistrāciju: ${EVENT_NAME}. Ja ir jautājumi, rakstiet: ${ADMIN_TO}`,
          replyTo: ADMIN_TO,
        });
        console.log("RESEND_PARTICIPANT_ID", r1?.id || r1);
      } catch (e) {
        console.error("RESEND_PARTICIPANT_ERROR", e);
      }

      try {
        r2 = await resend.emails.send({
          from: `Reģistrācija <${FROM}>`,
          to: [ADMIN_TO],
          subject: `Jauna reģistrācija — ${p.fullName}`,
          html: adminHtml(p),
          text: `Jauna reģistrācija: ${p.fullName}, ${p.email}`,
          replyTo: p.email,
        });
        console.log("RESEND_ADMIN_ID", r2?.id || r2);
      } catch (e) {
        console.error("RESEND_ADMIN_ERROR", e);
      }
    } else {
      console.error("NO_RESEND_API_KEY");
    }

    // Если нужно — тут вернём Google Sheets позже (сейчас важно увидеть письма)

    return NextResponse.json({
      ok: true,
      mail: {
        participantId: r1?.id || null,
        adminId: r2?.id || null,
        hasResend: !!resend,
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
