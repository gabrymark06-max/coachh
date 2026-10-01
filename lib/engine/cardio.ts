import type { CardioMode, Profile, Progress, Session } from '../types';
import { cardioNames } from '../types';
import { cite } from './refs';
import { buildRunWeek } from './running';

type Spec = Omit<Session, 'day'>;
type Goal = 'fat-loss' | 'recomp' | 'muscle' | 'strength' | 'health';

// Weekly structured cardio (minutes, steps excluded) by goal: ACSM weight-loss stand (150–250 min), WHO 150 min for health,
// lighter doses when muscle gain is the priority (concurrent training does not blunt hypertrophy at moderate doses).
export const CARDIO_TARGET: Record<Goal, number> = { 'fat-loss': 150, recomp: 90, muscle: 60, strength: 60, health: 150 };
export const STEPS_TARGET: Record<Goal, number> = { 'fat-loss': 9000, recomp: 8000, muscle: 7000, strength: 7000, health: 8000 };

export const coreGoal = (p: Profile): Goal => (p.goal === 'balanced' ? 'recomp' : p.goal === 'running' ? 'health' : p.goal);
export const modesOf = (p: Profile): CardioMode[] => (p.cardio?.length ? p.cardio : ['walk']);
export const wantsRun = (p: Profile) => modesOf(p).includes('run');

export function initialCardio(p: Profile) {
  const g = coreGoal(p);
  const current = p.steps ?? 5000;
  const steps = current >= STEPS_TARGET[g] ? current : Math.max(5000, Math.min(STEPS_TARGET[g], Math.round((current + 2000) / 500) * 500));
  const start = p.strengthLevel === 'new' || (p.activity === 'low' && !p.cardio?.length) ? 0.6 : 0.8;
  return { steps, cardioMinutes: Math.round(CARDIO_TARGET[g] * start / 5) * 5 };
}

function cardioSession(mode: CardioMode, minutes: number, intervals: boolean, p: Profile): Spec {
  const warm = minutes >= 25 ? 5 : 3, cool = minutes >= 25 ? 5 : 2;
  const main = minutes - warm - cool;
  const name = cardioNames[mode];
  const phases: Session['phases'] = [{ label: 'Avvio graduale', minutes: warm, effort: 'Molto facile' }];
  if (intervals) {
    const reps = Math.max(4, Math.min(8, Math.floor(main / 3)));
    phases.push({ label: `${reps} × 1 min intenso con 2 min facili`, minutes: main, effort: 'Intenso: non riesci a parlare · RPE 8' });
  } else phases.push({ label: mode === 'walk' ? 'Camminata veloce, meglio se in salita o su tapis roulant inclinato' : `${name} continuo`, minutes: main, effort: 'Zona 1–2: respiri più forte ma riesci a parlare · RPE 4–5' });
  phases.push({ label: 'Defaticamento', minutes: cool, effort: 'Molto facile' });
  const g = coreGoal(p);
  return {
    id: '', type: 'run', kind: intervals ? 'intervals' : 'easy', modality: mode, title: `${intervals ? 'Intervalli' : 'Cardio'} · ${name}`,
    duration: minutes, phases, exercises: [], hard: intervals, targetRpe: intervals ? 8 : 5, runMinutes: main,
    rationale: g === 'fat-loss'
      ? 'Il cardio aumenta il dispendio della settimana e aiuta a mantenere il peso perso; la perdita di grasso la decide il deficit della dieta, i muscoli li protegge la palestra.'
      : g === 'muscle' || g === 'strength'
        ? 'Una dose moderata di cardio migliora salute e recupero tra le serie senza ridurre la crescita muscolare. Resta lontano dalle sedute di gambe pesanti.'
        : intervals ? 'Intervalli brevi: migliorano la capacità aerobica (VO2max), indicatore forte di salute.' : 'Cardio moderato per la capacità aerobica e il dispendio: deve essere sostenibile, non sfinente.',
    sources: cite(g === 'fat-loss' ? 'cardioFatLoss' : 'concurrent', 'zones', ...(intervals ? ['intervals' as const] : [])),
  };
}

