import { goalNames, phaseNames } from '../types';
import type { AppState, Blueprint, Decision, Exercise, Plan, Profile, Progress, Reason, Session, WorkoutLog, Zone } from '../types';
import { cite } from './refs';
import { alternativesFor } from './exercises';
import { buildStrengthWeek, splitFor, splitName, strengthTime, muscleLabel, type Context } from './strength';
import { initialRunProgress, isBeginnerRunner, RUN_WALK, LONG_TARGET, maxLong } from './running';
import { buildCardioWeek, initialCardio, coreGoal, wantsRun, CARDIO_TARGET, STEPS_TARGET, type CardioWeek } from './cardio';
import { schedule } from './schedule';
import { nutrition, phaseFor, recommendPhase, bandOf } from './nutrition';
import { suggest, history, bestE1rm, primeMovers } from './progression';
import { muscleNames, type Muscle } from './exercises';

export const id = () => crypto.randomUUID();
export const now = () => new Date().toISOString();
export const ENGINE_VERSION = 3;

/* ---------- Safety gate (ACSM pre-participation logic + PAR-Q+) ---------- */
export function gate(p: Profile) {
  const flags = p.screening ?? [];
  const symptoms = flags.includes('chest') || flags.includes('dizzy');
  const known = flags.includes('heart') || flags.includes('meds') || flags.includes('pregnancy');
  if ((p.clinical || symptoms) && !p.medicalClearance) return { blocked: true, moderateOnly: false, reason: symptoms ? 'Hai indicato sintomi (dolore al petto, capogiri o perdita di coscienza) che richiedono una valutazione medica prima di allenarti. Quando un medico ti autorizza, segnalalo nel profilo e costruisco il piano.' : 'Hai indicato condizioni che richiedono un professionista. Quando hai la sua autorizzazione, segnalalo nel profilo e costruisco il piano rispettando le sue indicazioni.' };
  if (p.pain && !p.painCleared) return { blocked: true, moderateOnly: false, reason: 'Hai indicato dolore o un infortunio attuale. Fallo valutare: se il professionista ti autorizza ad allenarti, indica la zona e la conferma nel profilo e adatto esercizi e corsa.' };
  return { blocked: false, moderateOnly: known && !p.medicalClearance, reason: '' };
}

/* ---------- Week structure ---------- */
/** Gym is the base: the coach decides how many of the available days go to the gym, the rest become cardio. */
export function split(p: Profile) {
  const n = p.days.length;
  const g = coreGoal(p);
  const max = p.strengthLevel === 'new' ? 4 : p.strengthLevel === 'experienced' && (g === 'muscle' || g === 'strength') ? 6 : 5;
  const auto = g === 'health' ? Math.min(n, 3) : g === 'fat-loss' ? Math.min(n, 4, max) : Math.min(n, max);
  const sc = Math.max(1, Math.min(n, p.strengthDays || auto));
  return { sc, rc: n - sc };
}

/** Map legacy goals and resolve "advise me" from estimated body fat. */
export function resolveGoal(p: Profile): Profile {
  let goal: Profile['goal'] = p.goal === 'balanced' ? 'recomp' : p.goal === 'running' ? 'health' : p.goal;
  if (p.goalAuto) {
    const band = bandOf(p);
    goal = band === 'high' ? 'fat-loss' : band === 'high-ish' ? 'recomp' : band === 'lean' ? 'muscle' : p.strengthLevel === 'new' ? 'recomp' : 'muscle';
  }
  return { ...p, goal };
}

function initialProgress(p: Profile): Progress {
  const { rc } = split(p);
  const eventWeeks = p.event && p.event !== 'none' && p.eventWeeks ? p.eventWeeks : null;
  return { mesoWeek: 1, mesoLength: p.strengthLevel === 'new' ? 4 : 5, mesoCount: 1, setBonus: 0, eventWeeks, ...initialRunProgress(p, Math.max(1, rc)), ...initialCardio(p) };
}

const isDeload = (pr: Progress) => pr.mesoWeek === pr.mesoLength && !(pr.eventWeeks !== null && pr.eventWeeks <= 3);

function coaching(p: Profile) {
  const goal = { health: 'La regolarità è il tuo primo risultato.', performance: 'Confronta la prestazione a parità di tecnica e sforzo.', appearance: 'Guarda i trend di settimane: una seduta non misura il cambiamento fisico.', enjoyment: 'Il gradimento è un dato utile: segnala quello che vorresti cambiare.' }[p.motivation || 'health'];
  const barrier = { none: '', time: 'Se manca tempo, fai una versione corta e registrala come parziale: conta più della seduta saltata.', fatigue: 'Prima di partire valuta fatica e sonno; evita di forzare lo sforzo previsto.', boredom: 'Puoi scegliere una variante equivalente per ogni esercizio.' }[p.barrier || 'none'];
  const style = p.coachStyle === 'direct' ? 'Registra i risultati reali e valuta il prossimo passo.' : p.coachStyle === 'technical' ? 'Usa RIR, RPE e dose completata per confronti ripetibili.' : 'Non devi dimostrare tutto oggi: un feedback sincero rende il piano più utile.';
  return `${goal} ${barrier} ${style}`.replace(/\s+/g, ' ').trim();
}

