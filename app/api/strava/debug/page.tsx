'use client';
import { useEffect, useState } from 'react';

// Debug page: shows exactly what happens during Strava token exchange.
// Open this page right after Strava redirects with ?code=... to see the failure details.
export default function StravaDebug() {
  const [lines, setLines] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const log = (s: string) => setLines(prev => [...prev, s]);
    (async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        log(`1. URL params: code=${code ? 'presente (' + code.length + ' chars)' : 'MANCANTE'}, error=${params.get('error')}`);

        const verifier = localStorage.getItem('strava-verifier');
        log(`2. Verifier PKCE in localStorage: ${verifier ? 'presente (' + verifier.length + ' chars)' : 'MANCANTE'}`);

        const clientId = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID ?? '';
        log(`3. Client ID: ${clientId || 'MANCANTE'}`);

        const redirectUri = process.env.NEXT_PUBLIC_STRAVA_REDIRECT ?? 'https://coachh-teal.vercel.app';
        log(`4. Redirect URI: ${redirectUri}`);

        if (!code) {
          log('5. STOP: nessun code nell\'URL, niente da scambiare.');
          setDone(true);
          return;
        }
        if (!verifier) {
          log('5. STOP: verifier PKCE mancante — Strava rifiuterà lo scambio.');
          setDone(true);
          return;
        }

        log('6. Invio POST a https://www.strava.com/oauth/token ...');
        const res = await fetch('https://www.strava.com/oauth/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: clientId,
            code,
            grant_type: 'authorization_code',
            redirect_uri: redirectUri,
            code_verifier: verifier,
          }),
        });
        const text = await res.text();
        log(`7. Risposta HTTP: ${res.status} ${res.statusText}`);
        log(`8. Corpo risposta: ${text.slice(0, 400)}`);
        localStorage.removeItem('strava-verifier');
      } catch (e) {
        log(`ERRORE: ${e instanceof Error ? e.message : String(e)}`);
      }
      setDone(true);
    })();
  }, []);

  return (
    <div style={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', padding: '20px', background: '#111', color: '#0f0', minHeight: '100vh' }}>
      <h2>Strava Token Exchange — Debug</h2>
      {lines.map((l, i) => <div key={i}>{l}</div>)}
      {!done && <div>...in corso...</div>}
    </div>
  );
}
