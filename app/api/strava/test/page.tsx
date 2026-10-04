'use client';
import { useEffect, useState } from 'react';
import { stravaConfigured, loadTokens } from '../../../../lib/sync-strava';

export default function StravaTest() {
  const [authUrl, setAuthUrl] = useState('');
  const [tokens, setTokens] = useState<null | { access_token: string }>(null);
  const [configured, setConfigured] = useState(false);

  useEffect(() => {
    // Only run in browser
    setConfigured(stravaConfigured());
    setTokens(loadTokens());
    if (stravaConfigured()) {
      // Dynamic import to avoid server-side issues
      import('../../../../lib/sync-strava').then(async m => {
        setAuthUrl(await m.stravaAuthUrl());
      });
    }
  }, []);

  return (
    <div style={{ fontFamily: 'system-ui', padding: '2rem', maxWidth: '500px', margin: '2rem auto' }}>
      <h2>Strava Test</h2>
      <p>Client ID configurato: {configured ? 'sì' : 'no'}</p>
      <p>Token presenti: {tokens ? 'sì' : 'no'}</p>
      {authUrl && (
        <>
          <p style={{ fontWeight: 600 }}>URL di autorizzazione:</p>
          <div style={{ background: '#f4f4f4', padding: '1rem', borderRadius: 8, wordBreak: 'break-all', fontSize: '0.85rem', marginTop: '0.5rem' }}>
            {authUrl}
          </div>
          <p style={{ marginTop: '1rem' }}>
            <a href={authUrl} 
               style={{ display: 'inline-block', padding: '0.75rem 1.5rem', background: '#fc4c02', color: 'white', borderRadius: 8, textDecoration: 'none', fontWeight: 600 }}>
              Prova Collega Strava
            </a>
          </p>
        </>
      )}
      {tokens && (
        <p style={{ marginTop: '1rem', color: 'green' }}>
          Token salvati. Ora vai alla pagina principale e clicca "Sync ora".
        </p>
      )}
    </div>
  );
}