function zones(p: Profile): Zone[] {
  const hrMax = Math.round(208 - 0.7 * p.age);
  const hr = (a: number, b: number) => `${Math.round(hrMax * a)}–${Math.round(hrMax * b)} bpm`;
  return [
    { name: 'Zona 1 · facile', talk: 'Parli in frasi complete', rpe: 'RPE 3–4', hr: hr(0.6, 0.75), use: 'Corse facili, uscita lunga, riscaldamento' },
    { name: 'Zona 2 · soglia', talk: 'Poche parole alla volta', rpe: 'RPE 6–7', hr: hr(0.8, 0.88), use: 'Soglia, ritmo gara di mezza e maratona' },
    { name: 'Zona 3 · intensa', talk: 'Non riesci a parlare', rpe: 'RPE 8–9', hr: `oltre ${Math.round(hrMax * 0.9)} bpm`, use: 'Intervalli e salite' },
  ];
}

type Built = { sessions: Session[]; blueprint: Blueprint; notes: string[] };

function buildWeek(p: Profile, pr: Progress, prev?: Plan | null): Built {
  const { sc, rc } = split(p);
  const g = gate(p);
  const deload = isDeload(pr);
  const cautious = (p.stress ?? 1) >= 4 || (p.confidence ?? 3) <= 2 || (p.sleepHours ?? 8) < 6;
  const ctx: Context = { deload, mesoWeek: pr.mesoWeek, mesoLength: pr.mesoLength, setBonus: pr.setBonus, cautious, moderateOnly: g.moderateOnly, block: pr.mesoCount, muscleBonus: pr.muscleBonus };
  const strength = buildStrengthWeek(p, splitFor(p, sc), ctx);
  const cardio = buildCardioWeek(p, rc, pr, strength.sessions, { deload, moderateOnly: g.moderateOnly, mesoWeek: pr.mesoWeek, shortSleep: (p.sleepHours ?? 8) < 6 });
  const coach = coaching(p);
  let sessions = schedule(p.days, [...strength.sessions, ...cardio.sessions]).map(s => ({ ...s, coaching: coach }));
  // Stable identities: reuse ids of the previous week by title occurrence, carry calibrated loads by exercise name.
  const prevIds = new Map<string, string[]>();
  for (const s of prev?.sessions ?? []) { const k = s.type + '|' + s.title; prevIds.set(k, [...(prevIds.get(k) ?? []), s.id]); }
  const prevLoads = new Map<string, number>();
  for (const s of prev?.sessions ?? []) for (const e of s.exercises) if (e.load !== null) prevLoads.set(e.name, e.load);
  sessions = sessions.map(s => {
    const k = s.type + '|' + s.title;
    const reuse = prevIds.get(k)?.shift();
    const exercises = s.exercises.map(e => ({ ...e, load: prevLoads.get(e.name) ?? null }));
    return { ...s, id: reuse ?? id(), exercises };
  });
  const blueprint = makeBlueprint(p, pr, sessions, strength, cardio, g.moderateOnly, deload, cautious);
  const notes: string[] = [];
  if (p.equipment === 'bodyweight') notes.push('Senza attrezzi per tirare, wall slide e Y raise non sostituiscono trazioni caricate. Con un elastico o una sbarra il programma diventa più completo.');
  notes.push(`Hai ${p.days.length} giorni: ${sc} di palestra${rc ? ` e ${rc} di cardio` : ''}. Gli altri giorni sono di recupero: continua a camminare.`);
  if ((p.recentStrengthSessions ?? 0) > 0 && sc > (p.recentStrengthSessions ?? 0) + 1) notes.push(`Passi da ${p.recentStrengthSessions} a ${sc} sedute di palestra: il volume parte basso e cresce solo se recuperi.`);
  if (strength.trimmed) notes.push(`Con ${p.minutes} minuti ho tolto alcuni accessori o serie per restare nel tempo. Se vuoi recuperarli, abbina gli accessori di muscoli opposti in superserie.`);
  if (p.goalDetail) notes.push(`Il tuo obiettivo, nelle tue parole: «${p.goalDetail}».`);
  return { sessions, blueprint, notes };
}

