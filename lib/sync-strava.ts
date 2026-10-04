// Strava sync for Tempra: a self-contained OAuth 2.0 flow (authorization code + PKCE), no client secret.
// The client (browser) opens Strava's authorize page, comes back to /api/strava/callback, and the
// server exchanges the code for tokens. Tokens are stored in the signed-in user's browser (localStorage),
// and "Sync ora" polls recent activities and returns them as normalized ProviderActivity objects.
//
// Strava scope: activity:read, athlete:read (read-only — Tempra never writes to Strava).

import type { ProviderActivity } from './sync';

const STRAVA_AUTH = 'https://www.strava.com/oauth/authorize';
const STRAVA_TOKEN = 'https://www.strava.com/oauth/token';
const STRAVA_ACTIVITIES = 'https://api.strava.com/athlete/activities';

const CLIENT_ID = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID ?? '';
const REDIRECT_URI = () => process.env.NEXT_PUBLIC_STRAVA_REDIRECT ?? `${location.origin}/api/strava/callback`;

export const stravaConfigured = () => CLIENT_ID !== '';

function codeVerifier(): { verifier: string; challenge: string } {
  const verifier = crypto.getRandomValues(new Uint8Array(32)).reduce((s, b) => s + String.fromCharCode(b), '');
  const challenge = btoa(unescape(encodeURIComponent(verifier)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return { verifier, challenge };
}

export function stravaAuthUrl(): string {
  const { verifier, challenge } = codeVerifier();
  sessionStorage.setItem('strava-verifier', verifier);
  const p = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI(),
    response_type: 'code',
    scope: 'activity:read athlete:read',
    approval_prompt: 'auto',
    state: Math.random().toString(36).slice(2),
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });
  return `${STRAVA_AUTH}?${p}`;
}

interface Tokens { access_token: string; refresh_token: string; expires_at: number; account_id: number }
const TK = 'tempra-strava-tokens';
export const loadTokens = () => { try { return JSON.parse(localStorage.getItem(TK) ?? 'null') as Tokens | null; } catch { return null; } };
const saveTokens = (t: Tokens) => localStorage.setItem(TK, JSON.stringify(t));
export const clearTokens = () => localStorage.removeItem(TK);

export async function exchangeCode(code: string): Promise<Tokens> {
  const verifier = sessionStorage.getItem('strava-verifier') ?? '';
  const res = await fetch(STRAVA_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      code,
      grant_type: 'authorization_code',
      redirect_uri: REDIRECT_URI(),
      code_verifier: verifier,
    }),
  });
  if (!res.ok) throw Error('Strava non ha rilasciato i token (controlla redirect URI e client id).');
  const d = await res.json();
  return { access_token: d.access_token, refresh_token: d.refresh_token, expires_at: Date.now() + d.expires_in * 1000, account_id: d.profile?.athlete?.id ?? 0 };
}

async function refresh(t: Tokens): Promise<Tokens> {
  const res = await fetch(STRAVA_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: CLIENT_ID, grant_type: 'refresh_token', refresh_token: t.refresh_token }),
  });
  if (!res.ok) throw Error('Token scaduto: ricollega Strava.');
  const d = await res.json();
  const next: Tokens = { access_token: d.access_token, refresh_token: d.refresh_token, expires_at: Date.now() + d.expires_in * 1000, account_id: t.account_id };
  saveTokens(next);
  return next;
}

export async function getToken(): Promise<Tokens> {
  let t = loadTokens();
  if (!t) throw Error('Non collegato a Strava.');
  if (t.expires_at - Date.now() < 60_000) t = await refresh(t);
  return t;
}

interface StravaActivity { id: number; name: string; distance: number; moving_time: number; type: string; start_date: string; average_heartrate?: number; maximum_heartrate?: number }

export async function fetchRecentActivities(limit = 30): Promise<ProviderActivity[]> {
  const t = await getToken();
  const res = await fetch(`${STRAVA_ACTIVITIES}?per_page=${limit}&sort_desc=created_at`, {
    headers: { Authorization: `Bearer ${t.access_token}` },
  });
  if (!res.ok) throw Error(`Strava ha risposto ${res.status}.`);
  const list = (await res.json()) as StravaActivity[];
  return list.map(a => ({
    sourceId: String(a.id),
    source: 'strava' as const,
    start: a.start_date,
    title: a.name,
    distanceM: a.distance ?? 0,
    durationS: a.moving_time ?? 0,
    avgHr: a.average_heartrate,
    maxHr: a.maximum_heartrate,
    isRun: /run|runn/i.test(a.type),
  }));
}
