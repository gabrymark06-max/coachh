import type { Exercise, Profile, Session } from '../types';
import { families, muscles, muscleNames, variantFor, type Muscle } from './exercises';
import { cite } from './refs';

type Role = 'main' | 'secondary' | 'accessory';
type Slot = [string, Role];
export type Template = { kind: NonNullable<Session['kind']>; title: string; slots: Slot[] };

const T: Record<string, Template> = {
  fullA: { kind: 'full', title: 'Full body A', slots: [['squat', 'main'], ['hpush', 'main'], ['hpull', 'secondary'], ['hinge', 'secondary'], ['lateral', 'accessory'], ['calves', 'accessory'], ['core', 'accessory'], ['biceps', 'accessory']] },
  fullB: { kind: 'full', title: 'Full body B', slots: [['hinge', 'main'], ['vpull', 'main'], ['vpush', 'secondary'], ['lunge', 'secondary'], ['kneeFlex', 'accessory'], ['triceps', 'accessory'], ['core', 'accessory'], ['calves', 'accessory']] },
  fullC: { kind: 'full', title: 'Full body C', slots: [['lunge', 'main'], ['hpush', 'main'], ['hpull', 'secondary'], ['kneeFlex', 'secondary'], ['lateral', 'accessory'], ['triceps', 'accessory'], ['biceps', 'accessory'], ['core', 'accessory']] },
  upperA: { kind: 'upper', title: 'Parte superiore A', slots: [['hpush', 'main'], ['hpull', 'main'], ['vpush', 'secondary'], ['vpull', 'secondary'], ['lateral', 'accessory'], ['biceps', 'accessory'], ['triceps', 'accessory']] },
  upperB: { kind: 'upper', title: 'Parte superiore B', slots: [['vpull', 'main'], ['hpush', 'main'], ['hpull', 'secondary'], ['vpush', 'secondary'], ['lateral', 'accessory'], ['triceps', 'accessory'], ['biceps', 'accessory']] },
  lowerA: { kind: 'lower', title: 'Parte inferiore A', slots: [['squat', 'main'], ['hinge', 'main'], ['kneeFlex', 'secondary'], ['kneeExt', 'accessory'], ['calves', 'accessory'], ['core', 'accessory']] },
  lowerB: { kind: 'lower', title: 'Parte inferiore B', slots: [['hinge', 'main'], ['lunge', 'main'], ['kneeExt', 'secondary'], ['kneeFlex', 'secondary'], ['calves', 'accessory'], ['core', 'accessory']] },
  push: { kind: 'push', title: 'Spinta', slots: [['hpush', 'main'], ['vpush', 'main'], ['hpush', 'secondary'], ['lateral', 'accessory'], ['triceps', 'accessory']] },
  pull: { kind: 'pull', title: 'Tirata', slots: [['vpull', 'main'], ['hpull', 'main'], ['hpull', 'secondary'], ['biceps', 'accessory'], ['core', 'accessory']] },
  legs: { kind: 'legs', title: 'Gambe', slots: [['squat', 'main'], ['hinge', 'main'], ['lunge', 'secondary'], ['kneeFlex', 'accessory'], ['calves', 'accessory'], ['core', 'accessory']] },
};
const upperFamilies = new Set(['hpush', 'vpush', 'hpull', 'vpull', 'lateral', 'biceps', 'triceps']);
const lowerFamilies = new Set(['squat', 'hinge', 'lunge', 'kneeExt', 'kneeFlex', 'calves']);
const levelIndex = (p: Profile) => (p.strengthLevel === 'new' ? 0 : p.strengthLevel === 'intermediate' ? 1 : 2);

/** Split by number of gym days: full body up to 3, then upper/lower and push/pull/legs for trained lifters. */
export function splitFor(p: Profile, sc: number): Template[] {
  const full = [T.fullA, T.fullB, T.fullC];
  const rotate = (n: number) => Array.from({ length: n }, (_, i) => full[i % 3]);
  if (sc <= 3 || p.strengthLevel === 'new') return rotate(sc);
  if (sc === 4) return [T.upperA, T.lowerA, T.upperB, T.lowerB];
  if (sc === 5) return [T.upperA, T.lowerA, T.push, T.pull, T.legs];
  return [T.push, T.pull, T.legs, T.push, T.pull, T.legs].slice(0, sc);
}