function makeBlueprint(p: Profile, pr: Progress, sessions: Session[], strength: ReturnType<typeof buildStrengthWeek>, cardio: CardioWeek, moderateOnly: boolean, deload: boolean, cautious: boolean): Blueprint {
  const { sc, rc } = split(p);
  const goal = coreGoal(p);
  const pillars: Reason[] = [];
  const levelName = { new: 'chi inizia', intermediate: 'chi si allena con regolarità', experienced: 'chi ha esperienza' }[p.strengthLevel];
  const avgTarget = Math.round(Object.entries(strength.targets).filter(([m]) => m !== 'core' && m !== 'calves').reduce((t, [, v]) => t + v, 0) / 8);
  const rec = recommendPhase(p);
  if (moderateOnly || (p.screening ?? []).length) pillars.push({ title: 'Prima la sicurezza', detail: 'Per le condizioni che hai indicato l’intensità resta moderata (niente intervalli, più ripetizioni in riserva) finché un medico non conferma che puoi salire.', sources: cite('screening', 'guidelines') });
  const goalLine: Record<typeof goal, string> = {
    'fat-loss': 'Per dimagrire la dieta crea il deficit, la palestra dice al corpo di tenersi i muscoli, cardio e passi aggiungono dispendio. Senza pesi una parte del peso perso sarebbe muscolo.',
    recomp: 'Ricomposizione: perdere grasso e mettere muscolo insieme. Funziona con allenamento progressivo, proteine alte e calorie vicine al mantenimento; si vede più dal giro vita e dai carichi che dalla bilancia.',
    muscle: 'Per mettere massa contano tre cose: serie sufficienti per ogni muscolo, carichi che salgono nel tempo e un surplus moderato. Il cardio resta leggero, per salute e recupero.',
    strength: 'Per la forza i multiarticolari usano carichi alti e poche ripetizioni, con recuperi lunghi; il resto del volume sostiene la massa muscolare.',
    health: 'Per stare in forma: forza almeno 2–3 volte a settimana e attività aerobica regolare, le due cose con i maggiori benefici per salute e longevità.',
  };
  pillars.push({ title: 'La strategia', detail: goalLine[goal], sources: cite(goal === 'fat-loss' ? 'cardioFatLoss' : goal === 'recomp' ? 'recomposition' : goal === 'health' ? 'guidelines' : 'prescription') });
  pillars.push({ title: `Fase della dieta: ${phaseNames[rec.phase].toLowerCase()}`, detail: rec.reason, sources: cite('bodyFat', rec.phase === 'gain' ? 'surplus' : rec.phase === 'cut' ? 'deficit' : 'recomposition') });
  pillars.push({ title: 'Quanto lavoro per i muscoli', detail: `Circa ${avgTarget} serie a settimana per gruppo muscolare: una dose di partenza adatta a ${levelName}. Più volume dà più risultati ma con rendimenti decrescenti: ${deload ? 'questa settimana scarichi' : 'aggiungo 1 serie per muscolo a settimana solo se le sedute vanno bene'}.`, sources: cite('prescription', 'volume') });
  const sname = splitName(splitFor(p, sc));
  const whySplit = sname === 'Corpo intero'
    ? (p.strengthLevel === 'new' ? `Chi inizia impara meglio ripetendo spesso gli stessi movimenti: con ${sc} ${sc === 1 ? 'seduta' : 'sedute'} a corpo intero ogni muscolo lavora ${sc >= 2 ? 'più volte' : 'una volta'} a settimana e la tecnica si consolida in fretta.` : `Con ${sc} ${sc === 1 ? 'giorno' : 'giorni'} il corpo intero è la scelta più efficiente: ogni muscolo lavora ${sc >= 2 ? 'due o più volte' : 'una volta'} a settimana.`)
    : sname.startsWith('Parte superiore') ? `Con ${sc} giorni la divisione superiore/inferiore fa lavorare ogni muscolo due volte a settimana con sedute di durata gestibile: una seduta più pesante (forza) e una con più ripetizioni (volume) per ciascuna metà del corpo.`
    : sname.includes('spinta, tirata, gambe') && sname.startsWith('Superiore') ? `Con ${sc} giorni uso due sedute superiore/inferiore più spinta, tirata e gambe: ogni muscolo lavora due volte a settimana e c’è spazio per il volume che serve a chi è allenato.`
    : sname === 'Spinta, tirata, gambe' ? `Con ${sc} giorni spinta, tirata e gambe ripetute due volte: ogni muscolo lavora due volte a settimana con molte serie distribuite.`
    : `Con ${sc} giorni da allenato alterno superiore/inferiore e una seduta a corpo intero: ogni muscolo lavora due volte a settimana.`;
  pillars.push({ title: `Lo split: ${sname.toLowerCase()}`, detail: `${whySplit} A parità di serie settimanali gli studi non trovano grandi differenze tra split: conta allenare ogni muscolo almeno due volte e recuperare tra le sedute.${p.focus === 'lower' ? ' Hai chiesto priorità alle gambe: più sedute e un giorno dedicato a glutei e femorali.' : p.focus === 'upper' ? ' Hai chiesto priorità alla parte superiore: più serie per petto, dorso, spalle e braccia.' : ''}`, sources: cite('splitChoice', 'frequency') });
  pillars.push({ title: 'Perché questi esercizi', detail: 'Scelgo prima gli esercizi che lavorano il muscolo in allungamento, dove le prove mostrano più crescita: squat sotto il parallelo, leg curl da seduto, estensioni dei tricipiti sopra la testa, curl con gomito che arriva quasi teso, polpacci con pausa in basso. Un multiarticolare per gruppo muscolare più un esercizio di isolamento copre tutti i capi (la leg extension, per esempio, è l’unica che fa crescere il retto femorale). Per chi inizia preferisco macchine e varianti stabili, più facili da imparare.', sources: cite('exerciseScience', 'exerciseChoice', 'singleJoint') });
  pillars.push({ title: 'Serie e ripetizioni', detail: `${p.goal === 'strength' ? 'Esercizi principali con 3–6 ripetizioni: la forza massima cresce di più con carichi alti' : 'Multiarticolari tra 6 e 10 ripetizioni, isolamento tra 10 e 20'}: per la crescita muscolare carichi bassi, medi e alti funzionano in modo simile se arrivi vicino al cedimento. 2–5 serie per esercizio, le prime più pesanti. Discesa controllata in 2–3 secondi, pausa breve nel punto di massimo allungamento, salita decisa.`, sources: cite('repRanges', 'effort') });
  pillars.push({ title: 'Sforzo senza cedimento', detail: 'Ti fermi con 1–3 ripetizioni ancora possibili (RIR): abbastanza vicino al cedimento da crescere, abbastanza lontano da recuperare. Nelle prime settimane la stima del RIR è imprecisa: migliora con la pratica.', sources: cite('effort') });
  pillars.push({ title: 'Cardio e passi', detail: `${cardio.summary} ${goal === 'fat-loss' ? 'Cardio moderato e intervalli fanno perdere grasso in modo simile: scelgo quello che sostieni meglio. I passi contano quanto il cardio e affaticano meno.' : goal === 'muscle' || goal === 'strength' ? 'Una dose moderata di cardio non frena la crescita muscolare e migliora salute e recupero.' : 'Forza e cardio insieme danno i benefici maggiori.'}`, sources: cite(goal === 'fat-loss' ? 'cardioFatLoss' : 'concurrent', 'steps') });
  if (rc > 0 || cardio.finishers) pillars.push({ title: 'Ordine e recupero', detail: 'Il cardio a fine seduta viene dopo i pesi, così non toglie qualità alle serie; le sedute intense non cadono il giorno prima delle gambe pesanti.', sources: cite('order', 'concurrent') });
  pillars.push({ title: 'Carichi e recuperi', detail: `${goal === 'strength' ? 'Gli esercizi principali usano 3–6 ripetizioni con carichi alti, perché la forza massima risponde al carico' : 'Ripetizioni da 6 a 20: carichi leggeri e pesanti fanno crescere i muscoli in modo simile se lo sforzo è adeguato'}. Recuperi di 1,5–3 minuti sui multiarticolari: sotto i 60 secondi si perde qualità.`, sources: cite('loads', 'rest', 'oneRm') });
  pillars.push({ title: 'Scelta degli esercizi', detail: `${p.equipment === 'gym' ? 'Macchine e pesi liberi producono risultati simili: scelgo in base alle tue preferenze' : 'Uso l’attrezzatura che hai'}, con ampiezza completa e una fase in allungamento controllata. Le varianti restano stabili nel blocco per poter confrontare i progressi.`, sources: cite('exerciseChoice') });
  pillars.push({ title: 'Blocchi e scarico', detail: `Lavori a blocchi di ${pr.mesoLength} settimane: ${pr.mesoLength - 1} in crescita e l’ultima di scarico (metà volume, stessa frequenza). Sei nella settimana ${pr.mesoWeek}. Prima completi il range di ripetizioni, poi aumenti il peso.`, sources: cite('deload', 'progression') });
  pillars.push({ title: 'Prevenzione', detail: 'La forza è la strategia di prevenzione degli infortuni con le prove migliori; lo stretching no. Riscaldamento breve e serie di avvicinamento bastano.', sources: cite('injuryPrevention', 'warmup') });
  if (p.minutes <= 40 || strength.trimmed) pillars.push({ title: 'Poco tempo', detail: 'Sedute compatte: multiarticolari prima, accessori dopo. Superserie e drop set fanno risparmiare tempo senza ridurre la crescita.', sources: cite('timeEfficient') });
  if (p.strengthLevel === 'new' || (p.confidence ?? 3) <= 2) pillars.push({ title: 'Costanza prima di tutto', detail: 'Nelle prime 6 settimane conta presentarsi: sedute semplici, stesso orario, progressi visibili nel diario.', sources: cite('habit', 'enjoyment') });
  if (p.painCleared && (p.painAreas ?? []).length) pillars.push({ title: 'Zone da rispettare', detail: 'Ho sostituito gli esercizi che caricano le zone indicate. Se il dolore peggiora durante o il giorno dopo, riduci e segnalalo.', sources: cite('painLoad') });
  if (cautious) pillars.push({ title: 'Recupero', detail: 'Stress alto, sonno sotto le 6 ore o poca fiducia rallentano il recupero: parto con l’80% del volume e più margine sullo sforzo.', sources: cite('sleep', 'stress') });
  if (p.sex === 'female') pillars.push({ title: 'Ciclo mestruale', detail: 'Non programmo per fase del ciclo: le prove non mostrano vantaggi. Se noti sedute più difficili in certi giorni, segnalalo nel check-in.', sources: cite('cycle', 'sex') });
  if (p.age >= 60) pillars.push({ title: 'Età', detail: 'Con l’età la forza conta ancora di più: carichi progressivi e anche lavoro più rapido, con tecnica controllata.', sources: cite('older') });
  const strengthSets = sessions.filter(s => s.type === 'strength').reduce((t, s) => t + s.exercises.reduce((a, e) => a + e.sets, 0), 0);
  const weekly = [
    { label: 'Palestra', value: `${sc} sedute · ${strengthSets} serie`, sources: cite('volume') },
    { label: 'Cardio', value: cardio.weeklyMinutes ? `${cardio.weeklyMinutes} min a settimana` : 'Solo passi', sources: cite('cardioFatLoss') },
    { label: 'Passi al giorno', value: cardio.steps.toLocaleString('it-IT'), sources: cite('steps') },
    { label: 'Tempo totale', value: `${sessions.reduce((t, s) => t + s.duration, 0)} min`, sources: [] },
  ];
  const habits = [
    { label: 'Passi', value: cardio.steps.toLocaleString('it-IT'), detail: 'al giorno, anche nei giorni di riposo' },
    { label: 'Sonno', value: '7–9 h', detail: 'la notte corta toglie forza e aumenta la fame' },
    { label: 'Proteine', value: p.weight ? `${Math.round(p.weight * (rec.phase === 'cut' ? 2.2 : 1.9))} g` : '1,6–2,2 g/kg', detail: 'ogni giorno, in 3–5 pasti' },
    { label: 'Cardio', value: cardio.weeklyMinutes ? `${cardio.weeklyMinutes}′` : '—', detail: 'a settimana, a ritmo di conversazione' },
  ];
  const safety = [
    'Interrompi e fai valutare dolore al petto, svenimento, affanno anomalo o dolore che peggiora.',
    'Dolore articolare acuto durante un esercizio: fermati e passa alla variante successiva.',
    'Nei primi giorni caldi riduci intensità e durata del cardio.',
  ];
  const length = pr.mesoLength;
  const load = Array.from({ length }, (_, i) => (i === length - 1 ? 0.3 : 0.4 + (0.6 * i) / Math.max(1, length - 2)));
  const label = deload ? 'Scarico' : pr.mesoWeek === 1 ? 'Calibrazione' : 'Costruzione';
  const summary = `${goalNames[goal]}: ${sc} sedute di palestra${rc ? ` e ${rc} di cardio` : ''} a settimana, ${p.minutes} minuti al massimo, ${cardio.steps.toLocaleString('it-IT')} passi al giorno.`;
  return { summary, pillars, weekly, habits, cardioPlan: cardio.summary, zones: zones(p), muscleSets: strength.muscleSets, safety, meso: { length, week: pr.mesoWeek, deload, label, load } };
}