export type CardioWeek = { sessions: Spec[]; finishers: number; weeklyMinutes: number; steps: number; summary: string };

/**
 * Cardio on the days the gym does not use, plus short finishers after lifting when there are no free days.
 * Running uses the dedicated progression (run/walk for beginners, volume caps for runners).
 */
export function buildCardioWeek(p: Profile, cardioDays: number, pr: Progress, gymSessions: Spec[], ctx: { deload: boolean; moderateOnly: boolean; mesoWeek: number; shortSleep: boolean }): CardioWeek {
  const g = coreGoal(p);
  const target = Math.round((pr.cardioMinutes ?? CARDIO_TARGET[g]) * (ctx.deload ? 0.7 : 1));
  const modes = modesOf(p).filter(m => m !== 'run');
  const steps = pr.steps ?? STEPS_TARGET[g];
  let sessions: Spec[] = [];
  let weeklyMinutes = 0;
  if (cardioDays > 0 && wantsRun(p)) {
    const runs = buildRunWeek(p, cardioDays, pr, { deload: ctx.deload, mesoWeek: ctx.mesoWeek, moderateOnly: ctx.moderateOnly || g === 'fat-loss' || g === 'muscle', shortSleep: ctx.shortSleep });
    sessions = runs.sessions.map(s => ({ ...s, modality: 'run' as CardioMode }));
    weeklyMinutes = runs.weeklyMinutes;
  } else if (cardioDays > 0) {
    const each = Math.max(20, Math.min(p.minutes, Math.round(target / cardioDays / 5) * 5));
    const intervalsOk = !ctx.moderateOnly && !ctx.deload && p.strengthLevel !== 'new' && cardioDays >= 2 && (g === 'health' || g === 'recomp');
    sessions = Array.from({ length: cardioDays }, (_, i) => cardioSession((modes.length ? modes : ['walk' as CardioMode])[i % Math.max(1, modes.length)], each, intervalsOk && i === cardioDays - 1, p));
    weeklyMinutes = sessions.reduce((t, s) => t + (s.runMinutes ?? 0), 0);
  }
  // Finishers: top up after upper-body or full-body sessions, never beyond the session time limit.
  let finishers = 0;
  if (weeklyMinutes < target * 0.8) {
    const mode = (modes[0] ?? 'walk') as CardioMode;
    const order = [...gymSessions].sort((a, b) => Number(['lower', 'legs'].includes(a.kind ?? '')) - Number(['lower', 'legs'].includes(b.kind ?? '')));
    for (const s of order) {
      if (weeklyMinutes + finishers >= target) break;
      const room = p.minutes - s.duration;
      const add = Math.min(20, room, target - weeklyMinutes - finishers);
      if (add < 10) continue;
      const rounded = Math.floor(add / 5) * 5;
      s.phases.splice(s.phases.length - 1, 0, { label: `Cardio a fine seduta · ${cardioNames[mode].toLowerCase()}`, minutes: rounded, effort: 'Zona 1–2: riesci a parlare · RPE 4–5' });
      s.duration += rounded;
      s.rationale += ` In coda ${rounded} minuti di cardio facile: dopo i pesi, così non tolgono qualità alle serie.`;
      s.sources = [...new Set([...s.sources, ...cite('order', 'concurrent')])];
      finishers += rounded;
    }
  }
  const total = weeklyMinutes + finishers;
  const stepsText = `${steps.toLocaleString('it-IT')} passi al giorno`;
  const parts = [weeklyMinutes ? `${weeklyMinutes} minuti di cardio in ${cardioDays} ${cardioDays === 1 ? 'seduta dedicata' : 'sedute dedicate'}` : '', finishers ? `${finishers} minuti di cardio facile a fine allenamento` : ''].filter(Boolean);
  const summary = total === 0
    ? `Niente cardio strutturato: la priorità è la palestra. Punta a ${stepsText}.`
    : `${parts.join(' più ')} a settimana, e ${stepsText}.`.replace(/^./, c => c.toUpperCase());
  return { sessions, finishers, weeklyMinutes: total, steps, summary };
}
