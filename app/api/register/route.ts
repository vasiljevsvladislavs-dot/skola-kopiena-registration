import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { google } from "googleapis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ ok: true, pong: true, ts: Date.now() });
}

export async function POST(req: NextRequest) {
  console.log("⏳ Start /api/register");
  try {
    const resendKey = process.env.RESEND_API_KEY;
    const gsheet = process.env.GSHEET_ID;
    const gjson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

    console.log("✅ Env loaded", { resend: !!resendKey, sheet: !!gsheet, json: !!gjson });

    // Проверим соединение с Resend
    const resend = new Resend(resendKey);
    const test = await resend.emails.send({
      from: "Reģistrācija <info@rudenskonference.lv>",
      to: "info@rudenskonference.lv",
      subject: "Ping test",
      html: "<p>Resend connection test OK</p>",
    });

    console.log("📨 Resend test result:", test);

    return NextResponse.json({ ok: true, step: "Resend OK" });
  } catch (err: any) {
    console.error("❌ Error:", err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
