// Server-side check shared by the API routes that spend the Gemini quota: with login configured, the caller must be signed in.
export async function signedIn(req: Request): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return true;
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return false;
  const res = await fetch(`${url}/auth/v1/user`, { headers: { apikey: key, Authorization: `Bearer ${token}` } }).catch(() => null);
  return !!res?.ok;
}

const hits = new Map<string, number[]>();
/** Simple per-instance limiter: at most `max` calls per IP in ten minutes. */
export function limited(req: Request, bucket: string, max: number) {
  const ip = (req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local') + ':' + bucket;
  const t = Date.now(), list = (hits.get(ip) ?? []).filter(x => t - x < 10 * 60_000);
  list.push(t); hits.set(ip, list);
  return list.length > max;
}
