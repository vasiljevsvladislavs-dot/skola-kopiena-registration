import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY!;
const FROM = process.env.MAIL_FROM || "info@rudenskonference.lv";
const ADMIN_TO = process.env.MAIL_ADMIN_TO || "info@rudenskonference.lv";

const resend = new Resend(RESEND_API_KEY);

// Защита от зависаний — обрываем через 8с
function withTimeout<T>(p: Promise<T>, ms = 8000) {
  return Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error("TIMEOUT")), ms)),
  ]);
}

export async function POST(req: NextRequest) {
  try {
    if (!RESEND_API_KEY) {
      return new NextResponse("Missing RESEND_API_KEY", { status: 503 });
    }

    const body = await req.json().catch(() => ({}));
    const name = String(body?.fullName ?? "Bez vārda");
    const email = String(body?.email ?? "—");

    const r = await withTimeout(
      resend.emails.send({
        from: `Reģistrācija <${FROM}>`,
        to: [ADMIN_TO],
        subject: `TEST: Jauna reģistrācija — ${name}`,
        html: `<p>Testa pieprasījums no /api/register</p><p>Vārds: ${name}</p><p>E-pasts: ${email}</p>`,
        replyTo: email.includes("@") ? email : undefined,
      })
    );

    const err = (r as any)?.error;
    if (err) {
      return NextResponse.json({ ok: false, stage: "resend", error: err }, { status: 502 });
    }

    return NextResponse.json({ ok: true, id: (r as any)?.id ?? null });
  } catch (e: any) {
    return new NextResponse(e?.message || "Server error", { status: 500 });
  }
}
