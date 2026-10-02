// Exercise library for the plan builder: public/catalog.json (≈1,000 exercises, Italian names) plus the person's own.
// Loaded on demand, so it never weighs on the first page load.
import type { CatalogEntry, Exercise } from './types';

let cache: Promise<CatalogEntry[]> | null = null;
export function loadCatalog(): Promise<CatalogEntry[]> {
  cache ??= fetch('/catalog.json').then(r => { if (!r.ok) throw Error('Libreria esercizi non disponibile.'); return r.json() as Promise<CatalogEntry[]>; }).catch(e => { cache = null; throw e; });
  return cache;
}

export const IMG = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';
export const equipmentList = ['bilanciere', 'manubri', 'multipower', 'cavi', 'macchina', 'corpo libero', 'kettlebell', 'bilanciere EZ', 'elastici', 'palla medica', 'fitball', 'altro'];
export const groupNames: Record<string, string> = { chest: 'Petto', back: 'Dorso', shoulders: 'Spalle', biceps: 'Bicipiti', triceps: 'Tricipiti', quads: 'Quadricipiti', hamstrings: 'Femorali', glutes: 'Glutei', calves: 'Polpacci', core: 'Addome' };

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/’/g, "'");
/** Every word must match the Italian or the English name, a muscle or the equipment; Tempra and own exercises first. */
export function searchCatalog(list: CatalogEntry[], q: string, f: { group?: string; eq?: string; cat?: string } = {}, limit = 60) {
  const words = norm(q).split(/\s+/).filter(Boolean);
  return list
    .filter(e => (!f.group || e.g.includes(f.group)) && (!f.eq || e.eq === f.eq) && (!f.cat || (f.cat === 'forza' ? ['forza', 'powerlifting', 'pesistica', 'strongman'].includes(e.c) : e.c === f.cat)))
    .map(e => { const hay = norm([e.n, e.en ?? '', e.eq, ...e.mu].join(' ')); return { e, ok: words.every(w => hay.includes(w)), score: (e.src === 'custom' ? 0 : e.src === 'tempra' ? 1 : 2) + (words.length && norm(e.n).startsWith(words[0]) ? -3 : 0) + e.l * 0.1 }; })
    .filter(x => x.ok)
    .sort((a, b) => a.score - b.score || a.e.n.length - b.e.n.length)
    .slice(0, limit).map(x => x.e);
}

/** Plan exercise with sensible defaults from the catalog entry; sets, reps, RIR and rest are then the person's to change. */
export function toExercise(e: CatalogEntry, id: string): Exercise {
  const loaded = !['corpo libero', 'elastici', 'fitball', 'altro'].includes(e.eq);
  const heavy = ['bilanciere', 'multipower', 'macchina'].includes(e.eq) && e.g.some(g => ['quads', 'hamstrings', 'glutes', 'back', 'chest'].includes(g));
  const sec = e.unit === 'seconds';
  return {
    id, name: e.n, family: e.fam ?? 'custom', catalogId: e.id, sets: 3, low: sec ? 20 : heavy ? 6 : 8, high: sec ? 40 : heavy ? 10 : 12,
    rir: sec ? 0 : 2, rest: heavy ? 150 : 90, load: null, increment: loaded ? (e.eq === 'manubri' ? 2 : e.eq === 'kettlebell' ? 4 : 2.5) : 0,
    cue: '', muscles: e.g, unit: sec ? 'seconds' : 'reps', role: heavy ? 'main' : 'accessory',
  };
}
