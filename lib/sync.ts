// Garmin / Strava sync: maps a completed activity from either platform into one of Tempra's WorkoutLog rows.
// The data lands in the journal (diario) and, where meaningful, feeds the coach's analysis (checkin values).
//
// Strava: OAuth 2.0 (no client secret needed on the client side) — see lib/sync-strava.ts for the flow.
// Garmin: Garmin Connect's web API has no public personal-access API; the supported route is the
// Garmin Connect Developer Program (or Connect Mobile's "sync" via a partner). We model the same
// normalized shape here so a future provider can plug in without touching the rest of the app.

import type { AppState, WorkoutLog } from './types';
import { id, now } from './engine/program';

/** Normalized activity coming from any provider, before it's attached to a plan session. */
export interface ProviderActivity {
  /** Provider id of the activity (Strava activity id / Garmin activity id). */
  sourceId: string;
  source: 'strava' | 'garmin';
  /** ISO date of the activity start. */
  start: string;
  title: string;
  /** Distance in meters (0 for strength-only). */
  distanceM: number;
  /** Duration in seconds. */
  durationS: number;
  /** Average heart rate (bpm) when available. */
  avgHr?: number;
  /** Max heart rate (bpm) when available. */
  maxHr?: number;
  /** Whether it was a run (vs strength/cross-train). */
  isRun: boolean;
  /** Optional per-set results for strength activities (best effort). */
  sets?: { exerciseId: string; set: number; name: string; weight: number; reps: number; rir: number | null }[];
}

/** A WorkoutLog row built from a provider activity. Provider rows carry no plan distance/run minutes, so those fields are zeroed. */
export function toWorkoutLog(a: ProviderActivity): WorkoutLog {
  const minutes = Math.max(1, Math.round(a.durationS / 60));
  return {
    id: id(),
    date: a.start,
    title: a.title,
    type: a.isRun ? 'run' : 'strength',
    sessionId: '', // provider-sourced: not tied to a plan session
    week: 0,
    duration: minutes,
    rpe: a.isRun ? (a.avgHr && a.avgHr > 60 ? Math.min(10, Math.round(a.avgHr / 14)) : 6) : 6,
    results: a.sets ?? [],
    note: `Sincronizzato da ${a.source === 'strava' ? 'Strava' : 'Garmin'} · ${a.distanceM ? `${Math.round(a.distanceM / 100)} m` : ''}${a.avgHr ? ` · HR media ${a.avgHr} bpm` : ''}`.trim(),
    completed: true,
    pain: false,
    distance: null,
    actualRunMinutes: 0,
    plannedDuration: minutes,
    plannedRpe: undefined,
    plannedRunMinutes: 0,
  };
}

/**
 * Attach a provider activity to the journal. It is kept as an extra entry (not counted against a plan
 * session, which has strict week/series rules); the coach still sees it in the diary and can reason
 * over distance, heart rate, and fatigue.
 */
export function applyActivity(s: AppState, a: ProviderActivity): AppState {
  const log = toWorkoutLog(a);
  // De-dupe by source + id so re-syncing the same activity doesn't create a new row.
  const exists = s.logs.some(l => (l.note ?? '').includes(`sync:${a.source}:${a.sourceId}`));
  if (exists) return s;
  log.note = `${log.note} · sync:${a.source}:${a.sourceId}`;
  const next = { ...s, logs: [...s.logs, log].sort((x, y) => x.date.localeCompare(y.date)) };
  next.logs = next.logs.slice(-5000);
  next.updatedAt = now();
  return next;
}

/** Best-effort: if the activity looks like a run and the user hasn't checked in today, fill a light checkin. */
export function suggestCheckin(s: AppState, a: ProviderActivity) {
  const today = now().slice(0, 10);
  if (s.checkins.some(c => c.date.slice(0, 10) === today)) return null;
  const fatigue = a.avgHr ? Math.min(5, Math.max(1, Math.round(a.avgHr / 60))) : 3;
  return { sleep: 7, fatigue, soreness: a.isRun ? 3 : 2, weight: null, note: `Auto-dal cardio di ${a.source}` };
}
