import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const to = url.searchParams.get("to");
    if (!to) return NextResponse.json({ ok: false, error: "Provide ?to=email" }, { status: 400 });

    const transport = nodemailer.createTransport({
      host: process.env.SES_HOST || "email-smtp.us-east-1.amazonaws.com",
      port: Number(process.env.SES_PORT || 587),
      secure: false,
      auth: {
        user: process.env.SES_USER!,
        pass: process.env.SES_PASS!
      }
    });

    const FROM = process.env.MAIL_FROM || "noreply@rudenskonference.lv";

    const r = await transport.sendMail({
      from: `Test SES <${FROM}>`,
      to,
      subject: "SES SMTP test",
      text: "Hello from Amazon SES via SMTP"
    });

    return NextResponse.json({ ok: true, provider: "ses-smtp", messageId: r.messageId || null });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