/* ---------- Public API ---------- */
export function generatePlan(p: Profile, previous?: Plan | null): Plan {
  const plan: Plan = { id: id(), version: (previous?.version ?? 0) + 1, week: 1, createdAt: now(), engineVersion: ENGINE_VERSION, sessions: [], notes: [], blocked: false };
  const g = gate(p);
  if (g.blocked) { plan.blocked = true; plan.notes.push(g.reason); return plan; }
  plan.progress = initialProgress(p);
  const built = buildWeek(p, plan.progress, previous);
  plan.sessions = built.sessions; plan.blueprint = built.blueprint; plan.notes = built.notes;
  return plan;
}

export function alternatives(p: Profile, e: Exercise) { return alternativesFor(p, e.family); }
export function sessionTime(s: Session) {
  if (s.type === 'strength') return Math.ceil(strengthTime(s.exercises, s.phases[0]?.minutes ?? 0, s.phases[1]?.minutes ?? 0));
  return s.phases.reduce((t, x) => t + x.minutes, 0);
}

export function progressAfterLog(state: AppState, log: Pick<WorkoutLog, 'sessionId' | 'results' | 'pain'> & Partial<WorkoutLog>): Decision[] {
  const out: Decision[] = [];
  const session = state.plan?.sessions.find(x => x.id === log.sessionId);
  if (!session) return out;
  const add = (title: string, reason: string, rule: string, sources: string[] = []) => out.push({ id: id(), date: now(), title, reason, rule, sources });
  if (log.pain) { add('Progressione sospesa', 'Hai segnalato dolore: interrompi il movimento doloroso e fallo valutare. Nessun aumento automatico.', 'pain-hold', cite('painLoad')); return out; }
  const complete = log.completed !== false;
  const hard = (log.rpe ?? 0) >= (session.targetRpe ?? (session.type === 'run' ? 4 : 7)) + 2 || (log.readiness ?? 3) <= 2;
  if (!complete) add('Seduta parziale: nessun aumento', 'Il lavoro incompleto viene conservato. La prossima volta ripeti la stessa dose; non recuperare tutte le serie perse in una volta.', 'partial-hold', cite('progression'));
  if (session.type === 'strength') {
    const holds: string[] = [];
    for (const e of session.exercises) {
      const sets = log.results.filter(x => x.exerciseId === e.id);
      if (!sets.length) continue;
      if (e.increment > 0 && sets.some(x => x.weight === null)) { add(`${e.name}: manca il carico`, 'Segna i kg di ogni serie: senza non posso calcolare il prossimo carico.', 'missing-data', cite('autoregulation')); continue; }
      const sg = suggest(e, history(state, e.name));
      // No increase after a partial or too hard session: repeat the same load.
      const held = (!complete || hard) && sg.kind === 'up';
      const lastLoad = Math.max(0, ...sets.map(x => x.weight ?? 0)) || null;
      e.load = held ? lastLoad : sg.load ?? e.load;
      if (held || sg.kind === 'hold' || sg.kind === 'reps') holds.push(`${e.name}: ${e.load ? `${e.load.toLocaleString('it-IT')} kg · ` : ''}${held ? 'stesse ripetizioni' : sg.target}`);
      else if (sg.kind === 'up') add(`${e.name}: prossima volta ${sg.load ? sg.load.toLocaleString('it-IT') + ' kg' : sg.target}`, sg.why, 'double-progression', cite('progression', 'autoregulation'));
      else if (sg.kind === 'down') add(`${e.name}: scendi a ${sg.load?.toLocaleString('it-IT')} kg`, sg.why, 'load-down', cite('autoregulation'));
    }
    if (holds.length) add('Prossima volta, stesso carico', holds.join('\n'), 'hold', cite('progression'));
  }
  if (hard) {
    session.adaptation = 'Sforzo alto o disponibilità bassa: la prossima volta mantieni il carico e lascia una ripetizione in più in riserva; se si ripete, riduco il lavoro.';
    if (session.type === 'strength') session.exercises.forEach(e => (e.rir = Math.min(4, e.rir + 1)));
    else { const main = session.phases.find(x => /Corsa|corsa|×/.test(x.label)); if (main && main.minutes > 3) { main.minutes -= 2; session.runMinutes = Math.max(1, (session.runMinutes ?? main.minutes) - 2); session.duration = sessionTime(session); } }
    add('Prossima seduta: meno pressione', session.adaptation, 'effort-adjust', cite('load', 'effort'));
  }
  if (session.type === 'run' && !hard) add('Corsa: la valutiamo a fine settimana', 'Volume e fase avanzano solo se la settimana intera è stata facile e senza dolore. Una singola uscita non basta.', 'run-hold', cite('runProgression'));
  if ((log.enjoyment ?? 5) <= 2 || log.barrier === 'boredom') { session.adaptation = 'Gradimento basso: scegli una variante equivalente nella prossima seduta, oppure dimmi cosa cambieresti.'; add('Il gradimento entra nel piano', 'Le sedute che piacciono si ripetono più volentieri: proponiamo una variante o discutiamo l’ostacolo.', 'enjoyment-review', cite('enjoyment')); }
  if ((log.confidence ?? 5) <= 2) add('Fiducia bassa: un passo concreto', 'Scegli una variante familiare e un obiettivo piccolo e controllabile per la prossima seduta.', 'confidence-support', cite('enjoyment', 'habit'));
  if (log.barrier === 'time') { session.adaptation = 'Tempo limitato: la prossima volta dai priorità ai primi tre esercizi e registra quello che completi.'; add('Ostacolo: tempo', 'Mantieni l’appuntamento con una versione corta: anche dosi ridotte producono progressi.', 'time-barrier', cite('timeEfficient')); }
  const style = state.profile?.coachStyle;
  add('Bilancio della seduta', `${log.duration ?? '—'}/${log.plannedDuration ?? session.duration} min · RPE ${log.rpe ?? '—'}/${log.plannedRpe ?? session.targetRpe ?? 6}${log.enjoyment ? ` · gradimento ${log.enjoyment}/5` : ''}${log.confidence ? ` · fiducia ${log.confidence}/5` : ''}. ${style === 'direct' ? 'Usa questi dati per la prossima seduta.' : style === 'technical' ? `Carico interno sRPE: ${(log.rpe ?? 0) * (log.duration ?? 0)} unità.` : 'Conta il lavoro reale, anche quando non coincide con il piano.'}`, 'session-review', cite('load'));
  return out;
}

