'use client';
import { useEffect, useState } from 'react';

export default function StravaCallback() {
  const [status, setStatus] = useState('Connessione a Strava in corso…');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const err = params.get('error');

    const storeResult = (msg: string) => {
      sessionStorage.setItem('tempra-strava-result', msg);
    };

    if (err) {
      setError(`Strava error: ${err}`);
      storeResult(`Strava error: ${err}`);
      return;
    }
    if (!code) {
      setError('Nessun code da Strava.');
      storeResult('Nessun code da Strava.');
      return;
    }

    import('../../../../lib/sync-strava').then(async m => {
      try {
        await m.exchangeCode(code!);
        setSuccess(true);
        setStatus('Connessione riuscita!');
        storeResult('ok');
        // Auto-redirect after 2s
        setTimeout(() => window.location.replace(window.location.origin), 2000);
      } catch (e) {
        const msg = (e as Error).message;
        setError(msg);
        setStatus('Errore durante la connessione.');
        storeResult(msg);
      }
    });
  }, []);

  return (
    <div style={{ fontFamily: 'system-ui', padding: '2rem', maxWidth: '420px', margin: '2rem auto', textAlign: 'center' }}>
      <h2>Strava Callback</h2>
      <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>{status}</p>
      {error && (
        <div style={{ background: '#fee', border: '1px solid #f99', padding: '1rem', borderRadius: 8, color: '#900', marginTop: '1rem' }}>
          <strong>Errore:</strong> {error}
          <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
            Se il problema persiste, controlla che la Redirect URI in Strava sia:<br/>
            <code style={{ wordBreak: 'break-all' }}>https://coachh-teal.vercel.app/api/strava/callback</code>
          </p>
        </div>
      )}
      {success && <p style={{ color: 'green', marginTop: '1rem' }}>Reindirizzamento alla home…</p>}
    </div>
  );
}
