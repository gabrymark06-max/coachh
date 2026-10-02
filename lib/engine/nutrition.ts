import { blendTdee } from './tdee';
import type { MeasuredTdee, Phase, Profile } from '../types';
import { phaseNames } from '../types';
import { cite } from './refs';
import { sampleDay, swaps, type Meal, type Macros } from './meals';

export type BodyFatBand = 'lean' | 'ok' | 'high-ish' | 'high' | null;
export type NutritionPlan = {
  blocked: boolean; reason: string;
  phase: Phase | null; phaseLabel: string; phaseReason: string; rate: number; weeklyChange: string | null;
  bodyFat: number | null; band: BodyFatBand; bmr: number | null; tdee: number | null; tdeeMeasured?: boolean;
  calories: number[] | null; average: Macros | null; training: Macros | null; rest: Macros | null;
  protein: number[] | null; fiber: number | null; water: number | null; carbsPerKg: number[] | null; fat: number | null; carbs: number | null;
  timeline: { week: number; weight: number }[]; meals: { training: Meal[]; rest: Meal[] } | null; swaps: { group: string; items: string[] }[];
  tips: { title: string; text: string; sources: string[] }[]; sources: string[];
};
export type Activity = { gymDays: number; cardioMinutes: number; steps: number };

/** Relative fat mass (Woolcott 2018): 64 − 20 × height/waist (+12 for women). */
export function bodyFat(p: Profile): number | null {
  if (!p.waist || !p.height || p.sex === 'unspecified') return null;
  return Math.round((64 - 20 * p.height / p.waist + (p.sex === 'female' ? 12 : 0)) * 10) / 10;
}
export function bandOf(p: Profile): BodyFatBand {
  const bf = bodyFat(p);
  const female = p.sex === 'female';
  if (bf !== null) {
    const [lean, ok, mid] = female ? [23, 30, 35] : [15, 20, 25];
    return bf < lean ? 'lean' : bf < ok ? 'ok' : bf < mid ? 'high-ish' : 'high';
  }
  if (p.weight && p.height) {
    const bmi = p.weight / (p.height / 100) ** 2;
    return bmi >= 30 ? 'high' : bmi >= 27 ? 'high-ish' : bmi < 21 ? 'lean' : 'ok';
  }
  return null;
}
export const bandText: Record<NonNullable<BodyFatBand>, string> = { lean: 'basso', ok: 'nella norma', 'high-ish': 'un po’ alto', high: 'alto' };

/** Which phase to run now, how fast, and why. */
export function recommendPhase(p: Profile): { phase: Phase; rate: number; reason: string } {
  const band = bandOf(p);
  const level = p.strengthLevel;
  const goal = p.goal === 'balanced' ? 'recomp' : p.goal === 'running' ? 'health' : p.goal;
  const gainRate = level === 'new' ? 0.5 : level === 'intermediate' ? 0.35 : 0.25;
  if (p.nutritionPhase && p.nutritionPhase !== 'auto') {
    const rate = { cut: band === 'high' ? -0.9 : band === 'lean' ? -0.4 : -0.6, recomp: -0.2, maintain: 0, gain: gainRate }[p.nutritionPhase];
    return { phase: p.nutritionPhase, rate, reason: 'Hai scelto tu la fase: adatto ritmo e calorie al tuo punto di partenza.' };
  }
  const bfText = band ? `Il grasso corporeo stimato è ${bandText[band]}` : 'Senza circonferenza vita uso peso e altezza';
  if (goal === 'fat-loss') {
    const rate = band === 'high' ? -0.9 : band === 'high-ish' ? -0.7 : band === 'lean' ? -0.4 : -0.5;
    return { phase: 'cut', rate, reason: `${bfText}: ti consiglio una definizione a circa ${Math.abs(rate).toLocaleString('it-IT')}% del peso a settimana. ${band === 'lean' || band === 'ok' ? 'Più sei magro, più conviene andare piano per non perdere muscolo.' : 'Partendo da più grasso si può scendere un po’ più veloce senza perdere muscolo.'}` };
  }
  if (goal === 'muscle' || goal === 'strength') {
    if (band === 'high' || band === 'high-ish') return { phase: 'recomp', rate: -0.25, reason: `${bfText}. Prima di un surplus ti consiglio una ricomposizione con un leggero deficit: con più grasso il surplus aggiungerebbe soprattutto grasso, mentre i pesi e le proteine alte fanno crescere i muscoli anche così.` };
    const rate = goal === 'strength' ? Math.min(gainRate, 0.25) : gainRate;
    return { phase: 'gain', rate, reason: `${bfText}: è il momento giusto per mettere massa con un surplus moderato (+${rate.toLocaleString('it-IT')}% del peso a settimana). ${level === 'new' ? 'Chi inizia cresce più in fretta e può permettersi un ritmo un po’ più alto.' : 'Più sei allenato, più il ritmo deve essere lento per non accumulare grasso.'}` };
  }
  if (goal === 'recomp') {
    if (band === 'high' || band === 'high-ish') return { phase: 'recomp', rate: -0.3, reason: `${bfText}: ricomposizione con un leggero deficit (−10% circa). Perdi grasso mentre la palestra e le proteine alte fanno crescere o conservano i muscoli: funziona meglio per chi inizia o riparte.` };
    return { phase: 'recomp', rate: 0, reason: `${bfText}: ricomposizione a calorie di mantenimento. Il peso resta quasi fermo mentre cambia la composizione: giro vita e carichi sono i numeri da seguire, non solo la bilancia.` };
  }
  if (band === 'high') return { phase: 'cut', rate: -0.5, reason: `${bfText}: per la salute ti consiglio una definizione lenta (0,5% a settimana), sostenibile nel tempo.` };
  return { phase: 'maintain', rate: 0, reason: `${bfText}: mantenimento. L’obiettivo è energia per allenarti e una dieta di qualità.` };
}

