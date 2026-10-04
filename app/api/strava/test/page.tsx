'use client';
import { useEffect, useState } from 'react';
import { stravaAuthUrl, stravaConfigured, loadTokens } from '../../../../lib/sync-strava';

export default function StravaTest() {
  const [authUrl, setAuthUrl] = useState('');
  const [tokens, setTokens] = useState<null | { access_token: string }>(null);

  useEffect(() => {
    setAuthUrl(stravaConfigured() ? stravaAuthUrl() : 'Client ID non configurato');
    setTokens(loadTokens());
  }, []);

  return (
    <div style={{ fontFamily: 'system-ui', padding: '2rem', maxWidth: '500px', margin: '2rem auto' }}>
      <h2>Strava Test</h2>
      <p>Client ID configurato: {stravaConfigured() ? 'sì' : 'no'}</p>
      <p>Token presenti: {tokens ? 'sì' : 'no'}</p>
      <p style={{ fontWeight: 600 }}>URL di autorizzazione:</p>
      <div style={{ background: '#f4f4f4', padding: '1rem', borderRadius: 8, wordBreak: 'break-all', fontSize: '0.85rem', marginTop: '0.5rem' }}>
        {authUrl}
      </div>
      <p style={{ marginTop: '1rem' }}>
        <a href={stravaConfigured() ? stravaAuthUrl() : '#'} 
           style={{ display: 'inline-block', padding: '0.75rem 1.5rem', background: '#fc4c02', color: 'white', borderRadius: 8, textDecoration: 'none', fontWeight: 600 }}>
          Prova Collega Strava
        </a>
      </p>
      {tokens && (
        <p style={{ marginTop: '1rem', color: 'green' }}>
          Token salvati. Ora vai alla pagina principale e clicca "Sync ora".
        </p>
      )}
    </div>
  );
}
