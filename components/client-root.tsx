'use client';
import dynamic from 'next/dynamic';
import { StravaCallbackHandler } from './strava-callback-handler';

// The coach keeps all data in this browser: render it client-side only, so storage is available on the first render.
const CoachApp = dynamic(() => import('./coach-app'), { ssr: false, loading: () => <div className="boot"><span className="bootmark" /></div> });

export default function ClientRoot() {
  return (
    <>
      <StravaCallbackHandler />
      <CoachApp />
    </>
  );
}