// Weekly sets per muscle at the start of a block (index: new / intermediate / experienced) and the ceiling reached by progression.
const BASE: Record<Profile['goal'], [number, number, number]> = { recomp: [7, 9, 11], muscle: [8, 10, 12], 'fat-loss': [6, 8, 10], strength: [6, 8, 9], balanced: [6, 8, 10], health: [4, 6, 6], running: [4, 5, 6] };
const CAP: Record<Profile['goal'], [number, number, number]> = { recomp: [10, 14, 16], muscle: [12, 16, 20], 'fat-loss': [10, 12, 14], strength: [9, 12, 14], balanced: [9, 12, 14], health: [6, 8, 8], running: [6, 8, 8] };

export type Context = { deload: boolean; mesoWeek: number; mesoLength: number; setBonus: number; cautious: boolean; moderateOnly: boolean };

export function weeklyTargets(p: Profile, ctx: Context): Record<Muscle, number> {
  const li = levelIndex(p);
  const step = p.goal === 'muscle' && li === 2 ? 2 : 1;
  const out = {} as Record<Muscle, number>;
  for (const m of muscles) {
    let t = Math.min(CAP[p.goal][li], BASE[p.goal][li] + ctx.setBonus * step);
    if (p.focus === 'upper') t += ['chest', 'back', 'shoulders', 'biceps', 'triceps'].includes(m) ? 2 : -1;
    if (p.focus === 'lower') t += ['quads', 'hamstrings', 'glutes', 'calves'].includes(m) ? 2 : -1;
    if (m === 'core') t = Math.min(t, 6);
    if (m === 'calves') t = p.goal === 'running' || p.goal === 'balanced' ? Math.max(4, Math.min(t, 8)) : Math.min(t, 6);
    if (ctx.cautious) t *= 0.8;
    out[m] = Math.max(2, Math.round(t));
  }
  // Respect the recent dose: grow from what the person already tolerates.
  const total = Object.values(out).reduce((a, b) => a + b, 0);
  if (p.recentStrengthSets && p.recentStrengthSets >= 10 && total > p.recentStrengthSets * 1.25) {
    const k = (p.recentStrengthSets * 1.25) / total;
    for (const m of muscles) out[m] = Math.max(2, Math.round(out[m] * k));
  }
  return out;
}

function reps(p: Profile, role: Role, fam: string, name: string): [number, number, 'reps' | 'seconds'] {
  if (fam === 'core') return /plank/i.test(name) ? (p.strengthLevel === 'new' ? [20, 30, 'seconds'] : [30, 45, 'seconds']) : [8, 12, 'reps'];
  if (fam === 'plyo') return [5, 8, 'reps'];
  const small = ['lateral', 'biceps', 'triceps', 'calves'].includes(fam);
  const runner = p.goal === 'running' && p.runningLevel !== 'new';
  if (p.goal === 'strength') return p.strengthLevel === 'new' ? (role === 'main' ? [6, 8, 'reps'] : [8, 12, 'reps']) : role === 'main' ? [3, 6, 'reps'] : role === 'secondary' ? [6, 10, 'reps'] : [8, 12, 'reps'];
  if (runner && role === 'main' && p.strengthLevel !== 'new') return [4, 6, 'reps'];
  if (p.goal === 'muscle' || p.goal === 'fat-loss' || p.goal === 'recomp') return role === 'main' ? [6, 10, 'reps'] : small ? [12, 20, 'reps'] : role === 'secondary' ? [8, 12, 'reps'] : [10, 15, 'reps'];
  if (p.strengthLevel === 'new') return small ? [12, 15, 'reps'] : [8, 12, 'reps'];
  return role === 'main' ? [6, 10, 'reps'] : role === 'secondary' ? [8, 12, 'reps'] : [10, 15, 'reps'];
}

