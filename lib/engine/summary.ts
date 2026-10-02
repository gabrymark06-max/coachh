// The week in three lines for the home screen: training, food log and weight, each with what to do next.
import type { AppState } from '../types';
import type { NutritionPlan } from './nutrition';
import { history, bestE1rm } from './progression';

const DAY = 86400000;
const it = (x: number, d = 0) => x.toLocaleString('it-IT', { maximumFractionDigits: d, minimumFractionDigits: d });

export function weeklySummary(s: AppState, n: NutritionPlan | null, nowMs = Date.now()): { label: string; text: string }[] {
  const out: { label: string; text: string }[] = [];
  const week = s.logs.filter(l => nowMs - Date.parse(l.date) < 7 * DAY);
  const planned = s.plan?.sessions.length ?? 0;
  // Records this week: sets whose estimated max beats everything logged before them.
  let prs = 0;
  for (const name of new Set(week.flatMap(l => l.results.map(r => r.name).filter(Boolean) as string[]))) {
    const h = history(s, name), cut = h.findIndex(x => nowMs - Date.parse(x.date) < 7 * DAY);
    if (cut <= 0) continue;
    const before = Math.max(...h.slice(0, cut).map(x => bestE1rm(x) ?? 0)), now = Math.max(...h.slice(cut).map(x => bestE1rm(x) ?? 0));
    if (before > 0 && now > before * 1.005) prs++;
  }
  out.push({ label: 'Allenamento', text: week.length ? `${week.length} ${week.length === 1 ? 'seduta' : 'sedute'} negli ultimi 7 giorni${planned ? ` su ${planned} previste` : ''}${prs ? `, ${prs} ${prs === 1 ? 'record' : 'record'} di forza` : ''}.${planned && week.length < planned ? ' Recupera quella che manca entro domenica, se puoi.' : ''}` : 'Nessuna seduta negli ultimi 7 giorni: riparti dalla prossima, con i carichi dell’ultima volta.' });
  const days = [...new Set((s.foods ?? []).filter(f => nowMs - Date.parse(f.date + 'T12:00:00') < 7 * DAY).map(f => f.date))]
    .filter(d => new Set((s.foods ?? []).filter(f => f.date === d).map(f => f.meal)).size >= 2);
  if (days.length) {
    const kcal = days.reduce((t, d) => t + (s.foods ?? []).filter(f => f.date === d).reduce((a, f) => a + f.kcal * f.grams / 100, 0), 0) / days.length;
    const target = n?.average?.kcal;
    out.push({ label: 'Alimentazione', text: `Media ${it(Math.round(kcal / 10) * 10)} kcal su ${days.length} ${days.length === 1 ? 'giorno registrato' : 'giorni registrati'}${target ? ` (obiettivo ${it(target)})` : ''}.${days.length < 5 ? ' Registra almeno due pasti al giorno: con 10 giorni misuro il tuo mantenimento reale.' : ''}` });
  } else out.push({ label: 'Alimentazione', text: (s.foods ?? []).some(f => nowMs - Date.parse(f.date + 'T12:00:00') < 7 * DAY) ? 'Registra almeno due pasti al giorno: così la media delle calorie è affidabile.' : 'Diario vuoto questa settimana: bastano due pasti al giorno, e «Copia ieri» fa quasi tutto da solo.' });
  const w = [...s.checkins.filter(c => c.weight).map(c => ({ t: Date.parse(c.date), w: c.weight! })), ...(s.measurements ?? []).filter(m => m.weight).map(m => ({ t: Date.parse(m.date + 'T08:00:00'), w: m.weight! }))];
  const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
  const last = w.filter(x => nowMs - x.t < 7 * DAY).map(x => x.w), prev = w.filter(x => nowMs - x.t >= 7 * DAY && nowMs - x.t < 14 * DAY).map(x => x.w);
  out.push({ label: 'Peso', text: last.length && prev.length ? `Media ${it(avg(last), 1)} kg, ${avg(last) - avg(prev) >= 0 ? '+' : '−'}${it(Math.abs(avg(last) - avg(prev)), 1)} kg rispetto alla settimana prima.${s.tdee ? ` Mantenimento misurato: ${it(s.tdee.kcal)} kcal.` : ''}` : last.length ? `Media ${it(avg(last), 1)} kg. Pesati ogni mattina: dalla prossima settimana vedi la tendenza.` : 'Nessuna pesata questa settimana: pesati al mattino, a digiuno, dal pulsante «Come stai oggi».' });
  return out;
}
