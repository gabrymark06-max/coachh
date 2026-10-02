// Daily reminder (Vercel cron, early morning in Italy): today's session or a rest-day nudge, sent as a push notification
// to every device that turned reminders on. Short and once a day: reminders help when relevant and rare (Bidargaddi 2018).
import webpush from 'web-push';
import type { AppState } from '../../../../lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Sub = { endpoint: string; user_id: string; subscription: webpush.PushSubscription };

function message(s: AppState | null, now = new Date()) {
  const day = (new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Rome' })).getDay() + 6) % 7; // 0 = Monday, like plan days
  const plan = s?.plan;
  const done = new Set((s?.logs ?? []).filter(l => l.week === plan?.week).map(l => l.sessionId));
  const session = plan && !plan.blocked ? plan.sessions.find(x => x.day === day && !done.has(x.id)) : undefined;
  if (session) return { title: `Oggi: ${session.title}`, body: `${session.duration} minuti. Prima pesati a digiuno: il peso medio guida le calorie.`, tag: 'today' };
  return { title: 'Giorno di riposo', body: 'Pesati a digiuno e registra i pasti: bastano due pasti al giorno per seguire bene l’andamento.', tag: 'today' };
}

export async function GET(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) return new Response('Unauthorized', { status: 401 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY;
  if (!url || !key || !pub || !priv) return Response.json({ sent: 0, reason: 'not configured' });
  webpush.setVapidDetails('mailto:gabrymark06@gmail.com', pub, priv);
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  const subs = await fetch(`${url}/rest/v1/push_subscriptions?select=endpoint,user_id,subscription`, { headers }).then(r => r.ok ? r.json() as Promise<Sub[]> : []).catch(() => [] as Sub[]);
  if (!subs.length) return Response.json({ sent: 0 });
  const users = [...new Set(subs.map(x => x.user_id))];
  const rows = await fetch(`${url}/rest/v1/app_state?select=user_id,state&user_id=in.(${users.join(',')})`, { headers }).then(r => r.ok ? r.json() as Promise<{ user_id: string; state: AppState }[]> : []).catch(() => []);
  const state = new Map(rows.map(r => [r.user_id, r.state]));
  let sent = 0;
  for (const sub of subs) {
    const m = message(state.get(sub.user_id) ?? null);
    try { await webpush.sendNotification(sub.subscription, JSON.stringify({ ...m, url: '/' }), { TTL: 6 * 3600 }); sent++; }
    catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      // The browser dropped the subscription: forget it.
      if (status === 404 || status === 410) await fetch(`${url}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(sub.endpoint)}`, { method: 'DELETE', headers }).catch(() => null);
    }
  }
  return Response.json({ sent, devices: subs.length });
}
