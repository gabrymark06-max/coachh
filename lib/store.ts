// Client-side state: every action runs the coaching engine in the browser and the result is saved on this device.
import { emptyState, type AppState, type CheckIn, type FoodEntry, type Measurement, type Profile, type WorkoutLog } from './types';
import { generatePlan, progressAfterLog, nextWeek, alternatives, now, id, cite, resolveGoal } from './planner';
import { answer } from './coach';

const KEY = 'tempra-state-v1';

export function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyState();
    const s = { ...emptyState(), ...(JSON.parse(raw) as AppState) };
    // Older logs stored only the exercise id: attach the name while the plan still matches them.
    for (const l of s.logs) for (const r of l.results) if (!r.name) { const e = s.plan?.sessions.flatMap(x => x.exercises).find(x => x.id === r.exerciseId); if (e) r.name = e.name; }
    return s;
  } catch { return emptyState(); }
}

/** Forget this device's copy (logout). */
export function clearLocal() {
  try { localStorage.removeItem(KEY); localStorage.removeItem('tempra-owner'); } catch { /* storage unavailable */ }
}

export function save(s: AppState) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { throw Error('Spazio di memoria del browser esaurito: esporta i dati ed elimina il diario più vecchio.'); }
}

const clean = (s: string, max: number) => String(s ?? '').trim().slice(0, max);
const num = (x: unknown, min: number, max: number) => { const n = Number(x); if (!Number.isFinite(n) || n < min || n > max) throw Error(`Valore fuori intervallo (${min}–${max}).`); return n; };

function validProfile(p: Profile): Profile {
  if (!clean(p.name, 60)) throw Error('Scrivi il tuo nome.');
  num(p.age, 18, 90);
  if (!Array.isArray(p.days) || p.days.length < 2 || p.days.length > 7) throw Error('Scegli da 2 a 7 giorni di allenamento.');
  num(p.minutes, 20, 120);
  if (p.weight !== null) num(p.weight, 35, 250);
  if (p.height !== null) num(p.height, 140, 220);
  if (p.waist) num(p.waist, 50, 200);
  if (p.cardio?.includes('run') && p.runningLevel !== 'new' && (!p.recentRunMinutes || !p.recentLongest || p.recentLongest > p.recentRunMinutes)) throw Error('Per la corsa indica minuti settimanali e uscita più lunga (la lunga non può superare il totale), oppure scegli «Inizio o riprendo».');
  return { ...p, name: clean(p.name, 60), restrictions: clean(p.restrictions, 1000), goalDetail: clean(p.goalDetail ?? '', 400), dislikes: clean(p.dislikes ?? '', 400) };
}

export type Action =
  | { type: 'profile'; data: Profile }
  | { type: 'log'; data: Omit<WorkoutLog, 'id' | 'date' | 'title' | 'type' | 'week'> }
  | { type: 'variant'; data: { sessionId: string; exerciseId: string; name: string } }
  | { type: 'checkin'; data: Omit<CheckIn, 'id' | 'date'> }
  | { type: 'week' }
  | { type: 'chat'; data: string }
  | { type: 'message'; data: { role: 'user' | 'assistant'; text: string; mode?: string } }
  | { type: 'measure'; data: Omit<Measurement, 'id'> & { id?: string } }
  | { type: 'measureDelete'; data: string }
  | { type: 'clearChat' }
  | { type: 'food'; data: Omit<FoodEntry, 'id'> & { id?: string } }
  | { type: 'foodDelete'; data: string }
  | { type: 'reset' };