function rir(p: Profile, role: Role, ctx: Context) {
  let r = p.strengthLevel === 'new' ? 3 : role === 'accessory' && p.strengthLevel === 'experienced' ? 1 : 2;
  if (p.strengthLevel !== 'new') {
    if (ctx.mesoWeek === 1) r += 1; // calibration week
    if (!ctx.deload && ctx.mesoWeek >= ctx.mesoLength - 1 && ctx.mesoLength > 3) r -= 1; // last build week
  }
  if (ctx.cautious || ctx.moderateOnly) r += 1;
  if (ctx.deload) r += 2;
  return Math.max(1, Math.min(4, r));
}

function rest(p: Profile, role: Role, fam: string) {
  if (fam === 'core') return 45;
  if (fam === 'plyo') return 90;
  if (role === 'main') return p.goal === 'strength' ? 180 : 120;
  if (role === 'secondary') return p.goal === 'strength' ? 120 : 90;
  return 75;
}

const workTime = (e: Exercise) => e.sets * 0.75 + Math.max(0, e.sets - 1) * e.rest / 60 + 1;
export const strengthTime = (exs: Exercise[], warm: number, cool: number) => warm + cool + exs.reduce((t, e) => t + workTime(e), 0);

export type StrengthBuild = { session: Session; muscleSets: Record<Muscle, number> };

