'use client';
import { useEffect, useState } from 'react';

// Strava redirects here with ?code=... This page reads the code, exchanges it for
// tokens (using the PKCE verifier in sessionStorage), stores them, then returns to the app.
export default function StravaCallback() {
  const [status, setStatus] = useState('Connessione a Strava in corso…');
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const err = params.get('error');

    const finish = (msg: string, isError: boolean) => {
      sessionStorage.setItem('tempra-strava-result', msg);
      setStatus(isError ? `Errore: ${msg}` : 'Successo! Reindirizzamento…');
      if (isError) {
        setError(msg);
      } else {
        setTimeout(() => window.location.replace(window.location.origin), 1500);
      }
    };

    if (err) { finish(`Strava error: ${err}`, true); return; }
    if (!code) { finish('Nessun code da Strava.', true); return; }

    import('../../../../lib/sync-strava').then(async m => {
      try {
        await m.exchangeCode(code!);
        finish('ok', false);
      } catch (e) {
        finish((e as Error).message, true);
      }
    });
  }, []);

  return (
    <div style={{ fontFamily: 'system-ui', padding: '2rem', maxWidth: '400px', margin: '2rem auto' }}>
      <h2>Strava Callback</h2>
      <p>{status}</p>
      {error && <p style={{ color: 'red' }}>Errore: {error}</p>}
      {error && <p>Se il problema persiste, controlla la Redirect URI in Strava.</p>}
    </div>
  );
}