/** Change of the estimated 1RM per muscle: this week's performance of each lift against its previous one. */
function muscleTrends(state: AppState, logs: WorkoutLog[]): { muscle: Muscle; change: number }[] {
  const plan = state.plan!;
  const ids = new Set(logs.map(l => l.id));
  const acc = new Map<Muscle, number[]>();
  for (const e of plan.sessions.flatMap(s => s.exercises)) {
    if (e.increment === 0) continue;
    const h = history({ plan, logs: state.logs }, e.name);
    const nowIdx = h.findLastIndex(x => state.logs.some(l => ids.has(l.id) && l.date === x.date));
    if (nowIdx < 1) continue;
    const now = bestE1rm(h[nowIdx], e.rir), before = bestE1rm(h[nowIdx - 1], e.rir);
    if (!now || !before) continue;
    for (const m of primeMovers(e.family)) acc.set(m, [...(acc.get(m) ?? []), now / before - 1]);
  }
  return [...acc].map(([muscle, v]) => ({ muscle, change: v.reduce((a, b) => a + b, 0) / v.length }));
}

/** Morning weights from check-ins and measurements. */
function weights(state: AppState) {
  return [...state.checkins.filter(c => c.weight !== null).map(c => ({ date: c.date, w: c.weight! })), ...(state.measurements ?? []).filter(m => m.weight !== null).map(m => ({ date: m.date, w: m.weight! }))];
}

