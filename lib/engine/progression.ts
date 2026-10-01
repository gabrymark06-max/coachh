// Load suggestions from logged performance (autoregulated double progression) and the warm-up of each gym session.
import type { AppState, Exercise, Profile, Session, SetResult } from '../types';
import { families, type Muscle } from './exercises';

export type Performance = { date: string; week: number; sets: { weight: number | null; reps: number; rir: number | null }[] };
export type Suggestion = { kind: 'start' | 'up' | 'hold' | 'down' | 'reps'; load: number | null; target: string; why: string; last: string | null };

/** Epley estimate of the one-repetition maximum, counting the reps left in reserve as reps the set could still do. */
export const e1rm = (weight: number, reps: number, rir = 0) => weight * (1 + (reps + rir) / 30);

/** Smallest realistic load jump: dumbbells move in 2 kg steps, bars, Smith machine and most stacks in 2.5 kg. */
export const plateStep = (name: string) => (/manubri|manubrio/i.test(name) ? 2 : 2.5);
const roundTo = (x: number, step: number) => Math.round(x / step) * step;
const floorTo = (x: number, step: number) => Math.floor(x / step + 1e-9) * step;
const kg = (x: number) => `${x.toLocaleString('it-IT')} kg`;

/** Exercise name of a logged set: stored with the set, otherwise the plan exercise with the same id. */
export function nameOf(state: Pick<AppState, 'plan'>, r: SetResult): string | null {
  if (r.name) return r.name;
  for (const s of state.plan?.sessions ?? []) { const e = s.exercises.find(x => x.id === r.exerciseId); if (e) return e.name; }
  return null;
}

