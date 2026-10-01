// Supabase client for login and cloud sync. Without the two public env vars the app runs as before: no login, data on the device.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { AppState } from './types';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const supabase: SupabaseClient | null = url && key
  ? createClient(url, key, { auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null;

/** Current user id, or null when logged out or when login is not configured. */
export async function currentUserId(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

export async function accessToken(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function loadRemote(userId: string): Promise<AppState | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from('app_state').select('state').eq('user_id', userId).maybeSingle();
  if (error) throw Error('Non riesco a leggere i tuoi dati dal cloud: ' + error.message);
  return (data?.state as AppState | undefined) ?? null;
}

let timer: ReturnType<typeof setTimeout> | null = null;
let queued: { userId: string; state: AppState } | null = null;

async function flush() {
  if (!supabase || !queued) return;
  const { userId, state } = queued;
  queued = null;
  const { error } = await supabase.from('app_state').upsert({ user_id: userId, state, revision: state.revision, updated_at: new Date().toISOString() });
  if (error) { queued = queued ?? { userId, state }; timer = setTimeout(flush, 10_000); }
}

/** Save to the cloud shortly after the last change; retries on failure and flushes when the page is hidden. */
export function pushRemote(userId: string, state: AppState) {
  queued = { userId, state };
  if (timer) clearTimeout(timer);
  timer = setTimeout(flush, 1200);
}
if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && queued) { if (timer) clearTimeout(timer); flush(); } });

export async function deleteRemote(userId: string) {
  if (!supabase) return;
  queued = null;
  await supabase.from('app_state').delete().eq('user_id', userId);
  const { data } = await supabase.storage.from('photos').list(userId, { limit: 1000 });
  if (data?.length) await supabase.storage.from('photos').remove(data.map(f => `${userId}/${f.name}`));
}

/** Shares a product read from its label, so the next scan of this barcode finds it for everyone. Best effort: a missing table or a duplicate is ignored. */
export async function shareProduct(p: { code: string; name: string; brand?: string; kcal: number; p: number; c: number; f: number; serving?: number }) {
  if (!supabase || !(await currentUserId())) return;
  await supabase.from('products').insert({ code: p.code, name: p.name.slice(0, 120), brand: p.brand?.slice(0, 80) ?? null, kcal: p.kcal, p: p.p, c: p.c, f: p.f, serving: p.serving ?? null }).then(() => undefined, () => undefined);
}
