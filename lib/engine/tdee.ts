// Maintenance calories measured on the person: average logged intake corrected by the weight trend over the same weeks.
// Weight trend + intake estimates real energy balance far better than equations alone (Sanghvi 2015, Hall 2011), but logged
// intake is usually under-reported (Ravelli 2020): the result is blended with the equation, never used blindly.
import type { AppState, MeasuredTdee } from '../types';

const DAY = 86400000;
const KCAL_PER_KG = 7700;

/** Needs ≥10 fully logged days (≥2 meals) and ≥4 weigh-ins spread over ≥10 days within the last 4 weeks. */
export function measureTdee(s: AppState, nowMs = Date.now()): MeasuredTdee | null {
  const from = nowMs - 28 * DAY;
  const foods = (s.foods ?? []).filter(f => Date.parse(f.date + 'T12:00:00') >= from);
  const days = [...new Set(foods.map(f => f.date))].filter(d => new Set(foods.filter(f => f.date === d).map(f => f.meal)).size >= 2);
  if (days.length < 10) return null;
  const intake = days.reduce((t, d) => t + foods.filter(f => f.date === d).reduce((a, f) => a + f.kcal * f.grams / 100, 0), 0) / days.length;
  const points = [
    ...s.checkins.filter(c => c.weight !== null).map(c => ({ t: Date.parse(c.date), w: c.weight! })),
    ...(s.measurements ?? []).filter(m => m.weight !== null).map(m => ({ t: Date.parse(m.date + 'T08:00:00'), w: m.weight! })),
  ].filter(x => x.t >= from && x.t <= nowMs);
  if (points.length < 4) return null;
  const span = (Math.max(...points.map(x => x.t)) - Math.min(...points.map(x => x.t))) / DAY;
  if (span < 10) return null;
  // Least-squares slope of weight over time (kg per day): steadier than first-vs-last weigh-in.
  const mt = points.reduce((a, x) => a + x.t, 0) / points.length, mw = points.reduce((a, x) => a + x.w, 0) / points.length;
  const slope = points.reduce((a, x) => a + (x.t - mt) / DAY * (x.w - mw), 0) / points.reduce((a, x) => a + ((x.t - mt) / DAY) ** 2, 0);
  const kcal = intake - slope * KCAL_PER_KG;
  if (!Number.isFinite(kcal) || kcal < 1200 || kcal > 5000) return null;
  return { kcal: Math.round(kcal / 10) * 10, date: new Date(nowMs).toISOString(), days: days.length, intake: Math.round(intake), weeklyChange: Math.round(slope * 7 * 100) / 100 };
}

/** Maintenance to plan with: mostly the measured value, kept within ±25% of the equation in case of logging gaps. */
export function blendTdee(formula: number, measured: MeasuredTdee | null | undefined, nowMs = Date.now()) {
  if (!measured || nowMs - Date.parse(measured.date) > 42 * DAY) return { tdee: formula, measured: false };
  const m = Math.min(formula * 1.25, Math.max(formula * 0.75, measured.kcal));
  return { tdee: 0.75 * m + 0.25 * formula, measured: true };
}