const r10 = (x: number) => Math.round(x / 10) * 10;

export function nutrition(p: Profile, activity: Activity = { gymDays: Math.max(1, p.days.length - 1), cardioMinutes: 60, steps: p.steps ?? 6000 }, measured?: MeasuredTdee | null): NutritionPlan {
  const tips: NutritionPlan['tips'] = [];
  const base: NutritionPlan = {
    blocked: false, reason: '', phase: null, phaseLabel: '—', phaseReason: '', rate: 0, weeklyChange: null, bodyFat: bodyFat(p), band: bandOf(p), bmr: null, tdee: null,
    calories: null, average: null, training: null, rest: null, protein: null, fiber: null, water: null, carbsPerKg: null, fat: null, carbs: null, timeline: [], meals: null, swaps: [], tips, sources: [],
  };
  const bmi = p.weight && p.height ? p.weight / (p.height / 100) ** 2 : null;
  const rec = recommendPhase(p);
  if (p.clinical && !p.medicalClearance) return { ...base, blocked: true, reason: 'Con condizioni cliniche o disturbi alimentari le indicazioni sulla dieta vanno decise con il medico o un dietista.', sources: cite('reds') };
  if (!p.nutritionConsent) return { ...base, blocked: true, reason: 'Hai scelto di non ricevere indicazioni sulla dieta. Puoi attivarle dal profilo quando vuoi.', sources: [] };
  if (rec.phase === 'cut' && bmi !== null && bmi < 18.5) return { ...base, blocked: true, reason: 'Con un indice di massa corporea sotto 18,5 non propongo un deficit: parlane con un medico o un dietista.', sources: cite('reds') };
  const out: NutritionPlan = { ...base, phase: rec.phase, phaseLabel: phaseNames[rec.phase], phaseReason: rec.reason, rate: rec.rate };
  if (!p.weight) return { ...out, reason: 'Aggiungi peso, altezza e circonferenza vita per calorie e macronutrienti personali.', sources: cite('protein') };
  const w = p.weight;
  // Reference weight for protein: at BMI ≥ 27 use the weight at BMI 25, so protein is not inflated by fat mass.
  const ref = bmi !== null && bmi >= 27 && p.height ? 25 * (p.height / 100) ** 2 : w;
  const perKg = { cut: [2.0, 2.4], recomp: [1.8, 2.2], maintain: [1.6, 2.0], gain: [1.6, 2.0] }[rec.phase].map(x => x + (p.diet === 'vegan' ? 0.1 : 0));
  const protein = perKg.map(x => Math.round(ref * x));
  out.protein = protein;
  out.weeklyChange = rec.rate === 0 ? 'Peso stabile (±0,5 kg nella media settimanale)' : `${rec.rate > 0 ? '+' : '−'}${(Math.abs(rec.rate) * w / 100).toFixed(2).replace('.', ',')} kg a settimana circa`;
  out.timeline = [0, 4, 8, 12].map(week => ({ week, weight: Math.round(w * (1 + rec.rate / 100) ** week * 10) / 10 }));
  if (!p.height || p.sex === 'unspecified') return { ...out, reason: 'Proteine calcolate dal peso. Per le calorie servono altezza e sesso (solo per l’equazione).', sources: cite('protein') };
  // Energy: Mifflin-St Jeor × activity. Job baseline + gym days + structured cardio + steps above 5000.
  const bmr = 10 * w + 6.25 * p.height - 5 * p.age + (p.sex === 'male' ? 5 : -161);
  const job = { low: 1.3, medium: 1.42, high: 1.55 }[p.activity];
  const factor = Math.min(2.1, job + 0.03 * activity.gymDays + activity.cardioMinutes * 0.0005 + Math.max(0, activity.steps - 5000) / 1000 * 0.02);
  const formula = bmr * factor;
  const { tdee, measured: fromData } = blendTdee(formula, measured);
  let target = tdee;
  if (rec.phase === 'cut') target = tdee - Math.min(tdee * 0.25, w * Math.abs(rec.rate) / 100 * 7700 / 7);
  if (rec.phase === 'recomp') target = tdee * (rec.rate < 0 ? 0.9 : 1);
  if (rec.phase === 'gain') target = tdee * (1 + (rec.rate >= 0.5 ? 0.12 : rec.rate >= 0.35 ? 0.09 : 0.06));
  const floor = Math.max(bmr * 1.1, p.sex === 'female' ? 1300 : 1500);
  target = Math.max(target, floor);
  const P = Math.round((protein[0] + protein[1]) / 2);
  const fat = Math.max(Math.round(w * 0.6), Math.round(target * 0.27 / 9));
  const carbs = Math.max(50, Math.round((target - P * 4 - fat * 9) / 4));
  // Training days get ~20% more carbohydrate, rest days less, same weekly total.
  const trainDays = Math.min(7, p.days.length);
  // Carb cycling only when there are enough rest days to balance it; rest-day cut capped at 30% of carbs.
  const cycle = trainDays <= 5;
  const deltaT = cycle ? Math.round(carbs * 0.12) : 0;
  const deltaR = cycle ? Math.min(Math.round(deltaT * trainDays / (7 - trainDays)), Math.round(carbs * 0.3)) : 0;
  const mk = (c: number): Macros => ({ protein: P, fat, carbs: c, kcal: r10(P * 4 + fat * 9 + c * 4) });
  out.bmr = Math.round(bmr); out.tdee = r10(tdee);
  out.average = mk(carbs); out.training = mk(carbs + deltaT); out.rest = mk(Math.max(50, carbs - deltaR));
  out.calories = [r10(target * 0.95), r10(target * 1.05)];
  out.fat = fat; out.carbs = carbs; out.carbsPerKg = [Math.round(carbs / w * 10) / 10, Math.round((carbs + deltaT) / w * 10) / 10];
  out.fiber = Math.round(target / 1000 * 14);
  out.water = Math.round((w * 0.035 + 0.5) * 10) / 10;
  const trainingDay = sampleDay(p, out.training, 0, true), restDay = sampleDay(p, out.rest, 2, false);
  const kcalOf = (day: Meal[]) => day.reduce((t, m) => t + m.kcal, 0);
  // A rest day never shows more food than a training day: with equal targets, or when portion floors keep it high, reuse the training day.
  out.meals = { training: trainingDay, rest: out.rest.kcal >= out.training.kcal || kcalOf(restDay) > kcalOf(trainingDay) ? trainingDay : restDay };
  out.swaps = swaps(p);
  out.tdeeMeasured = fromData;
  out.reason = fromData ? `Mantenimento misurato su di te: ${r10(measured!.kcal)} kcal dalle calorie registrate e dall’andamento del peso, combinato con la stima dell’equazione (${r10(formula)} kcal).` : `Fabbisogno stimato ${r10(tdee)} kcal: equazione di Mifflin-St Jeor (errore individuale ±10%) per un fattore che conta lavoro, ${activity.gymDays} sedute di palestra, ${activity.cardioMinutes} minuti di cardio e ${activity.steps.toLocaleString('it-IT')} passi. Non sommare le calorie dello smartwatch: sono già comprese.`;
  out.sources = cite('energyEstimate', 'protein', rec.phase === 'cut' ? 'deficit' : rec.phase === 'gain' ? 'surplus' : 'recomposition', 'bodyFat');
  // Practical guidance by phase.
  tips.push({ title: 'Come capire se funziona', text: rec.phase === 'recomp' && rec.rate === 0 ? 'Il peso cambierà poco: misura il giro vita ogni 2 settimane (stessa ora, ombelico, a fine espirazione) e segui i carichi in palestra. Vita che scende e carichi che salgono = ricomposizione riuscita.' : `Pesati 3–7 volte a settimana al mattino e guarda la media settimanale. Obiettivo: ${out.weeklyChange.toLowerCase()}. Misura anche il giro vita ogni 2 settimane. Se dopo 2 settimane la media non va come previsto, correggo di 100–200 kcal.`, sources: cite('weighing', 'bodyFat') });
  tips.push({ title: 'Proteine ad ogni pasto', text: `${protein[0]}–${protein[1]} g al giorno, cioè circa ${Math.round(P / Math.max(3, p.mealsPerDay ?? 4))} g per pasto. ${rec.phase === 'cut' || rec.phase === 'recomp' ? 'In deficit le proteine alte proteggono i muscoli e tengono a bada la fame.' : 'Distribuirle nella giornata aiuta la sintesi muscolare; un pasto proteico abbondante non è sprecato.'}`, sources: cite('protein', 'proteinTiming', ...(rec.phase === 'cut' || rec.phase === 'recomp' ? ['proteinDeficit' as const, 'satiety' as const] : [])) });
  tips.push({ title: 'Carboidrati intorno all’allenamento', text: `${out.training.carbs === out.rest.carbs ? `${out.average.carbs} g al giorno` : `Nei giorni di allenamento ${out.training.carbs} g, in quelli di riposo ${out.rest.carbs} g`}. Metti la porzione più grande nel pasto prima o dopo la palestra.`, sources: cite('carbs') });
  if (rec.phase === 'cut') {
    tips.push({ title: 'Gestire la fame', text: 'Verdure in ogni pasto principale, legumi spesso, proteine alte e cibi poco processati: saziano con meno calorie. I prodotti ultra-processati fanno mangiare di più senza accorgersene.', sources: cite('satiety', 'dietPattern') });
    tips.push({ title: 'Pause dalla dieta', text: 'Dopo 8–12 settimane di deficit, o se la fame diventa difficile, una settimana a mantenimento riduce fame e stanchezza mentale senza far perdere i progressi.', sources: cite('dietBreak') });
  }
  if (rec.phase === 'gain') tips.push({ title: 'Massa senza troppo grasso', text: `Surplus moderato: se il peso sale più di ${(w * 0.006).toFixed(1).replace('.', ',')} kg a settimana tolgo calorie, se resta fermo per 2 settimane ne aggiungo. Ogni 12–16 settimane valutiamo una breve fase di definizione.`, sources: cite('surplus') });
  tips.push({ title: 'Acqua e fibre', text: `Circa ${out.water.toLocaleString('it-IT')} litri d’acqua al giorno (di più quando sudi) e ${out.fiber} g di fibre da verdura, frutta, legumi e cereali integrali.`, sources: cite('hydration', 'dietPattern') });
  tips.push({ title: 'Integratori utili', text: 'Creatina monoidrato 3–5 g al giorno, tutti i giorni: le prove migliori per massa e forza. Caffeina prima dell’allenamento se ti aiuta, non nelle 8 ore prima di dormire. Proteine in polvere solo se comode per arrivare al totale.', sources: cite('supplements', 'caffeineSleep') });
  if (p.diet !== 'omnivore') tips.push({ title: p.diet === 'vegan' ? 'Dieta vegana' : 'Dieta vegetariana', text: `Soia, legumi, seitan e cereali coprono le proteine: punta alla parte alta dell’intervallo.${p.diet === 'vegan' ? ' La vitamina B12 va integrata; per ferro, zinco, iodio e omega-3 confrontati con un professionista.' : ''}`, sources: cite('plant') });
  return out;
}

export function phaseFor(p: Profile): Phase { return recommendPhase(p).phase; }
