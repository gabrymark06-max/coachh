// Errors from users' browsers, written to the server log (Vercel → Project → Logs, filter "client-error").
// No personal data: message, stack excerpt, page and browser only.
import { limited } from '../../../lib/server-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (limited(req, 'log', 20)) return new Response(null, { status: 204 });
  const d = await req.json().catch(() => null) as { message?: string; stack?: string; page?: string; version?: string } | null;
  if (!d?.message) return new Response(null, { status: 204 });
  console.error('client-error', JSON.stringify({ message: String(d.message).slice(0, 300), stack: String(d.stack ?? '').slice(0, 1200), page: String(d.page ?? '').slice(0, 100), ua: (req.headers.get('user-agent') ?? '').slice(0, 160) }));
  return new Response(null, { status: 204 });
}
