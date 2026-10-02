// Client-side state: every action runs the coaching engine in the browser and the result is saved on this device.
import { emptyState, type AppState, type CatalogEntry, type CheckIn, type DietTargets, type Exercise, type FoodEntry, type Measurement, type MyMeal, type Plan, type Profile, type SavedMeal, type Session, type WorkoutLog } from './types';
import { generatePlan, progressAfterLog, nextWeek, alternatives, now, id, cite, resolveGoal, measureTdee, sessionTime } from './planner';
import { findGeneric } from './foods';
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
  | { type: 'foods'; data: (Omit<FoodEntry, 'id'> & { id?: string })[] }
  | { type: 'mealSave'; data: { name: string; items: Omit<FoodEntry, 'id' | 'date' | 'meal'>[] } }
  | { type: 'mealDelete'; data: string }
  | { type: 'customExercise'; data: Omit<CatalogEntry, 'id' | 'src' | 'c' | 'l' | 'mu'> & { id?: string } }
  | { type: 'customExerciseDelete'; data: string }
  | { type: 'customPlan'; data: { id?: string; title: string; day: number; exercises: Exercise[] }[] }
  | { type: 'coachPlan' }
  | { type: 'diet'; data: DietTargets | null }
  | { type: 'myDay'; data: { training: MyMeal[]; rest: MyMeal[] } | null }
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
    case 'clearChat': tomb(s, s.messages.map(m => m.id)); s.messages = []; break;
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
      const e = validFood(action.data);
      s.foods = [...(s.foods ?? []).filter(x => x.id !== e.id), e].slice(-4000);
      break;
    }
    case 'foods': {
      if (!action.data.length) throw Error('Niente da aggiungere.');
      const list = action.data.slice(0, 40).map(validFood), ids = new Set(list.map(x => x.id));
      s.foods = [...(s.foods ?? []).filter(x => !ids.has(x.id)), ...list].slice(-4000);
      break;
    }
    case 'mealSave': {
      const name = clean(action.data.name, 60);
      if (!name) throw Error('Dai un nome al pasto.');
      if (!action.data.items.length) throw Error('Il pasto è vuoto.');
      const items = action.data.items.slice(0, 30).map(x => { const f = validFood({ ...x, date: '2000-01-01', meal: 'lunch' }); return { name: f.name, brand: f.brand, grams: f.grams, kcal: f.kcal, p: f.p, c: f.c, f: f.f, code: f.code, source: f.source }; });
      const meal: SavedMeal = { id: id(), name, items };
      s.meals = [...(s.meals ?? []).filter(m => m.name.toLowerCase() !== name.toLowerCase()), meal].slice(-200);
      break;
    }
    case 'customExercise': {
      const d = action.data, name = clean(d.n, 80);
      if (!name) throw Error('Dai un nome all’esercizio.');
      if (!d.g?.length) throw Error('Scegli almeno un muscolo.');
      const e: CatalogEntry = { id: d.id ?? 'c-' + id(), n: name, eq: clean(d.eq, 30) || 'altro', mu: [], g: d.g.slice(0, 4), c: 'forza', l: 1, s: (d.s ?? []).map(x => clean(x, 300)).filter(Boolean).slice(0, 8), unit: d.unit === 'seconds' ? 'seconds' : undefined, src: 'custom' };
      s.customExercises = [...(s.customExercises ?? []).filter(x => x.id !== e.id), e].slice(-300);
      break;
    }
    case 'customExerciseDelete': s.customExercises = (s.customExercises ?? []).filter(x => x.id !== action.data); tomb(s, [action.data]); break;
    case 'customPlan': {
      if (!s.profile) throw Error('Prima compila il profilo.');
      s.plan = customPlan(action.data, s.plan);
      s.decisions.push({ id: id(), date: now(), title: 'Piano tuo', reason: `${s.plan.sessions.length} sedute a settimana scelte da te. Non cambio esercizi, serie e giorni: ti suggerisco il carico di ogni esercizio dalla volta prima e il riscaldamento.`, sources: cite('progression', 'autoregulation'), rule: 'custom-plan' });
      break;
    }
    case 'coachPlan': {
      if (!s.profile) throw Error('Prima compila il profilo.');
      s.plan = generatePlan(s.profile);
      s.decisions.push({ id: id(), date: now(), title: 'Piano del coach', reason: s.plan.blueprint?.summary ?? '', sources: [], rule: 'initial-plan' });
      break;
    }
    case 'diet': {
      const d = action.data;
      if (d) for (const k of ['training', 'rest'] as const) {
        const m = d[k];
        num(m.protein, 0, 500); num(m.carbs, 0, 1200); num(m.fat, 0, 400);
        m.kcal = Math.round(m.protein * 4 + m.carbs * 4 + m.fat * 9);
        if (m.kcal < 1000 || m.kcal > 6000) throw Error('Le calorie devono stare tra 1000 e 6000 al giorno.');
      }
      s.diet = d;
      break;
    }
    case 'myDay': {
      const d = action.data;
      if (d) for (const k of ['training', 'rest'] as const) {
        d[k] = d[k].slice(0, 8).map(m => ({ name: clean(m.name, 40) || 'Pasto', items: m.items.filter(i => findGeneric(i.food)).slice(0, 15).map(i => ({ food: i.food, grams: num(Math.round(i.grams), 1, 2000) })) })).filter(m => m.items.length);
        if (!d[k].length) throw Error(`Aggiungi almeno un alimento alla giornata ${k === 'training' ? 'di allenamento' : 'di riposo'}.`);
      }
      s.myDay = d;
      break;
    }
    case 'mealDelete': s.meals = (s.meals ?? []).filter(x => x.id !== action.data); tomb(s, [action.data]); break;
    case 'foodDelete': s.foods = (s.foods ?? []).filter(x => x.id !== action.data); tomb(s, [action.data]); break;
    case 'measureDelete': s.measurements = (s.measurements ?? []).filter(x => x.id !== action.data); tomb(s, [action.data]); break;
    case 'reset': {
      const out: AppState = { ...emptyState(), revision: prev.revision + 1, deleted: { ...prev.deleted } };
      tomb(out, [...prev.logs, ...prev.checkins, ...prev.decisions, ...prev.messages, ...(prev.measurements ?? []), ...(prev.foods ?? []), ...(prev.meals ?? [])].map(x => x.id));
      out.updatedAt = new Date().toISOString();
      return out;
    }
  }
  // Every two weeks, with enough food log and weigh-ins, maintenance calories are re-measured on the person.
  if (['food', 'foods', 'checkin', 'measure'].includes(action.type) && (!s.tdee || Date.now() - Date.parse(s.tdee.date) > 14 * 86400000)) {
    const t = measureTdee(s);
    if (t) {
      s.tdee = t;
      s.decisions.push({ id: id(), date: now(), title: `Mantenimento misurato: ${t.kcal.toLocaleString('it-IT')} kcal`, reason: `Negli ultimi ${t.days} giorni registrati hai mangiato in media ${t.intake.toLocaleString('it-IT')} kcal e il peso è cambiato di ${t.weeklyChange >= 0 ? '+' : ''}${t.weeklyChange.toLocaleString('it-IT')} kg a settimana. Gli obiettivi di calorie ora partono da questo valore, non solo dalla formula.`, sources: cite('adaptiveTdee'), rule: 'measured-tdee' });
    }
  }
  s.decisions = s.decisions.slice(-200);
  s.revision = prev.revision + 1;
  s.updatedAt = new Date().toISOString();
  return s;
}

