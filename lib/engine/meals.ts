import type { Allergen, Profile } from '../types';

// Approximate values per 100 g (raw weight for meat, fish, pasta, rice and grains; drained/cooked for canned legumes).
type Food = { name: string; kcal: number; p: number; c: number; f: number; role: ('protein' | 'carb' | 'fat' | 'fruit' | 'veg' | 'legume' | 'dairy')[]; meals: ('breakfast' | 'main' | 'snack')[]; animal?: 'meat' | 'fish' | 'egg' | 'dairy'; allergens?: Allergen[]; unit?: string };
const F: Food[] = [
  { name: 'petto di pollo', kcal: 110, p: 23, c: 0, f: 1.5, role: ['protein'], meals: ['main'], animal: 'meat' },
  { name: 'fesa di tacchino', kcal: 107, p: 24, c: 0, f: 1, role: ['protein'], meals: ['main'], animal: 'meat' },
  { name: 'manzo magro', kcal: 130, p: 21, c: 0, f: 5, role: ['protein'], meals: ['main'], animal: 'meat' },
  { name: 'merluzzo', kcal: 80, p: 17, c: 0, f: 0.7, role: ['protein'], meals: ['main'], animal: 'fish', allergens: ['fish'] },
  { name: 'salmone', kcal: 200, p: 20, c: 0, f: 13, role: ['protein'], meals: ['main'], animal: 'fish', allergens: ['fish'] },
  { name: 'tonno al naturale sgocciolato', kcal: 110, p: 25, c: 0, f: 1, role: ['protein'], meals: ['main'], animal: 'fish', allergens: ['fish'] },
  { name: 'uova intere', kcal: 140, p: 12.5, c: 0.5, f: 10, role: ['protein'], meals: ['breakfast', 'main'], animal: 'egg', allergens: ['eggs'], unit: 'circa 60 g l’una' },
  { name: 'albume', kcal: 50, p: 11, c: 0.7, f: 0.2, role: ['protein'], meals: ['breakfast', 'main'], animal: 'egg', allergens: ['eggs'] },
  { name: 'bresaola', kcal: 150, p: 32, c: 0.5, f: 2, role: ['protein'], meals: ['main'], animal: 'meat' },
  { name: 'mozzarella light', kcal: 160, p: 20, c: 1, f: 9, role: ['protein'], meals: ['main'], animal: 'dairy', allergens: ['lactose'] },
  { name: 'tofu', kcal: 120, p: 13, c: 2, f: 7, role: ['protein'], meals: ['main'] },
  { name: 'tempeh', kcal: 190, p: 19, c: 9, f: 11, role: ['protein'], meals: ['main'] },
  { name: 'seitan', kcal: 120, p: 24, c: 4, f: 1.5, role: ['protein'], meals: ['main'], allergens: ['gluten'] },
  { name: 'yogurt greco 0%', kcal: 57, p: 10, c: 4, f: 0.2, role: ['protein', 'dairy'], meals: ['breakfast', 'snack'], animal: 'dairy', allergens: ['lactose'] },
  { name: 'skyr', kcal: 63, p: 11, c: 4, f: 0.2, role: ['protein', 'dairy'], meals: ['breakfast', 'snack'], animal: 'dairy', allergens: ['lactose'] },
  { name: 'fiocchi di latte', kcal: 98, p: 12, c: 3, f: 4, role: ['protein', 'dairy'], meals: ['snack', 'breakfast'], animal: 'dairy', allergens: ['lactose'] },
  { name: 'yogurt di soia proteico', kcal: 70, p: 7, c: 3, f: 3, role: ['protein', 'dairy'], meals: ['breakfast', 'snack'] },
  { name: 'proteine vegetali in polvere', kcal: 370, p: 80, c: 5, f: 6, role: ['protein'], meals: ['breakfast', 'snack'] },
  { name: 'proteine del siero in polvere', kcal: 380, p: 80, c: 6, f: 5, role: ['protein'], meals: ['breakfast', 'snack'], animal: 'dairy', allergens: ['lactose'] },
  { name: 'pasta di semola (peso crudo)', kcal: 355, p: 12, c: 72, f: 1.5, role: ['carb'], meals: ['main'], allergens: ['gluten'] },
  { name: 'pasta integrale (peso crudo)', kcal: 340, p: 13, c: 66, f: 2.5, role: ['carb'], meals: ['main'], allergens: ['gluten'] },
  { name: 'riso basmati (peso crudo)', kcal: 355, p: 7.5, c: 79, f: 0.6, role: ['carb'], meals: ['main'] },
  { name: 'farro (peso crudo)', kcal: 335, p: 15, c: 67, f: 2.5, role: ['carb'], meals: ['main'], allergens: ['gluten'] },
  { name: 'quinoa (peso crudo)', kcal: 365, p: 14, c: 64, f: 6, role: ['carb'], meals: ['main'] },
  { name: 'patate', kcal: 77, p: 2, c: 17, f: 0.1, role: ['carb'], meals: ['main'] },
  { name: 'pane integrale', kcal: 240, p: 9, c: 45, f: 2.5, role: ['carb'], meals: ['main', 'breakfast'], allergens: ['gluten'] },
  { name: 'fiocchi d’avena', kcal: 370, p: 13, c: 60, f: 7, role: ['carb'], meals: ['breakfast'], allergens: ['gluten'] },
  { name: 'gallette di riso', kcal: 380, p: 8, c: 81, f: 3, role: ['carb'], meals: ['breakfast', 'snack'] },
  { name: 'ceci in scatola sgocciolati', kcal: 120, p: 7, c: 16, f: 2.5, role: ['legume', 'protein', 'carb'], meals: ['main'] },
  { name: 'lenticchie cotte', kcal: 115, p: 9, c: 18, f: 0.5, role: ['legume', 'protein', 'carb'], meals: ['main'] },
  { name: 'fagioli borlotti cotti', kcal: 110, p: 7, c: 17, f: 0.5, role: ['legume', 'protein', 'carb'], meals: ['main'] },
  { name: 'verdure di stagione', kcal: 25, p: 2, c: 3.5, f: 0.3, role: ['veg'], meals: ['main'] },
  { name: 'banana', kcal: 90, p: 1, c: 21, f: 0.3, role: ['fruit'], meals: ['breakfast', 'snack'] },
  { name: 'frutti di bosco', kcal: 45, p: 1, c: 10, f: 0.3, role: ['fruit'], meals: ['breakfast', 'snack'] },
  { name: 'mela', kcal: 52, p: 0.3, c: 13, f: 0.2, role: ['fruit'], meals: ['snack', 'breakfast'] },
  { name: 'olio extravergine d’oliva', kcal: 900, p: 0, c: 0, f: 100, role: ['fat'], meals: ['main'] },
  { name: 'frutta secca (mandorle, noci)', kcal: 600, p: 21, c: 7, f: 52, role: ['fat'], meals: ['breakfast', 'snack'], allergens: ['nuts'] },
  { name: 'burro di arachidi', kcal: 600, p: 25, c: 15, f: 50, role: ['fat'], meals: ['breakfast', 'snack'], allergens: ['nuts'] },
  { name: 'semi di chia', kcal: 490, p: 17, c: 8, f: 31, role: ['fat'], meals: ['breakfast', 'snack'] },
  { name: 'avocado', kcal: 160, p: 2, c: 2, f: 15, role: ['fat'], meals: ['main', 'breakfast'] },
];