/** Apply one action to a copy of the state. Throws an Error with a user-facing message when the action is not allowed. */
export function apply(prev: AppState, action: Action): AppState {
  const s: AppState = structuredClone(prev);
  switch (action.type) {
    case 'profile': {
      const p = resolveGoal(validProfile(action.data));
      s.profile = p;
      s.plan = generatePlan(p, s.plan);
      s.decisions.push({ id: id(), date: now(), title: s.plan.blocked ? 'Piano in attesa di valutazione' : 'Nuovo piano costruito', reason: s.plan.blocked ? s.plan.notes.join(' ') : (s.plan.blueprint?.summary ?? '') + ' I carichi si calibrano nella prima settimana.', sources: [], rule: 'initial-plan' });
      break;
    }
    case 'log': {
      const plan = s.plan;
      if (!plan || plan.blocked) throw Error('Prima crea un piano.');
      if (s.logs.some(x => x.pain && plan.sessions.some(y => y.id === x.sessionId)) || s.checkins.slice(-3).some(x => x.pain && x.date >= plan.createdAt)) throw Error('Hai segnalato dolore: prima di registrare nuove sedute fallo valutare e aggiorna il profilo.');
      const d = action.data;
      const session = plan.sessions.find(x => x.id === d.sessionId);
      if (!session) throw Error('Seduta non trovata.');
      num(d.duration, 1, 300); num(d.rpe, 1, 10);
      const expected = session.exercises.flatMap(e => Array.from({ length: e.sets }, (_, i) => `${e.id}:${i + 1}`));
      const actual = d.results.map(x => `${x.exerciseId}:${x.set}`);
      if (new Set(actual).size !== actual.length || actual.some(x => !expected.includes(x)) || (d.completed !== false && actual.length !== expected.length)) throw Error('Spunta tutte le serie fatte, oppure scegli «Parziale».');
      if (s.logs.some(x => x.sessionId === session.id && x.week === plan.week)) throw Error('Hai già registrato questa seduta questa settimana.');
      const names = new Map(session.exercises.map(e => [e.id, e.name]));
      const log: WorkoutLog = { ...d, results: d.results.map(r => ({ ...r, name: names.get(r.exerciseId) })), note: clean(d.note ?? '', 1000), id: id(), date: now(), title: session.title, type: session.type, week: plan.week, plannedDuration: session.duration, plannedRpe: session.targetRpe, plannedRunMinutes: session.runMinutes };
      s.logs.push(log);
      log.feedback = progressAfterLog(s, log);
      s.decisions.push(...log.feedback);
      break;
    }
    case 'variant': {
      const plan = s.plan;
      if (!plan || !s.profile || plan.blocked) throw Error('Prima crea un piano.');
      const session = plan.sessions.find(x => x.id === action.data.sessionId);
      const e = session?.exercises.find(x => x.id === action.data.exerciseId);
      if (!session || !e || !alternatives(s.profile, e).includes(action.data.name)) throw Error('Variante non disponibile.');
      if (s.logs.some(x => x.sessionId === session.id && x.week === plan.week)) throw Error('Cambia la variante dalla prossima settimana.');
      e.name = action.data.name; e.id = id(); e.load = null;
      if (e.family === 'core') { const sec = /plank/i.test(e.name); e.unit = sec ? 'seconds' : 'reps'; e.low = sec ? 20 : 8; e.high = sec ? 40 : 12; }
      s.decisions.push({ id: id(), date: now(), title: 'Variante scelta da te', reason: `${e.name}: riparti dalla calibrazione del carico. Il movimento resta nella stessa famiglia.`, sources: cite('enjoyment', 'exerciseChoice'), rule: 'user-choice' });
      break;
    }
    case 'checkin': {
      const d = action.data;
      num(d.sleep, 0, 16); num(d.fatigue, 1, 5); num(d.soreness, 1, 5);
      if (d.weight !== null) num(d.weight, 35, 250);
      s.checkins.push({ ...d, note: clean(d.note, 1000), id: id(), date: now() });
      s.checkins = s.checkins.slice(-400);
      break;
    }
    case 'week': s.decisions.push(nextWeek(s)); break;
    case 'chat': {
      const q = clean(action.data, 2000);
      if (!q) throw Error('Scrivi una domanda.');
      const a = answer(q, s);
      s.messages.push({ id: id(), date: now(), role: 'user', text: q, sources: [] }, { id: id(), date: now(), role: 'assistant', ...a });
      s.messages = s.messages.slice(-80);
      break;
    }
    case 'message': {
      const text = clean(action.data.text, action.data.role === 'user' ? 2000 : 8000);
      if (!text) throw Error('Scrivi una domanda.');
      s.messages.push({ id: id(), date: now(), role: action.data.role, text, sources: [], mode: action.data.mode });
      s.messages = s.messages.slice(-80);
      break;
    }
    case 'clearChat': s.messages = []; break;
    case 'measure': {
      const d = action.data;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date)) throw Error('Data non valida.');
      const opt = (x: number | null, min: number, max: number) => (x === null || x === undefined || Number.isNaN(x) ? null : num(x, min, max));
      const m: Measurement = {
        id: d.id ?? id(), date: d.date, weight: opt(d.weight, 35, 250), waist: opt(d.waist, 40, 200), chest: opt(d.chest, 50, 200),
        arm: opt(d.arm, 15, 70), thigh: opt(d.thigh, 30, 100), hips: opt(d.hips, 50, 200), note: clean(d.note, 500), photos: d.photos ?? {},
      };
      if (![m.weight, m.waist, m.chest, m.arm, m.thigh, m.hips].some(x => x !== null) && !Object.keys(m.photos).length) throw Error('Inserisci almeno una misura o una foto.');
      s.measurements = [...(s.measurements ?? []).filter(x => x.id !== m.id), m].sort((a, b) => a.date.localeCompare(b.date));
      // The latest measurement keeps the profile current, so calories and body-fat estimates follow the real body.
      if (s.profile && m.id === s.measurements.at(-1)?.id) s.profile = { ...s.profile, ...(m.waist ? { waist: m.waist } : {}), ...(m.weight ? { weight: m.weight } : {}) };
      break;
    }
    case 'food': {
      const d = action.data;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date)) throw Error('Data non valida.');
      if (!['breakfast', 'lunch', 'dinner', 'snack'].includes(d.meal)) throw Error('Pasto non valido.');
      const name = clean(d.name, 120);
      if (!name) throw Error('Scrivi il nome dell’alimento.');
      const e: FoodEntry = {
        id: d.id ?? id(), date: d.date, meal: d.meal, name, brand: d.brand ? clean(d.brand, 80) : undefined, grams: num(d.grams, 1, 3000),
        kcal: num(d.kcal, 0, 950), p: num(d.p, 0, 100), c: num(d.c, 0, 100), f: num(d.f, 0, 100), code: d.code, source: d.source,
      };
      s.foods = [...(s.foods ?? []).filter(x => x.id !== e.id), e].slice(-4000);
      break;
    }
    case 'foodDelete': s.foods = (s.foods ?? []).filter(x => x.id !== action.data); break;
    case 'measureDelete': s.measurements = (s.measurements ?? []).filter(x => x.id !== action.data); break;
    case 'reset': return { ...emptyState(), revision: prev.revision + 1 };
  }
  s.decisions = s.decisions.slice(-200);
  s.revision = prev.revision + 1;
  return s;
}
