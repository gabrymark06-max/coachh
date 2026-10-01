import type { Profile, Progress, RunKind, Session } from '../types';
import { cite } from './refs';

// Run/walk progression: [run minutes, walk minutes, repetitions]. Advances one step only after an easy, pain-free week.
export const RUN_WALK: [number, number, number][] = [
  [1, 2, 6], [1, 1.5, 8], [2, 1.5, 7], [3, 1.5, 6], [5, 2, 4], [8, 2, 3], [10, 1.5, 2], [15, 1, 2], [20, 0, 1], [25, 0, 1], [30, 0, 1],
];
export const LONG_TARGET: Record<NonNullable<Profile['event']>, number> = { none: 90, '5k': 60, '10k': 75, half: 110, marathon: 160 };

export const isBeginnerRunner = (p: Profile) => p.runningLevel === 'new' || p.recentRunMinutes < 20 || p.recentLongest < 10;
export const maxLong = (p: Profile) => Math.max(p.minutes, Math.min(180, p.longRunMinutes ?? 0));
const lowerLimbPain = (p: Profile) => !!p.painCleared && (p.painAreas ?? []).some(a => ['knee', 'shin', 'achilles', 'hip'].includes(a));

export function initialRunProgress(p: Profile, rc: number): Pick<Progress, 'runMinutes' | 'longRun' | 'runWalkStep'> {
  const longest = Math.max(0, p.recentLongest);
  let step = 0;
  RUN_WALK.forEach(([run], i) => { if (run <= Math.max(1, longest * 0.8)) step = i; });
  const runMinutes = isBeginnerRunner(p) ? 0 : Math.min(p.recentRunMinutes, rc * p.minutes);
  return { runMinutes, longRun: Math.min(longest, maxLong(p)), runWalkStep: step };
}

type RunCtx = { deload: boolean; mesoWeek: number; moderateOnly: boolean; shortSleep: boolean };
type RunSpec = Omit<Session, 'day'>;

const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));

function phasesFor(kind: RunKind, minutes: number, p: Profile, extra: { strides?: boolean; eventPace?: boolean }): Session['phases'] {
  const out: Session['phases'] = [];
  const add = (label: string, m: number, effort: string) => { if (m > 0) out.push({ label, minutes: m, effort }); };
  const rest = () => minutes - out.reduce((t, x) => t + x.minutes, 0);
  if (kind === 'easy' || kind === 'long') {
    const warm = minutes >= 20 ? 5 : 2;
    add('Avvio molto facile, anche camminando', warm, 'RPE 2–3/10');
    if (extra.strides && minutes >= 25) {
      add(kind === 'long' ? 'Corsa lunga facile' : 'Corsa facile continua', minutes - warm - 4, 'Zona 1: riesci a parlare in frasi complete · RPE 3–4');
      add('6 allunghi da 20 s, rilassati, con 40 s di cammino', 4, 'Veloci ma sciolti, non uno sprint');
    } else add(kind === 'long' ? 'Corsa lunga facile' : 'Corsa facile continua', rest(), 'Zona 1: riesci a parlare in frasi complete · RPE 3–4');
    return out;
  }
  const warm = 10, cool = clamp(Math.round(minutes * 0.15), 5, 10);
  add('Riscaldamento: corsa facile + 3 allunghi', warm, 'Zona 1');
  const main = minutes - warm - cool;
  if (kind === 'tempo') {
    const reps = main >= 24 ? 3 : main >= 16 ? 2 : 1;
    const block = Math.max(4, Math.floor((main - (reps - 1) * 2) / reps));
    add(`${reps} × ${block} min a ritmo soglia con 2 min facili`, main, 'Zona 2: poche parole alla volta · RPE 6–7');
  } else if (kind === 'intervals') {
    const reps = clamp(Math.floor(main / 5), 3, 6);
    add(`${reps} × 3 min intensi con 2 min di corsa lenta`, main, 'Zona 3: non riesci a parlare · RPE 8');
  } else if (kind === 'hills') {
    const reps = clamp(Math.floor(main / 2.25), 4, 10);
    add(`${reps} × 45 s in salita, ritorno camminando`, main, 'Forte ma controllato · RPE 7–8');
  } else {
    add(extra.eventPace ? '2 blocchi al ritmo gara previsto con 3 min facili' : 'Blocchi a ritmo medio', main, 'Ritmo gara: controllato · RPE 6');
  }
  add('Defaticamento facile', rest(), 'Zona 1');
  return out;
}