/** The person's own plan: their days, exercises and sets. The week counter and last loads carry over from a previous own plan. */
function customPlan(days: { id?: string; title: string; day: number; exercises: Exercise[] }[], prev: Plan | null): Plan {
  if (!days.length) throw Error('Aggiungi almeno un giorno di allenamento.');
  if (days.length > 7 || new Set(days.map(d => d.day)).size !== days.length) throw Error('Ogni giorno della settimana può avere una sola seduta.');
  const keep = prev?.custom ? prev : null;
  const loads = new Map((prev?.sessions ?? []).flatMap(x => x.exercises).map(e => [e.name, e.load]));
  const sessions: Session[] = days.map(d => {
    if (!d.exercises.length) throw Error(`«${d.title || 'Seduta'}»: aggiungi almeno un esercizio.`);
    const exercises = d.exercises.slice(0, 20).map(e => {
      const unit = e.unit === 'seconds' ? 'seconds' : 'reps';
      const low = num(Math.round(e.low), 1, unit === 'seconds' ? 600 : 100), high = num(Math.round(e.high), low, unit === 'seconds' ? 600 : 100);
      return { ...e, id: e.id || id(), name: clean(e.name, 80), sets: num(Math.round(e.sets), 1, 10), low, high, rir: num(Math.round(e.rir), 0, 5), rest: num(Math.round(e.rest), 15, 600), load: e.load ?? loads.get(e.name) ?? null, unit } as Exercise;
    });
    const groups = exercises.flatMap(e => e.muscles ?? []);
    const lower = groups.filter(g => ['quads', 'hamstrings', 'glutes', 'calves'].includes(g)).length, upper = groups.length - lower;
    const s: Session = {
      id: d.id || id(), day: num(d.day, 0, 6), type: 'strength', title: clean(d.title, 40) || 'Seduta', duration: 0, rationale: '', sources: [], exercises,
      kind: lower > upper * 2 ? 'lower' : upper > lower * 2 ? 'upper' : 'full', targetRpe: 7,
      phases: [{ label: 'Riscaldamento', minutes: 8, effort: 'Cardio leggero, mobilità e serie di avvicinamento' }, { label: 'Ritorno alla calma e note della seduta', minutes: 3, effort: 'Facile' }],
    };
    s.duration = sessionTime(s);
    return s;
  }).sort((a, b) => a.day - b.day);
  return { id: keep?.id ?? id(), createdAt: keep?.createdAt ?? now(), version: (prev?.version ?? 0) + 1, week: keep?.week ?? 1, sessions, notes: [], blocked: false, custom: true, engineVersion: prev?.engineVersion };
}

/** Remember removed ids, so merging with another device's copy does not bring them back. */
function tomb(s: AppState, ids: string[]) {
  const at = new Date().toISOString();
  s.deleted = { ...s.deleted, ...Object.fromEntries(ids.map(x => [x, at])) };
}

function validFood(d: Omit<FoodEntry, 'id'> & { id?: string }): FoodEntry {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date)) throw Error('Data non valida.');
  if (!['breakfast', 'lunch', 'dinner', 'snack'].includes(d.meal)) throw Error('Pasto non valido.');
  const name = clean(d.name, 120);
  if (!name) throw Error('Scrivi il nome dell’alimento.');
  return {
    id: d.id ?? id(), date: d.date, meal: d.meal, name, brand: d.brand ? clean(d.brand, 80) : undefined, grams: num(d.grams, 1, 3000),
    kcal: num(d.kcal, 0, 950), p: num(d.p, 0, 100), c: num(d.c, 0, 100), f: num(d.f, 0, 100), code: d.code, source: d.source,
  };
}
