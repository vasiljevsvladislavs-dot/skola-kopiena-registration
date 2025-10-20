import { NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Открывай в браузере: https://rudenskonference.lv/api/ping
export async function GET() {
  return NextResponse.json({ ok: true, pong: true, t: Date.now() });
}
