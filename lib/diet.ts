// Nutrition as the app shows it: the coach's plan, with the person's own targets and sample day on top when they set them.
import type { AppState, MyMeal } from './types';
import { nutrition, activityFrom, type NutritionPlan } from './planner';
import { findGeneric } from './foods';
import type { Meal } from './engine/meals';

const toMeal = (m: MyMeal): Meal => {
  const items = m.items.map(i => ({ food: i.food, grams: i.grams }));
  const t = m.items.reduce((a, i) => { const f = findGeneric(i.food); return f ? { kcal: a.kcal + f.kcal * i.grams / 100, p: a.p + f.p * i.grams / 100, c: a.c + f.c * i.grams / 100, f: a.f + f.f * i.grams / 100 } : a; }, { kcal: 0, p: 0, c: 0, f: 0 });
  return { name: m.name, items, kcal: Math.round(t.kcal), p: Math.round(t.p), c: Math.round(t.c), f: Math.round(t.f) };
};

export function nutritionFor(s: AppState): (NutritionPlan & { customTargets?: boolean; customDay?: boolean }) | null {
  const p = s.profile;
  if (!p) return null;
  const n = nutrition(p, activityFrom(p, s.plan), s.tdee);
  if (n.blocked && !s.diet) return n;
  const out: NutritionPlan & { customTargets?: boolean; customDay?: boolean } = { ...n, blocked: false };
  if (s.diet) {
    const days = Math.min(7, s.plan?.sessions.length ?? p.days.length);
    const avg = (k: 'kcal' | 'protein' | 'carbs' | 'fat') => Math.round((s.diet!.training[k] * days + s.diet!.rest[k] * (7 - days)) / 7);
    out.training = s.diet.training; out.rest = s.diet.rest;
    out.average = { kcal: avg('kcal'), protein: avg('protein'), carbs: avg('carbs'), fat: avg('fat') };
    out.customTargets = true;
  }
  if (s.myDay) { out.meals = { training: s.myDay.training.map(toMeal), rest: s.myDay.rest.map(toMeal) }; out.customDay = true; }
  return out;
}
