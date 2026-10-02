// Two copies of the state (this device and the cloud) are merged, so changes made on a phone and on a computer both survive.
// Lists are joined by id; for an item present in both, and for profile and plan, the copy changed last wins.
// Removed items are remembered in `deleted`, so a removal is not undone by the other copy.
import type { AppState } from './types';

type Keyed = { id: string; date?: string };
const LISTS = ['logs', 'checkins', 'decisions', 'messages', 'measurements', 'foods', 'meals'] as const;
const CAPS: Record<(typeof LISTS)[number], number> = { logs: 5000, checkins: 400, decisions: 200, messages: 80, measurements: 2000, foods: 4000, meals: 200 };

export function merge(a: AppState, b: AppState): AppState {
  const [newer, older] = (b.updatedAt ?? '') > (a.updatedAt ?? '') ? [b, a] : [a, b];
  const deleted = Object.fromEntries(Object.entries({ ...older.deleted, ...newer.deleted }).sort((x, y) => y[1].localeCompare(x[1])).slice(0, 5000));
  const out: AppState = { ...older, ...newer, deleted, revision: Math.max(a.revision ?? 0, b.revision ?? 0) };
  for (const key of LISTS) {
    const byId = new Map<string, Keyed>();
    for (const x of ((older[key] ?? []) as Keyed[])) byId.set(x.id, x);
    for (const x of ((newer[key] ?? []) as Keyed[])) byId.set(x.id, x);
    let list = [...byId.values()].filter(x => !deleted[x.id]);
    if (key !== 'meals') list = list.sort((x, y) => (x.date ?? '').localeCompare(y.date ?? ''));
    (out as Record<string, unknown>)[key] = list.slice(-CAPS[key]);
  }
  return out;
}

/** Same content, ignoring the bookkeeping fields. */
export const sameData = (a: AppState, b: AppState) => JSON.stringify({ ...a, revision: 0, updatedAt: '' }) === JSON.stringify({ ...b, revision: 0, updatedAt: '' });