export type MealItem = { food: string; grams: number; note?: string };
export type Meal = { name: string; items: MealItem[]; kcal: number; p: number; c: number; f: number };
export type Macros = { kcal: number; protein: number; carbs: number; fat: number };

function allowed(p: Profile) {
  const dislikes = (p.dislikes ?? '').toLowerCase().split(/[,;\n]+/).map(x => x.trim()).filter(x => x.length > 2);
  const restrict = (p.restrictions ?? '').toLowerCase();
  const allergens = new Set<Allergen>(p.allergens ?? []);
  if (/lattosio|latte/.test(restrict)) allergens.add('lactose');
  if (/glutine|celiac/.test(restrict)) allergens.add('gluten');
  if (/frutta secca|noci|arachid/.test(restrict)) allergens.add('nuts');
  return F.filter(f =>
    !(f.allergens ?? []).some(a => allergens.has(a)) &&
    !(p.diet === 'vegetarian' && (f.animal === 'meat' || f.animal === 'fish')) &&
    !(p.diet === 'vegan' && f.animal) &&
    !dislikes.some(d => f.name.includes(d)));
}

const round5 = (x: number) => Math.max(0, Math.round(x / 5) * 5);
const pick = (list: Food[], i: number) => list.length ? list[i % list.length] : undefined;
/** Protein source for a meal: rotate for variety, but skip foods whose fat alone would exceed most of the meal's fat budget. */
function choose(list: Food[], i: number, P: number, fatBudget: number): Food | undefined {
  if (!list.length) return undefined;
  for (let k = 0; k < list.length; k++) {
    const f = list[(i + k) % list.length];
    if ((P / f.p) * f.f <= fatBudget * 0.7) return f;
  }
  return [...list].sort((a, b) => a.f / a.p - b.f / b.p)[0];
}
const minPortion = (f: Food | undefined, meal: 'main' | 'snack') => !f ? 0 : f.p > 50 ? 25 : f.role.includes('legume') ? 150 : f.role.includes('dairy') ? 150 : meal === 'main' ? 100 : 80;

