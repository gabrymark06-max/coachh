// Sends a test notification to the caller's own devices, so the person can check that reminders arrive.
import webpush from 'web-push';
import { signedIn, limited } from '../../../lib/server-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const user = await signedIn(req);
  if (!user || user === 'local') return Response.json({ error: 'Accedi per provare i promemoria.' }, { status: 401 });
  if (limited(req, 'push-test', 5)) return Response.json({ error: 'Hai già fatto diverse prove: riprova tra qualche minuto.' }, { status: 429 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY;
  if (!url || !key || !pub || !priv) return Response.json({ error: 'Promemoria non configurati sul server.' }, { status: 503 });
  webpush.setVapidDetails('mailto:gabrymark06@gmail.com', pub, priv);
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  const subs = await fetch(`${url}/rest/v1/push_subscriptions?select=endpoint,subscription&user_id=eq.${user}`, { headers }).then(r => r.ok ? r.json() as Promise<{ endpoint: string; subscription: webpush.PushSubscription }[]> : []).catch(() => []);
  if (!subs.length) return Response.json({ error: 'Nessun dispositivo registrato: tocca «Attiva».' }, { status: 404 });
  let sent = 0;
  for (const s of subs) {
    try { await webpush.sendNotification(s.subscription, JSON.stringify({ title: 'Promemoria attivi', body: 'Funziona. Ogni mattina ti scrivo la seduta del giorno, o pesata e pasti nei giorni di riposo.', tag: 'test', url: '/' }), { TTL: 600 }); sent++; }
    catch (e) { const st = (e as { statusCode?: number }).statusCode; if (st === 404 || st === 410) await fetch(`${url}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(s.endpoint)}`, { method: 'DELETE', headers }).catch(() => null); }
  }
  return sent ? Response.json({ sent, devices: subs.length }) : Response.json({ error: 'Invio non riuscito: disattiva e riattiva i promemoria.' }, { status: 502 });
}
