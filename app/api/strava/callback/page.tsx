import { NextResponse } from 'next/server';

// Strava redirects here with ?code=... This page reads the code, exchanges it for
// tokens (using the PKCE verifier in sessionStorage), stores them, then returns to the app.
export default function StravaCallback() {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const err = params.get('error');
  const finish = (msg: string) => {
    sessionStorage.setItem('tempra-strava-result', msg);
    window.location.replace(window.location.origin);
  };
  if (err) { finish(`Strava error: ${err}`); return null; }
  if (!code) { finish('Nessun code da Strava.'); return null; }

  // Lazy import so this page stays client-only.
  import('../../../../lib/sync-strava').then(async m => {
    try {
      await m.exchangeCode(code!);
      finish('ok');
    } catch (e) {
      finish((e as Error).message);
    }
  });

  return <div style={{ fontFamily: 'system-ui', padding: '2rem' }}>Connessione a Strava in corso…</div>;
}
