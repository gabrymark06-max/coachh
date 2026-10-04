'use client';
import { useEffect, useState } from 'react';

/**
 * Handles the Strava OAuth callback when Strava redirects to the home page
 * with ?code=... This component intercepts the code, exchanges it for tokens,
 * and stores them in localStorage. Then it cleans up the URL.
 */
export function StravaCallbackHandler() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const err = params.get('error');

    // Clean up URL immediately (remove query params)
    window.history.replaceState({}, '', window.location.origin);

    if (err) {
      sessionStorage.setItem('tempra-strava-result', `Strava error: ${err}`);
      setReady(true);
      return;
    }

    if (!code) {
      setReady(true);
      return;
    }

    // Exchange code for tokens
    import('../lib/sync-strava').then(async m => {
      try {
        await m.exchangeCode(code!);
        sessionStorage.setItem('tempra-strava-result', 'ok');
      } catch (e) {
        sessionStorage.setItem('tempra-strava-result', (e as Error).message);
      }
      setReady(true);
    });
  }, []);

  // Return null - this component only has side effects
  return null;
}
