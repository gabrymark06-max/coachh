// Client-side state: every action runs the coaching engine in the browser and the result is saved on this device.
import { emptyState, type AppState, type CheckIn, type Profile, type WorkoutLog } from './types';
import { generatePlan, progressAfterLog, nextWeek, alternatives, now, id, cite, resolveGoal } from './planner';
import { answer } from './coach';

const KEY = 'tempra-state-v1';

export function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyState();
    const s = JSON.parse(raw) as AppState;
    return { ...emptyState(), ...s };
  } catch { return emptyState(); }
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
      const log: WorkoutLog = { ...d, note: clean(d.note, 1000), id: id(), date: now(), title: session.title, type: session.type, week: plan.week, plannedDuration: session.duration, plannedRpe: session.targetRpe, plannedRunMinutes: session.runMinutes };
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
    case 'reset': return { ...emptyState(), revision: prev.revision + 1 };
  }
  s.decisions = s.decisions.slice(-200);
  s.revision = prev.revision + 1;
  return s;
}