function runWalkSession(p: Profile, step: number): RunSpec {
  const [run, walk, reps0] = RUN_WALK[clamp(step, 0, RUN_WALK.length - 1)];
  let reps = reps0;
  const block = () => reps * (run + walk);
  while (10 + block() > p.minutes && reps > 1) reps--;
  let runMain = run * reps;
  const phases: Session['phases'] = [{ label: 'Cammino progressivo', minutes: 5, effort: 'RPE 2–3/10' }];
  if (walk > 0) phases.push({ label: `${reps} × (${run} min corsa + ${walk} min cammino)`, minutes: Math.round(block()), effort: 'Corsa: RPE 3–4, conversazione possibile' });
  else {
    runMain = Math.min(run, p.minutes - 10);
    phases.push({ label: `${runMain} min di corsa continua facile`, minutes: runMain, effort: 'Zona 1: frasi complete · RPE 3–4' });
  }
  phases.push({ label: 'Cammino di ritorno', minutes: 5, effort: 'Molto facile' });
  const duration = phases.reduce((t, x) => t + x.minutes, 0);
  return {
    id: '', type: 'run', kind: 'runwalk', title: walk > 0 ? 'Corsa/cammino' : 'Prima corsa continua', duration, phases, targetRpe: 4, runMinutes: runMain, exercises: [], hard: false,
    rationale: `Fase ${step + 1} di ${RUN_WALK.length} della progressione corsa/cammino. Si passa alla fase successiva solo dopo una settimana completata facilmente e senza dolore: progredisci una variabile alla volta, perché salti bruschi della singola uscita si associano a più infortuni.`,
    sources: cite('runProgression', 'zones', 'enjoyment'),
  };
}

export type RunWeek = { sessions: RunSpec[]; weeklyMinutes: number; quality: number; note: string | null };