/** Two-food solver: grams of a protein food and a carb food that hit the meal's protein and carbohydrate targets. */
function solve(pf: Food | undefined, cf: Food | undefined, P: number, C: number) {
  if (!pf && !cf) return [0, 0];
  if (!cf) return [Math.max(0, (P / pf!.p) * 100), 0];
  if (!pf) return [0, Math.max(0, (C / cf.c) * 100)];
  const a = pf.p / 100, b = cf.p / 100, c = pf.c / 100, d = cf.c / 100;
  const det = a * d - b * c;
  let x = det ? (P * d - b * C) / det : P / a;
  let y = det ? (a * C - c * P) / det : C / d;
  if (x < 0) { x = 0; y = C / d; }
  if (y < 0) { y = 0; x = P / a; }
  return [x, y];
}

function build(name: string, slots: { food?: Food; grams: number; note?: string }[]): Meal {
  const items = slots.filter(s => s.food && s.grams >= 5).map(s => ({ food: s.food!.name, grams: s.grams, note: s.note }));
  const tot = slots.reduce((t, s) => s.food ? { kcal: t.kcal + s.food.kcal * s.grams / 100, p: t.p + s.food.p * s.grams / 100, c: t.c + s.food.c * s.grams / 100, f: t.f + s.food.f * s.grams / 100 } : t, { kcal: 0, p: 0, c: 0, f: 0 });
  return { name, items, kcal: Math.round(tot.kcal), p: Math.round(tot.p), c: Math.round(tot.c), f: Math.round(tot.f) };
}