function nutritionReview(state: AppState): Decision | null {
  const p = state.profile;
  if (!p || !p.nutritionConsent || p.clinical) return null;
  const day = 86400000, t = Date.now();
  const all = weights(state);
  const w = (from: number, to: number) => all.filter(c => t - Date.parse(c.date) >= from * day && t - Date.parse(c.date) < to * day).map(c => c.w);
  const last = w(0, 7), before = w(7, 14);
  if (last.length < 2 || before.length < 2) return null;
  const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
  const change = (avg(last) - avg(before)) / avg(before) * 100;
  const phase = phaseFor(p);
  let advice = '';
  if (phase === 'cut' && change > -0.25) advice = 'La media settimanale scende meno dello 0,25%: se capita anche la prossima settimana, togli 100–200 kcal al giorno, meglio dai grassi o dai carboidrati lontani dagli allenamenti.';
  else if (phase === 'cut' && change < -1) advice = 'Stai scendendo più dell’1% a settimana: aggiungi 100–200 kcal per proteggere forza e massa muscolare.';
  else if (phase === 'gain' && change < 0.1) advice = 'Il peso è fermo: aggiungi 100–200 kcal al giorno.';
  else if (phase === 'gain' && change > 0.6) advice = 'Il peso sale più dello 0,5% a settimana: togli 100–150 kcal per limitare il grasso.';
  else if (phase === 'maintain' && Math.abs(change) > 0.7) advice = change > 0 ? 'Il peso sale nonostante l’obiettivo di mantenimento: togli 100–150 kcal.' : 'Il peso scende nonostante l’obiettivo di mantenimento: aggiungi 100–150 kcal.';
  else advice = 'L’andamento è in linea con l’obiettivo: mantieni.';
  // Logged intake makes the advice concrete: compare what was eaten with the target before changing it.
  const daysLogged = [...new Set((state.foods ?? []).filter(f => t - Date.parse(f.date + 'T12:00:00') < 7 * day).map(f => f.date))];
  if (daysLogged.length >= 4) {
    const kcal = daysLogged.reduce((sum, d) => sum + (state.foods ?? []).filter(f => f.date === d).reduce((a, f) => a + f.kcal * f.grams / 100, 0), 0) / daysLogged.length;
    advice += ` Nel diario alimentare hai registrato in media ${Math.round(kcal)} kcal al giorno su ${daysLogged.length} giorni.`;
  }
  return { id: id(), date: now(), title: `Peso: ${change >= 0 ? '+' : ''}${change.toFixed(1)}% nella media settimanale`, reason: advice + ' Il singolo giorno oscilla per acqua e cibo: decide la media.', sources: cite('weighing', 'energyEstimate'), rule: 'weight-trend' };
}

