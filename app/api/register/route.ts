// app/api/register/route.ts
import { Resend } from 'resend';
import { adminNotifyHtml, participantConfirmHtml } from '@/lib/email-lv';

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function POST(req: Request) {
  try {
    const form = await req.json(); // { name, email, ... }
    const name  = form.name as string | undefined;
    const email = form.email as string | undefined;

    if (!email) {
      return new Response(JSON.stringify({ error: 'email is required' }), { status: 400 });
    }

    const FROM = process.env.MAIL_FROM || 'Rudens konference <info@rudenskonference.lv>';
    const ADMIN = process.env.MAIL_ADMIN_TO || 'info@rudenskonference.lv';
    const EVENT = process.env.EVENT_NAME || 'Rudens konference 2025';

    // 1) Письмо организатору
    await resend.emails.send({
      from: FROM,
      to: [ADMIN],
      subject: `Jauna reģistrācija — ${EVENT}`,
      html: adminNotifyHtml(form),
      headers: { 'Reply-To': email }
    });

    // 2) Автоответ участнику
    await resend.emails.send({
      from: FROM,
      to: [email],
      subject: `Paldies par reģistrāciju — ${EVENT}`,
      reply_to: ADMIN,
      html: participantConfirmHtml({ name, eventName: EVENT })
    });

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: e?.message ?? 'Server error' }), { status: 500 });
  }
}
