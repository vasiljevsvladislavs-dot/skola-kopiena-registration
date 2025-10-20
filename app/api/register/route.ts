import { NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  // Мини-пинг, чтобы проверить что маршрут отвечает и 504 исчезает
  return NextResponse.json({ ok: true, ping: true });
}