export function nextWeek(state: AppState): Decision {
  if (!state.plan || !state.profile || state.plan.blocked) throw Error('Prima crea un piano utilizzabile.');
  const plan = state.plan, p = state.profile;
  const pr: Progress = plan.progress ?? initialProgress(p);
  const logs = state.logs.filter(x => x.week === plan.week && plan.sessions.some(y => y.id === x.sessionId));
  if (!logs.length) throw Error('Nessuna seduta registrata: ripeti la settimana prima di andare avanti.');
  if (logs.some(x => x.pain) || state.checkins.slice(-3).some(x => x.pain && x.date >= plan.createdAt)) throw Error('Dolore segnalato: prima di proseguire serve una valutazione.');
  // The person's own plan: same exercises, sets and days; loads already follow each logged session.
  if (plan.custom) {
    const done = new Set(logs.map(x => x.sessionId)).size;
    state.plan = { ...plan, week: plan.week + 1, version: plan.version + 1 };
    const review = nutritionReview(state);
    if (review) state.decisions.push(review);
    return { id: id(), date: now(), title: `Settimana ${plan.week + 1}`, reason: `${done} di ${plan.sessions.length} sedute fatte. Il tuo piano resta uguale: per ogni esercizio trovi il carico consigliato dalla volta prima.`, sources: cite('progression', 'autoregulation'), rule: 'custom-week' };
  }
  const checkins = state.checkins.filter(x => x.date >= plan.createdAt).slice(-3);
  const reduce = checkins.length >= 2 && checkins.filter(x => x.fatigue >= 4).length >= 2;
  const shortSleep = checkins.length >= 2 && checkins.reduce((t, x) => t + x.sleep, 0) / checkins.length < 6;
  const done = new Set(logs.filter(x => x.completed !== false).map(x => x.sessionId)).size;
  const completion = done / plan.sessions.length;
  const gym = logs.filter(x => x.type === 'strength');
  const gymOk = gym.length > 0 && gym.every(x => x.completed !== false && x.rpe <= (x.plannedRpe ?? 7) + 1);
  const runLogs = logs.filter(x => x.type === 'run');
  const runOk = runLogs.length > 0 && runLogs.every(x => x.completed !== false && !x.pain && x.rpe <= 5 + (plan.sessions.find(s => s.id === x.sessionId)?.hard ? 3 : 0));
  const wasDeload = isDeload(pr);
  const changes: string[] = [];
  const trends = muscleTrends(state, logs);
  // Strength volume
  if (wasDeload) { pr.setBonus = 0; changes.push('Dopo lo scarico riparte un nuovo blocco con i carichi già calibrati.'); }
  else if (reduce) { pr.setBonus = Math.max(0, pr.setBonus - 1); changes.push('Fatica alta in più check-in: tolgo una serie per muscolo.'); }
  else if (gymOk && completion >= 0.75) { pr.setBonus += 1; changes.push('Sedute di palestra completate allo sforzo previsto: +1 serie per muscolo (fino al tetto del tuo livello).'); }
  else changes.push('Palestra: stessa dose finché le sedute non sono complete allo sforzo previsto.');
  // Per muscle: performance falling despite the work means too little recovery, so one set less; rising or flat keeps the global step.
  if (wasDeload) pr.muscleBonus = {};
  else if (!reduce && trends.length) {
    const mb = { ...(pr.muscleBonus ?? {}) };
    const grew = gymOk && completion >= 0.75;
    const lines: string[] = [];
    for (const t of trends) {
      const name = muscleNames[t.muscle];
      const pct = `${t.change >= 0 ? '+' : ''}${(t.change * 100).toFixed(1).replace('.', ',')}%`;
      if (t.change <= -0.025) { mb[t.muscle] = Math.max(-3, (mb[t.muscle] ?? 0) - (grew ? 2 : 1)); lines.push(`${name} ${pct}: una serie in meno per recuperare`); }
      else if (t.change >= 0.01) lines.push(`${name} ${pct}`);
      else lines.push(`${name} fermo`);
    }
    pr.muscleBonus = mb;
    changes.push(`Forza stimata rispetto alla volta prima: ${lines.join('; ')}.`);
  }
  // Cardio and steps: grow towards the goal dose only after a week that went well.
  const goal = coreGoal(p);
  const cardioDone = runLogs.length === 0 || runOk;
  if (!reduce && !wasDeload && completion >= 0.75 && cardioDone) {
    const before = pr.steps ?? STEPS_TARGET[goal];
    pr.steps = Math.min(STEPS_TARGET[goal], before + 1000);
    if ((pr.cardioMinutes ?? 0) < CARDIO_TARGET[goal]) pr.cardioMinutes = Math.min(CARDIO_TARGET[goal], (pr.cardioMinutes ?? 0) + 15);
    if (pr.steps > before) changes.push(`Passi: obiettivo a ${pr.steps.toLocaleString('it-IT')} al giorno.`);
  } else if (reduce) pr.cardioMinutes = Math.round((pr.cardioMinutes ?? 0) * 0.85);
  if (wantsRun(p)) {
    if (isBeginnerRunner(p) && pr.runWalkStep < RUN_WALK.length - 1) {
      if (runOk && !reduce && !wasDeload) { pr.runWalkStep++; changes.push(`Corsa/cammino: passi alla fase ${pr.runWalkStep + 1}.`); }
      else if (reduce) { pr.runWalkStep = Math.max(0, pr.runWalkStep - 1); changes.push('Corsa/cammino: torno alla fase precedente.'); }
      if (pr.runWalkStep >= RUN_WALK.length - 1) { pr.runMinutes = Math.max(pr.runMinutes, 30 * Math.max(1, split(p).rc)); pr.longRun = Math.max(pr.longRun, 30); }
    } else if (runOk && !reduce && !wasDeload) {
      const step = Math.max(5, Math.min(25, Math.round(pr.runMinutes * 0.08)));
      pr.runMinutes += step;
      const target = p.event && p.event !== 'none' ? LONG_TARGET[p.event] : maxLong(p);
      pr.longRun = Math.min(maxLong(p), target, pr.longRun + Math.min(10, Math.max(3, Math.round(pr.longRun * 0.1))));
      changes.push(`Corsa: +${step} minuti a settimana.`);
    } else if (reduce) pr.runMinutes = Math.round(pr.runMinutes * 0.85);
  }
  if (shortSleep) changes.push('Hai dormito in media meno di 6 ore: sposta le sedute impegnative al mattino o abbassane l’obiettivo.');
  // Calendar
  pr.mesoWeek = wasDeload ? 1 : pr.mesoWeek + 1;
  if (wasDeload) pr.mesoCount++;
  if (pr.eventWeeks !== null) pr.eventWeeks = Math.max(0, pr.eventWeeks - 1);
  const built = buildWeek(p, pr, plan);
  plan.sessions = built.sessions; plan.blueprint = built.blueprint; plan.notes = built.notes; plan.progress = pr; plan.week++; plan.engineVersion = ENGINE_VERSION;
  const nr = nutritionReview(state);
  if (nr) state.decisions.push(nr);
  return {
    id: id(), date: now(), title: `Settimana ${plan.week}: ${built.blueprint.meso.label.toLowerCase()}`,
    reason: `${done}/${plan.sessions.length} sedute completate. ${changes.join(' ')}`,
    sources: cite('load', 'progression', 'runProgression', ...(isDeload(pr) ? ['deload' as const] : [])), rule: reduce ? 'fatigue-reduce' : 'week-review',
  };
}

/** Training load used by the energy estimate: gym sessions, structured cardio minutes (sessions + finishers) and daily steps. */
export function activityFrom(p: Profile, plan: Plan | null | undefined) {
  if (!plan || plan.blocked) return { gymDays: Math.max(1, p.days.length - 1), cardioMinutes: 60, steps: p.steps ?? 6000 };
  const gymDays = plan.sessions.filter(s => s.type === 'strength').length;
  const cardioMinutes = plan.sessions.reduce((t, s) => t + (s.type === 'run' ? s.runMinutes ?? 0 : s.phases.filter(x => x.label.startsWith('Cardio')).reduce((a, x) => a + x.minutes, 0)), 0);
  return { gymDays, cardioMinutes, steps: plan.progress?.steps ?? p.steps ?? 6000 };
}

export { nutrition, muscleLabel };