/** Every logged performance of an exercise, oldest first. Sessions with pain are excluded. */
export function history(state: Pick<AppState, 'plan' | 'logs'>, name: string): Performance[] {
  const out: Performance[] = [];
  for (const l of state.logs) {
    if (l.type !== 'strength' || l.pain) continue;
    const sets = l.results.filter(r => r.reps > 0 && nameOf(state, r) === name).sort((a, b) => a.set - b.set).map(r => ({ weight: r.weight, reps: r.reps, rir: r.rir }));
    if (sets.length) out.push({ date: l.date, week: l.week, sets });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

/** "60 kg × 8 · 8 · 7" — consecutive sets with the same load are grouped. */
export function describe(p: Performance): string {
  const groups: { w: number | null; reps: number[] }[] = [];
  for (const s of p.sets) { const g = groups.at(-1); if (g && g.w === s.weight) g.reps.push(s.reps); else groups.push({ w: s.weight, reps: [s.reps] }); }
  return groups.map(g => `${g.w ? kg(g.w) + ' × ' : ''}${g.reps.join(' · ')}`).join(', ');
}

/** Best estimated 1RM of a performance, or null for bodyweight work. */
export function bestE1rm(p: Performance, targetRir = 2): number | null {
  const v = p.sets.filter(s => s.weight && s.weight > 0).map(s => e1rm(s.weight!, s.reps, s.rir ?? targetRir));
  return v.length ? Math.max(...v) : null;
}

/**
 * What to lift next time, from the last time this exercise was done.
 * Double progression regulated by reps in reserve: fill the rep range at the prescribed effort, then add load;
 * drop the load when the sets fall below the range; convert through the estimated 1RM when the rep range changed.
 */
export function suggest(e: Pick<Exercise, 'name' | 'low' | 'high' | 'rir' | 'sets' | 'increment' | 'load' | 'unit'>, hist: Performance[], opts: { deload?: boolean } = {}): Suggestion {
  const last = hist.at(-1) ?? null;
  const lastText = last ? describe(last) : null;
  const unit = e.unit === 'seconds' ? ' s' : '';
  if (e.increment === 0 || (last && !last.sets.some(s => s.weight))) {
    if (!last) return { kind: 'start', load: null, target: `${e.low}–${e.high}${unit}`, why: 'Prima volta: tecnica pulita e ritmo controllato.', last: null };
    const top = last.sets.every(s => s.reps >= e.high);
    const next = Math.min(e.high, Math.round(last.sets.reduce((t, s) => t + s.reps, 0) / last.sets.length) + 1);
    return top
      ? { kind: 'up', load: null, target: `${e.high}+${unit}`, why: 'Hai chiuso il range: aggiungi 1–2 ripetizioni o passa alla variante più difficile.', last: lastText }
      : { kind: 'reps', load: null, target: `${next}${unit} per serie`, why: 'Stesso esercizio, una ripetizione in più per serie.', last: lastText };
  }
  const step = plateStep(e.name);
  if (!last) {
    return e.load
      ? { kind: 'hold', load: e.load, target: `${e.low}–${e.high}`, why: 'Carico della settimana precedente.', last: null }
      : { kind: 'start', load: null, target: `${e.low}–${e.high}`, why: `Prima volta: scegli un carico con cui arrivi a ${e.high} ripetizioni lasciandone ${e.rir} in riserva. Annotalo: da lì calcolo i prossimi.`, last: null };
  }
  const W = Math.max(...last.sets.map(s => s.weight ?? 0));
  const work = last.sets.filter(s => s.weight === W);
  const rirOf = (s: { rir: number | null }) => s.rir ?? e.rir;
  const best = Math.max(...work.map(s => e1rm(W, s.reps, rirOf(s))));
  const median = [...work].sort((a, b) => a.reps - b.reps)[Math.floor(work.length / 2)].reps;
  const loadFor = (reps: number) => Math.max(step, floorTo(best / (1 + (reps + e.rir) / 30), step));
  if (opts.deload) return { kind: 'hold', load: W, target: `${e.low}–${e.high}`, why: 'Settimana di scarico: stesso carico, meno serie e più ripetizioni in riserva.', last: lastText };
  // A different rep range last time (heavy vs volume day): convert through the estimated 1RM.
  if (median > e.high + 2 || median < e.low - 2) {
    const load = loadFor(Math.round((e.low + e.high) / 2));
    return { kind: 'hold', load, target: `${e.low}–${e.high}`, why: `Calcolato dalla seduta con ripetizioni diverse (${lastText}).`, last: lastText };
  }
  const allTop = work.length >= Math.min(e.sets, last.sets.length) && work.every(s => s.reps >= e.high && rirOf(s) >= e.rir);
  if (allTop) {
    const base = Math.max(step, roundTo(W * 0.04, step));
    const easy = work.every(s => rirOf(s) >= e.rir + 2);
    const inc = easy ? base * 2 : base;
    return { kind: 'up', load: Math.round((W + inc) * 10) / 10, target: `${e.low}–${e.high}`, why: `Tutte le serie a ${e.high}${easy ? ' con molto margine' : ''}: +${kg(inc)} e riparti da ${e.low} ripetizioni.`, last: lastText };
  }
  const below = work.filter(s => s.reps < e.low).length;
  if (below > work.length / 2 || work[0].reps < e.low) {
    const load = Math.min(W - step, loadFor(e.low + 1));
    return { kind: 'down', load: Math.max(step, load), target: `${e.low}–${e.high}`, why: `Sotto le ${e.low} ripetizioni: scendi a ${kg(Math.max(step, load))} per lavorare nel range giusto.`, last: lastText };
  }
  const grind = work.some(s => s.rir !== null && s.rir <= e.rir - 2);
  const next = work.map(s => Math.min(e.high, s.reps + (grind ? 0 : 1)));
  return { kind: 'hold', load: W, target: `${next.join(' · ')}`, why: grind ? 'Stesso carico: eri più vicino al cedimento del previsto, punta a ripetere le stesse ripetizioni con più margine.' : `Stesso carico, una ripetizione in più per serie fino a ${e.high} in tutte.`, last: lastText };
}

/** Ramp-up sets before the first working set of a lift. */
export function rampSets(name: string, load: number | null, low: number): string[] {
  const step = plateStep(name);
  const bar = /bilanciere|multipower/i.test(name);
  if (!load) return bar ? ['Solo bilanciere × 10', 'Circa metà del carico di lavoro × 5', 'Circa tre quarti × 3'] : ['Carico leggero × 10', 'Circa metà del carico di lavoro × 5', 'Circa tre quarti × 2'];
  if (load < 16) return [`${kg(Math.max(step, roundTo(load * 0.5, step)))} × 10`];
  const sets: [number, number][] = [[0.45, 8], [0.65, 5], [0.8, 3]];
  if (low <= 5) sets.push([0.9, 1]);
  const out = sets.map(([f, r]) => [Math.max(bar ? 20 : step, roundTo(load * f, step)), r] as const).filter(([w], i, a) => w < load && (i === 0 || w > a[i - 1][0]));
  return out.map(([w, r]) => `${kg(w)} × ${r}`);
}

export type Warmup = { general: string; drills: { name: string; dose: string }[] };

/** Session-specific warm-up: a few minutes of easy cardio, dynamic drills for the joints of the day, then ramp-up sets. */
export function warmupFor(s: Pick<Session, 'kind' | 'title'>, p: Pick<Profile, 'equipment'>): Warmup {
  const gym = p.equipment === 'gym';
  const general = gym ? 'Cyclette, ellittica o vogatore · 4–5 minuti a ritmo facile' : 'Camminata veloce, step o saltelli leggeri · 3–4 minuti';
  const arms = { name: 'Rotazioni delle braccia', dose: '10 avanti + 10 indietro' };
  const pullApart = gym ? { name: 'Face pull leggero al cavo', dose: '1 × 15' } : { name: 'Aperture con elastico (band pull-apart)', dose: '1 × 15' };
  const external = { name: gym ? 'Rotazioni esterne al cavo' : 'Rotazioni esterne con elastico', dose: '1 × 12 per lato' };
  const pushups = { name: 'Push-up lenti', dose: '1 × 8' };
  const swings = { name: 'Slanci delle gambe avanti-dietro e laterali', dose: '10 per gamba' };
  const squat = { name: 'Squat a corpo libero lenti', dose: '1 × 10' };
  const bridge = { name: 'Ponte glutei', dose: '1 × 12' };
  const hinge = { name: 'Inchino con mani sui fianchi (good morning a corpo libero)', dose: '1 × 10' };
  const lunge = { name: 'Affondo con rotazione del busto', dose: '4 per lato' };
  const drills =
    s.kind === 'push' ? [arms, pullApart, external, pushups]
    : s.kind === 'pull' ? [arms, pullApart, gym ? { name: 'Appeso alla sbarra, scapole giù e su', dose: '1 × 8' } : { name: 'Gatto-cammello', dose: '1 × 8' }, external]
    : s.kind === 'upper' ? [arms, pullApart, external, pushups]
    : s.kind === 'lower' || s.kind === 'legs' ? [swings, squat, bridge, hinge, lunge]
    : [swings, squat, arms, pullApart, bridge];
  return { general, drills };
}

/** Muscles trained as prime movers by an exercise family. */
export const primeMovers = (family: string) => Object.entries(families[family]?.muscles ?? {}).filter(([, w]) => w === 1).map(([m]) => m as Muscle);
