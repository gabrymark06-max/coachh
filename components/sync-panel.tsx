'use client';
import { useEffect, useState } from 'react';
import { RefreshCw, Unlink, Link2, Bike, Footprints } from 'lucide-react';
import { applyActivity, type ProviderActivity } from '../lib/sync';
import type { AppState } from '../lib/types';
import {
  stravaConfigured, stravaAuthUrl, loadTokens, clearTokens, fetchRecentActivities,
} from '../lib/sync-strava';

/** Connect Garmin/Strava, pull recent activities into the journal (diario). */
export function SyncPanel({ state, update }: { state: AppState; update: (fn: (p: AppState) => AppState) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const linked = !!loadTokens();

  const sync = async () => {
    setBusy(true); setError(''); setDone('');
    try {
      const acts = await fetchRecentActivities(30);
      let added = 0;
      update(prev => {
        let next = prev;
        for (const a of acts) {
          const before = next.logs.length;
          next = applyActivity(next, a);
          if (next.logs.length > before) added++;
        }
        return next;
      });
      setDone(added ? `${added} allenamenti aggiunti al diario.` : 'Niente di nuovo da Strava.');
    } catch (e) { setError((e as Error).message); }
    setBusy(false);
  };

  return <div className="reminders">
    <div><b>Garmin / Strava</b>
      <small>Porta i tuoi allenamenti sul diario di Tempra: cardio, distanza e frequenza cardiica finiscono nel diario e il coach li usa per il feedback.</small></div>

    {stravaConfigured() && !linked && <button className="secondary" disabled={busy} onClick={() => { window.location.href = stravaAuthUrl(); }}><Link2 size={16} /> Collega Strava</button>}
    {stravaConfigured() && linked && <div className="chiprow">
      <button className="secondary" disabled={busy} onClick={sync}><RefreshCw size={16} /> {busy ? 'Sync in corso…' : 'Sync ora'}</button>
      <button className="secondary" onClick={() => { clearTokens(); location.reload(); }}><Unlink size={16} /> Scolastra Strava</button>
    </div>}
    {!stravaConfigured() && <p className="formerror">Non configurato: serve <code>NEXT_PUBLIC_STRAVA_CLIENT_ID</code>. Garmin non ha API pubblica personale: usa Strava, o Garmin Connect Developer Program.</p>}

    {done && <p className="formerror ok">{done}</p>}
    {error && <p className="formerror">{error}</p>}
  </div>;
}
