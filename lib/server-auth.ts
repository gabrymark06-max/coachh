// Server-side checks shared by the API routes that spend the Gemini quota: the caller must be signed in (when login is
// configured) and stays within a daily allowance per account, kept in the database so it holds across server instances.
const url = () => process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = () => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** The signed-in user's id; 'local' when login is not configured; null when the token is missing or invalid. */
export async function signedIn(req: Request): Promise<string | null> {
  if (!url() || !anon()) return 'local';
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const res = await fetch(`${url()}/auth/v1/user`, { headers: { apikey: anon()!, Authorization: `Bearer ${token}` } }).catch(() => null);
  if (!res?.ok) return null;
  const user = await res.json().catch(() => null) as { id?: string } | null;
  return user?.id ?? null;
}

/** Counts one use of `bucket` today for this account; false when the daily allowance is used up.
 * Without the usage table (supabase/v3.sql not run yet) or the service key, it allows the call: the per-IP limiter still applies. */
export async function withinDailyQuota(userId: string, bucket: string, max: number): Promise<boolean> {
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!url() || !service || userId === 'local') return true;
  const res = await fetch(`${url()}/rest/v1/rpc/bump_usage`, {
    method: 'POST', headers: { apikey: service, Authorization: `Bearer ${service}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid: userId, kind: bucket, max_per_day: max }),
  }).catch(() => null);
  if (!res?.ok) return true;
  return (await res.json().catch(() => true)) !== false;
}

const hits = new Map<string, number[]>();
/** Simple per-instance limiter: at most `max` calls per IP in ten minutes. */
export function limited(req: Request, bucket: string, max: number) {
  const ip = (req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local') + ':' + bucket;
  const t = Date.now(), list = (hits.get(ip) ?? []).filter(x => t - x < 10 * 60_000);
  list.push(t); hits.set(ip, list);
  return list.length > max;
}