/** Build every gym session of the week, splitting each muscle's weekly target across the slots that train it directly. */
export function buildStrengthWeek(p: Profile, templates: Template[], ctx: Context): { sessions: Omit<Session, 'day'>[]; muscleSets: Record<Muscle, number>; targets: Record<Muscle, number>; trimmed: boolean } {
  const targets = weeklyTargets(p, ctx);
  const plyo = p.goal === 'running' || p.goal === 'balanced';
  const usePlyo = plyo && p.runningLevel !== 'new' && p.strengthLevel !== 'new' && !ctx.moderateOnly && !ctx.deload;
  const plans = templates.map(t => {
    let slots = [...t.slots];
    if (p.focus === 'upper') slots.sort((a, b) => Number(upperFamilies.has(b[0])) - Number(upperFamilies.has(a[0])));
    if (p.focus === 'lower') slots.sort((a, b) => Number(lowerFamilies.has(b[0])) - Number(lowerFamilies.has(a[0])));
    if (usePlyo && (t.kind === 'lower' || t.kind === 'legs' || t.kind === 'full')) slots = [['plyo', 'secondary'], ...slots];
    return { t, slots };
  });
  const primary = (fam: string) => (Object.entries(families[fam].muscles).find(([, w]) => w === 1)?.[0] ?? 'core') as Muscle;
  const maxSets = p.strengthLevel === 'new' ? 3 : p.strengthLevel === 'intermediate' ? 5 : 6;
  // Resolve variants first (some families are skipped for equipment or pain), then allocate exact weekly sets.
  type Entry = { si: number; k: number; fam: string; role: Role; name: string; sets: number };
  const entries: Entry[][] = plans.map(({ slots }, si) => {
    const used: Record<string, number> = {};
    return slots.flatMap(([fam, role]) => {
      const k = used[fam] = (used[fam] ?? -1) + 1;
      const name = variantFor(p, fam, si + k);
      return name ? [{ si, k, fam, role, name, sets: fam === 'plyo' ? 2 : 0 }] : [];
    });
  });
  const flat = entries.flat();
  const roleOrder: Record<Role, number> = { main: 0, secondary: 1, accessory: 2 };
  const allocate = (m: Muscle, total: number) => {
    const slots = flat.filter(e => e.fam !== 'plyo' && primary(e.fam) === m).sort((a, b) => roleOrder[a.role] - roleOrder[b.role] || a.si - b.si);
    if (!slots.length) return;
    const n = slots.length, baseSets = Math.floor(total / n);
    slots.forEach((e, i) => { e.sets = Math.max(1, Math.min(maxSets, baseSets + (i < total - baseSets * n ? 1 : 0))); });
  };
  // Large muscles first; small muscles get their target minus the indirect work from compound lifts (fractional counting).
  for (const m of ['quads', 'hamstrings', 'glutes', 'chest', 'back', 'calves', 'core'] as Muscle[]) allocate(m, targets[m]);
  const indirect: Partial<Record<Muscle, number>> = {};
  for (const e of flat) for (const [m, w] of Object.entries(families[e.fam].muscles)) if (w === 0.5) indirect[m as Muscle] = (indirect[m as Muscle] ?? 0) + e.sets * 0.5;
  for (const m of ['shoulders', 'biceps', 'triceps'] as Muscle[]) allocate(m, Math.max(2, Math.round(targets[m] - (indirect[m] ?? 0))));
  let trimmed = false;
  const sessions = plans.map(({ t }, si) => {
    const exs: Exercise[] = [];
    for (const { fam, role, name, k, sets: full } of entries[si]) {
      const sets = ctx.deload ? Math.max(1, Math.ceil(full / 2)) : full;
      const [low, high, unit] = reps(p, role, fam, name);
      const barbell = /bilanciere/i.test(name);
      exs.push({
        id: `${si}-${fam}-${k}`, name, family: fam, sets, low, high, unit, role,
        rir: fam === 'plyo' ? 4 : rir(p, role, ctx), rest: rest(p, role, fam), load: null,
        increment: p.equipment === 'bodyweight' || fam === 'core' || fam === 'plyo' ? 0 : barbell && lowerFamilies.has(fam) ? 5 : barbell ? 2.5 : 2,
        cue: families[fam].cue, muscles: Object.keys(families[fam].muscles),
      });
    }
    // Fit the time budget: drop accessories from the end, then trim sets, then shorten accessory rests.
    let warm = p.minutes <= 30 ? 5 : 8;
    const cool = 3;
    while (strengthTime(exs, warm, cool) > p.minutes && exs.length > 3 && exs.at(-1)!.role === 'accessory') { exs.pop(); trimmed = true; }
    for (let guard = 0; strengthTime(exs, warm, cool) > p.minutes && guard < 60; guard++) {
      const e = [...exs].reverse().find(x => x.sets > 1);
      if (e) { e.sets--; trimmed = true; continue; }
      const r = exs.find(x => x.role !== 'main' && x.rest > 60);
      if (r) { r.rest = 60; continue; }
      if (warm > 4) { warm = 4; continue; }
      if (exs.length > 2) { exs.pop(); continue; }
      break;
    }
    const total = exs.reduce((a, e) => a + e.sets, 0);
    const hard = exs.some(e => ['squat', 'hinge', 'lunge'].includes(e.family) && e.role === 'main');
    const s: Omit<Session, 'day'> = {
      id: '', type: 'strength', kind: t.kind, title: t.title, hard,
      duration: Math.ceil(strengthTime(exs, warm, cool)), exercises: exs,
      phases: [
        { label: 'Riscaldamento: 3–5 minuti generali, poi serie di avvicinamento sul primo esercizio', minutes: warm, effort: 'Facile, senza affaticarti' },
        { label: 'Ritorno alla calma e note della seduta', minutes: cool, effort: 'Facile' },
      ],
      targetRpe: ctx.deload ? 5 : p.strengthLevel === 'new' || ctx.cautious || ctx.moderateOnly ? 6 : 7,
      rationale: `${total} serie di lavoro. ${ctx.deload ? 'Settimana di scarico: metà del volume e più ripetizioni in riserva, stessa frequenza. ' : ''}Ogni muscolo riceve la sua quota settimanale divisa fra le sedute, così lo alleni almeno due volte a settimana quando i giorni lo permettono. Sforzo: fermati con le ripetizioni in riserva indicate (RIR), il cedimento non è necessario.`,
      sources: cite('prescription', 'volume', 'frequency', 'effort', ...(ctx.deload ? ['deload' as const] : []), ...(usePlyo ? ['runStrength' as const] : [])),
    };
    return s;
  });
  const muscleSets = {} as Record<Muscle, number>;
  for (const m of muscles) muscleSets[m] = 0;
  for (const s of sessions) for (const e of s.exercises) for (const [m, w] of Object.entries(families[e.family].muscles)) muscleSets[m as Muscle] += e.sets * (w as number);
  for (const m of muscles) muscleSets[m] = Math.round(muscleSets[m] * 10) / 10;
  return { sessions, muscleSets, targets, trimmed };
}

export const muscleLabel = (m: string) => muscleNames[m as Muscle] ?? m;