/** Build a sample day from daily macro targets, respecting diet, allergens and dislikes. `variant` rotates food choices. */
export function sampleDay(p: Profile, target: Macros, variant: number, training: boolean): Meal[] {
  const ok = allowed(p);
  const by = (role: Food['role'][number], meal: Food['meals'][number]) => ok.filter(f => f.role.includes(role) && f.meals.includes(meal));
  const n = Math.max(3, Math.min(5, p.mealsPerDay ?? 4));
  const names = n === 3 ? ['Colazione', 'Pranzo', 'Cena'] : n === 4 ? ['Colazione', 'Pranzo', 'Spuntino', 'Cena'] : ['Colazione', 'Spuntino', 'Pranzo', 'Spuntino', 'Cena'];
  // Share of the day per meal; carbs lean towards the meals around training.
  const around = p.trainingTime === 'morning' ? 'Colazione' : p.trainingTime === 'midday' ? 'Pranzo' : n >= 4 ? 'Spuntino' : 'Cena';
  const weight = names.map(m => (m === 'Spuntino' ? 0.55 : m === 'Colazione' ? 0.8 : 1));
  const carbW = names.map((m, i) => weight[i] * (training && m === around ? 1.5 : 1));
  const share = (w: number[], i: number) => w[i] / w.reduce((a, b) => a + b, 0);
  const meals: Meal[] = [];
  const used = new Set<string>();
  const fresh = (list: Food[]) => { const f = list.filter(x => !used.has(x.name)); return f.length ? f : list; };
  names.forEach((m, i) => {
    const P = target.protein * share(weight, i), C = target.carbs * share(carbW, i), Fat = target.fat * share(weight, i);
    const v = variant + i;
    if (m === 'Colazione' || m === 'Spuntino') {
      const kind = m === 'Colazione' ? 'breakfast' : 'snack';
      const prot = choose(fresh(by('protein', kind)).sort((a, b) => Number(b.role.includes('dairy')) - Number(a.role.includes('dairy'))), v - i, P, Fat);
      if (prot) used.add(prot.name);
      const fruit = pick(by('fruit', kind), v + 1);
      const fruitG = C > 25 ? 150 : 100;
      const carb = pick(by('carb', kind), v);
      const fruitC = fruit ? fruit.c * fruitG / 100 : 0;
      let [pg, cg] = solve(prot, C - fruitC > 10 ? carb : undefined, P, Math.max(0, C - fruitC));
      if (prot && pg < minPortion(prot, 'snack')) { pg = minPortion(prot, 'snack'); if (carb) cg = Math.max(0, (C - fruitC - prot.c * pg / 100) / carb.c * 100); }
      const fat = pick(by('fat', kind), v);
      const fNow = (prot ? prot.f * pg / 100 : 0) + (carb && C - fruitC > 10 ? carb.f * cg / 100 : 0);
      const fg = fat ? Math.min(30, Math.max(0, (Fat - fNow) / fat.f * 100)) : 0;
      const pGrams = round5(Math.min(prot?.p && prot.p > 50 ? 40 : 350, pg));
      const powder = ok.find(f => f.p > 50 && f !== prot);
      const short = P - (prot ? prot.p * pGrams / 100 : 0) - (fruit ? fruit.p * fruitG / 100 : 0) - (carb && C - fruitC > 10 ? carb.p * cg / 100 : 0);
      const topUp = short > 8 && powder ? { food: powder, grams: round5(Math.min(30, short / powder.p * 100)) } : { food: undefined, grams: 0 };
      meals.push(build(m, [topUp, { food: prot, grams: pGrams }, { food: C - fruitC > 10 ? carb : undefined, grams: round5(Math.min(120, cg)) }, { food: fruit, grams: fruitG }, { food: fat, grams: round5(fg) }]));
      return;
    }
    // Main meals: protein + starch + vegetables + olive oil (legumes can be both protein and starch for plant-based diets).
    const proteins = by('protein', 'main').filter(f => !f.role.includes('legume') || p.diet !== 'omnivore');
    const prot = choose(fresh(proteins), v + (m === 'Cena' ? 3 : 0), P, Fat);
    if (prot) used.add(prot.name);
    const carbs = by('carb', 'main').filter(f => !f.role.includes('legume'));
    // Large starch portions bring a lot of protein with them: prefer lower-protein starches when carbs dominate the meal.
    const starch = C > 3 * P ? [...carbs].sort((a, b) => a.p / a.c - b.p / b.c).slice(0, 3) : carbs;
    const carb = pick(m === 'Cena' ? [...starch].reverse() : starch, v);
    const veg = ok.find(f => f.role.includes('veg'));
    const vegG = 200;
    let [pg, cg] = solve(prot, carb, P - (veg ? veg.p * 2 : 0), C - (veg ? veg.c * 2 : 0));
    if (prot && pg < minPortion(prot, 'main')) { pg = minPortion(prot, 'main'); if (carb) cg = Math.max(0, (C - (veg ? veg.c * 2 : 0) - prot.c * pg / 100) / carb.c * 100); }
    const oil = ok.find(f => f.name.startsWith('olio'));
    const fNow = (prot ? prot.f * pg / 100 : 0) + (carb ? carb.f * cg / 100 : 0);
    const og = oil ? Math.min(30, Math.max(5, (Fat - fNow) / oil.f * 100)) : 0;
    const mainGrams = round5(Math.min(prot && prot.role.includes('legume') ? 400 : 350, pg));
    const shortMain = P - (prot ? prot.p * mainGrams / 100 : 0) - (carb ? carb.p * cg / 100 : 0) - (veg ? veg.p * 2 : 0);
    const second = shortMain > 8 ? fresh(proteins).find(f => f !== prot && !f.role.includes('legume') && f.p >= 12) ?? proteins.find(f => f !== prot && f.p >= 12) : undefined;
    const extra = second ? { food: second, grams: round5(Math.min(200, shortMain / second.p * 100)) } : { food: undefined, grams: 0 };
    if (second) used.add(second.name);
    meals.push(build(m, [{ food: prot, grams: mainGrams }, extra, { food: carb, grams: round5(Math.min(carb && carb.c < 30 ? 700 : 200, cg)) }, { food: veg, grams: vegG }, { food: oil, grams: round5(og) }]));
  });
  return meals;
}

/** Equivalent portions: same protein (or carbohydrate) as the reference food. */
export function swaps(p: Profile): { group: string; items: string[] }[] {
  const ok = allowed(p);
  const prot = ok.filter(f => f.role.includes('protein') && f.meals.includes('main') && !f.role.includes('legume'));
  const carb = ok.filter(f => f.role.includes('carb') && f.meals.includes('main') && !f.role.includes('legume'));
  const ref = prot[0], rc = carb[0];
  const out: { group: string; items: string[] }[] = [];
  if (ref) out.push({ group: `Proteine · ${Math.round(ref.p)} g di proteine`, items: prot.map(f => `${round5(ref.p / f.p * 100)} g di ${f.name}`) });
  if (rc) out.push({ group: `Carboidrati · ${Math.round(rc.c * 0.8)} g di carboidrati`, items: carb.map(f => `${round5(rc.c * 80 / f.c)} g di ${f.name}`) });
  const leg = ok.filter(f => f.role.includes('legume'));
  if (leg.length) out.push({ group: 'Legumi · fibre e proteine, utili in definizione', items: leg.map(f => `${round5(150)} g di ${f.name} (${Math.round(f.p * 1.5)} g proteine)`) });
  return out;
}