export function buildRunWeek(p: Profile, rc: number, progress: Progress, ctx: RunCtx): RunWeek {
  if (rc <= 0) return { sessions: [], weeklyMinutes: 0, quality: 0, note: null };
  if (isBeginnerRunner(p) && progress.runWalkStep < RUN_WALK.length - 1) {
    const step = ctx.deload ? Math.max(0, progress.runWalkStep - 1) : progress.runWalkStep;
    const sessions = Array.from({ length: rc }, () => runWalkSession(p, step));
    return { sessions, weeklyMinutes: sessions.reduce((t, s) => t + (s.runMinutes ?? 0), 0), quality: 0, note: null };
  }
  const restricted = lowerLimbPain(p) || ctx.moderateOnly;
  const ew = progress.eventWeeks;
  const taper = ew !== null && ew <= 2;
  let W = progress.runMinutes || rc * 20;
  let L = Math.max(15, progress.longRun || 20);
  if (ctx.deload) { W *= 0.7; L *= 0.75; }
  if (taper) { W *= ew === 0 ? 0.45 : 0.6; L *= ew === 0 ? 0.4 : 0.6; }
  if (W < rc * 12) {
    // Low weekly volume spread over many days: equal short easy runs, no long run, total within the recent dose.
    const each = Math.max(3, Math.floor(W / rc));
    const sessions = Array.from({ length: rc }, (): RunSpec => {
      const phases = each >= 12 ? phasesFor('easy', each, p, {}) : [
        { label: 'Cammino progressivo', minutes: 5, effort: 'RPE 2–3/10' },
        { label: `${each} min di corsa facile`, minutes: each, effort: 'Zona 1: frasi complete · RPE 3–4' },
        { label: 'Cammino di ritorno', minutes: 5, effort: 'Molto facile' },
      ];
      const duration = phases.reduce((t, x) => t + x.minutes, 0);
      return { id: '', type: 'run', kind: 'easy', title: 'Corsa facile breve', duration, phases, exercises: [], hard: false, targetRpe: 4, runMinutes: each,
        rationale: 'Il tuo volume recente è piccolo rispetto ai giorni scelti: distribuisco gli stessi minuti in uscite brevi e facili invece di aumentarli tutti insieme.', sources: cite('runProgression', 'zones') };
    });
    return { sessions, weeklyMinutes: each * rc, quality: 0, note: null };
  }
  const target = LONG_TARGET[p.event ?? 'none'];
  L = Math.min(L, maxLong(p), target);
  // Quality sessions by level, goal and available days.
  let q = 0;
  if (!restricted) {
    if (p.runningLevel === 'experienced' && rc >= 4 && (p.goal === 'running' || (p.event && p.event !== 'none'))) q = 2;
    else if (rc >= 3 || (rc >= 2 && (p.goal === 'running' || (p.event && p.event !== 'none')))) q = 1;
    if (ctx.deload) q = Math.max(0, q - 1);
  }
  const kinds: RunKind[] = [];
  if (rc >= 2) kinds.push('long');
  const event = p.event ?? 'none';
  const qualityOrder: RunKind[] = event === '5k' || event === '10k' ? ['intervals', 'tempo'] : event === 'half' || event === 'marathon' ? ['tempo', ew !== null && ew <= 8 ? 'race-pace' : 'intervals'] : progress.mesoWeek % 2 ? ['tempo', 'intervals'] : ['intervals', 'tempo'];
  for (let i = 0; i < q; i++) {
    let k = qualityOrder[i];
    if (k === 'intervals' && ctx.shortSleep) k = 'tempo';
    if (progress.mesoWeek % 3 === 0 && i === q - 1 && !taper && event !== 'marathon') k = 'hills';
    kinds.push(k);
  }
  while (kinds.length < rc) kinds.push('easy');
  const minFor: Record<RunKind, number> = { easy: 10, long: 15, tempo: 25, intervals: 30, hills: 25, 'race-pace': 35, runwalk: 15, strides: 10 };
  // Drop quality work if the weekly budget cannot hold it.
  const sumMin = () => kinds.reduce((t, k) => t + minFor[k], 0);
  while (sumMin() > W && kinds.some(k => !['easy', 'long'].includes(k))) { const i = kinds.findIndex(k => !['easy', 'long'].includes(k)); kinds[i] = 'easy'; q--; }
  const minutes: number[] = kinds.map(() => 0);
  const qualityDesired: Record<string, number> = { tempo: clamp(Math.round(W * 0.22), 25, 50), intervals: clamp(Math.round(W * 0.22), 30, 45), hills: clamp(Math.round(W * 0.18), 25, 40), 'race-pace': clamp(Math.round(W * 0.25), 35, 60) };
  kinds.forEach((k, i) => { if (qualityDesired[k]) minutes[i] = Math.min(qualityDesired[k], p.minutes); });
  const easyCount = kinds.filter(k => k === 'easy').length;
  const others = minutes.reduce((a, b) => a + b, 0) + easyCount * minFor.easy;
  kinds.forEach((k, i) => { if (k === 'long') minutes[i] = Math.max(minFor.long, Math.min(Math.round(L), W - others)); });
  const remaining = W - minutes.reduce((a, b) => a + b, 0);
  kinds.forEach((k, i) => { if (k === 'easy') minutes[i] = clamp(Math.floor(remaining / Math.max(1, easyCount)), 8, p.minutes); });
  // Long run must stay the longest easy run; never above the per-session limit.
  const sessions: RunSpec[] = kinds.map((k, i) => {
    const m = Math.max(8, Math.floor(k === 'long' ? Math.min(minutes[i], maxLong(p)) : Math.min(minutes[i], p.minutes)));
    const strides = k === 'easy' && q === 0 && !restricted && p.runningLevel !== 'new' && i === kinds.lastIndexOf('easy');
    const phases = phasesFor(k, m, p, { strides, eventPace: event === 'half' || event === 'marathon' });
    const titles: Record<string, string> = { easy: strides ? 'Corsa facile + allunghi' : 'Corsa facile', long: 'Uscita lunga', tempo: 'Soglia', intervals: 'Intervalli', hills: 'Salite', 'race-pace': 'Ritmo gara' };
    const hard = k !== 'easy';
    const rationale: Record<string, string> = {
      easy: 'La maggior parte della corsa resta facile: costruisce la base aerobica con poco costo di recupero.',
      long: `L’uscita più lunga della settimana. Cresce a piccoli passi: superare di molto l’uscita più lunga recente è il segnale di rischio più chiaro nei dati sui runner.${m > 75 ? ' Oltre 75–90 minuti porta 30–60 g di carboidrati all’ora e acqua secondo sete.' : ''}`,
      tempo: 'Lavoro a soglia: migliora il ritmo sostenibile. Parli solo a poche parole.',
      intervals: 'Ripetute da 3 minuti: gli intervalli più lunghi danno i maggiori guadagni di VO2max nelle meta-analisi.',
      hills: 'Salite brevi: stimolo intenso con meno impatto della pista.',
      'race-pace': 'Blocchi al ritmo che userai in gara, per prendere confidenza con passo e rifornimento.',
    };
    return {
      id: '', type: 'run', kind: k, title: titles[k], duration: phases.reduce((t, x) => t + x.minutes, 0), phases, exercises: [], hard,
      targetRpe: k === 'easy' || k === 'long' ? 4 : k === 'intervals' ? 8 : 7, runMinutes: m,
      rationale: rationale[k] + (taper ? ' Settimana di avvicinamento alla gara: volume ridotto, intensità mantenuta.' : ''),
      sources: cite(...(k === 'easy' ? ['intensityDistribution', 'zones'] as const : k === 'long' ? ['runProgression', 'fueling'] as const : ['intervals', 'intensityDistribution', 'zones'] as const), ...(taper ? ['taper' as const] : [])),
    };
  });
  const note = restricted ? 'Per la zona dolente o le indicazioni di salute non programmo intervalli né salite: solo corsa facile finché il professionista che ti segue non lo consente.' : null;
  return { sessions, weeklyMinutes: sessions.reduce((t, s) => t + (s.runMinutes ?? 0), 0), quality: kinds.filter(k => !['easy', 'long'].includes(k)).length, note };
}
