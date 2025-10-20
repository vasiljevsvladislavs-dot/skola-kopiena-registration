// НИ ОДНОГО импорта — функция возвращает ответ мгновенно
export const runtime = 'nodejs';

export async function GET() {
  return new Response('ok', {
    status: 200,
    headers: { 'content-type': 'text/plain' }
  });
}
