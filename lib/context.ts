// Compact, readable summary of everything the coach knows about the person, sent with each chat question.
import type { AppState } from './types';
import { dayNames, goalNames, painNames, cardioNames } from './types';
import { nutrition, activityFrom, coreGoal, suggest, history, describe } from './planner';
import { retrieve } from './coach';
import { forGrams } from './foods';
import { mealNames } from './types';

const d = (iso: string) => new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
const kg = (x: number | null | undefined) => (x ? `${x.toLocaleString('it-IT')} kg` : '—');

export function buildContext(s: AppState): string {
  const p = s.profile, plan = s.plan;
  if (!p) return 'Profilo non compilato.';
  const out: string[] = [];
  out.push(`PROFILO: ${p.name}, ${p.age} anni, ${p.sex === 'male' ? 'uomo' : p.sex === 'female' ? 'donna' : 'sesso non indicato'}, ${p.weight ?? '?'} kg, ${p.height ?? '?'} cm, vita ${p.waist ?? '?'} cm. Obiettivo: ${goalNames[coreGoal(p)]}${p.goalDetail ? ` («${p.goalDetail}»)` : ''}. Livello in palestra: ${{ new: 'principiante', intermediate: 'intermedio', experienced: 'esperto' }[p.strengthLevel]}. Giorni: ${p.days.map(x => dayNames[x]).join(', ')}, fino a ${p.minutes} min. Attrezzatura: ${{ gym: 'palestra completa', dumbbells: 'manubri a casa', bodyweight: 'corpo libero' }[p.equipment]}. Priorità: ${{ whole: 'tutto il corpo', upper: 'parte superiore', lower: 'gambe e glutei' }[p.focus ?? 'whole']}. Preferenza esercizi: ${p.exercisePreference ?? 'misto'}. Cardio preferito: ${(p.cardio ?? []).map(c => cardioNames[c]).join(', ') || 'nessuno'}. Sonno ${p.sleepHours ?? '?'} h, stress ${p.stress ?? '?'}/5. Dieta ${p.diet}${p.allergens?.length ? `, allergie: ${p.allergens.join(', ')}` : ''}${p.dislikes ? `, non mangia: ${p.dislikes}` : ''}.${p.painCleared && p.painAreas?.length ? ` Zone delicate (autorizzate): ${p.painAreas.map(x => painNames[x]).join(', ')}.` : ''}`);
  if (plan && !plan.blocked) {
    const bp = plan.blueprint, pr = plan.progress;
    out.push(`PIANO: settimana ${plan.week}, blocco ${pr?.mesoCount ?? 1} (settimana ${pr?.mesoWeek ?? 1} di ${pr?.mesoLength ?? 5}${bp?.meso.deload ? ', scarico' : ''}). ${bp?.summary ?? ''}`);
    const done = new Set(s.logs.filter(l => l.week === plan.week).map(l => l.sessionId));
    for (const x of [...plan.sessions].sort((a, b) => a.day - b.day)) {
      if (x.type === 'strength') {
        const ex = x.exercises.map(e => {
          const sg = suggest(e, history(s, e.name), { deload: bp?.meso.deload });
          return `${e.name} ${e.sets}×${e.low}–${e.high}${e.unit === 'seconds' ? 's' : ''} RIR ${e.rir}${sg.load ? `, prossimo carico ${kg(sg.load)}` : ''}${sg.last ? ` (ultima volta ${sg.last})` : ''}`;
        }).join('; ');
        const cardio = x.phases.filter(ph => ph.label.startsWith('Cardio')).map(ph => `${ph.minutes}′ ${ph.label}`).join('');
        out.push(`- ${dayNames[x.day]}: ${x.title}${done.has(x.id) ? ' [fatta]' : ''} · ${ex}${cardio ? ` · ${cardio}` : ''}`);
      } else out.push(`- ${dayNames[x.day]}: ${x.title}${done.has(x.id) ? ' [fatta]' : ''} · ${x.phases.map(ph => `${ph.minutes}′ ${ph.label}`).join(', ')}`);
    }
    const n = nutrition(p, activityFrom(p, plan));
    if (!n.blocked && n.average) out.push(`NUTRIZIONE: fase ${n.phaseLabel}, ${n.training?.kcal} kcal nei giorni di allenamento e ${n.rest?.kcal} a riposo, proteine ${n.average.protein} g, carboidrati ${n.average.carbs} g, grassi ${n.average.fat} g. ${n.weeklyChange ?? ''}`);
  }
  const logs = s.logs.slice(-8);
  if (logs.length) {
    out.push('DIARIO (ultimi allenamenti):');
    for (const l of logs) {
      const byName = new Map<string, typeof l.results>();
      for (const r of l.results) { const k = r.name ?? r.exerciseId; byName.set(k, [...(byName.get(k) ?? []), r]); }
      const ex = [...byName].map(([name, rs]) => `${name} ${describe({ date: l.date, week: l.week, sets: rs.map(r => ({ weight: r.weight, reps: r.reps, rir: r.rir })) })}${rs.some(r => r.rir !== null) ? ` RIR ${rs.map(r => r.rir ?? '?').join('/')}` : ''}`).join('; ');
      out.push(`- ${d(l.date)} ${l.title}: ${l.duration} min, sforzo ${l.rpe}/10${l.completed === false ? ', parziale' : ''}${l.pain ? ', DOLORE' : ''}${ex ? ` · ${ex}` : ''}${l.note ? ` · nota: «${l.note}»` : ''}`);
    }
  } else out.push('DIARIO: nessun allenamento registrato.');
  const ms = s.measurements ?? [];
  if (ms.length) {
    const row = (m: typeof ms[number]) => `${d(m.date)}: ${[m.weight && `peso ${m.weight}`, m.waist && `vita ${m.waist}`, m.chest && `petto ${m.chest}`, m.arm && `braccio ${m.arm}`, m.thigh && `coscia ${m.thigh}`, m.hips && `fianchi ${m.hips}`].filter(Boolean).join(', ')}${Object.keys(m.photos).length ? ' (con foto)' : ''}`;
    out.push(`MISURE (kg e cm): ${[...(ms.length > 6 ? [ms[0]] : []), ...ms.slice(-6)].map(row).join(' | ')}`);
  }
  const foods = s.foods ?? [];
  if (foods.length) {
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Rome' });
    const tot = (list: typeof foods) => list.reduce((t, e) => { const m = forGrams(e, e.grams); return { k: t.k + m.kcal, p: t.p + m.p, c: t.c + m.c, f: t.f + m.f }; }, { k: 0, p: 0, c: 0, f: 0 });
    const days = [...new Set(foods.map(e => e.date))].sort().slice(-7);
    const r = (x: number) => Math.round(x);
    const t = tot(foods.filter(e => e.date === today));
    out.push(`ALIMENTAZIONE REGISTRATA OGGI: ${r(t.k)} kcal, P ${r(t.p)} g, C ${r(t.c)} g, G ${r(t.f)} g · ${foods.filter(e => e.date === today).map(e => `${mealNames[e.meal]}: ${e.name} ${r(e.grams)} g`).join('; ') || 'niente ancora'}`);
    out.push(`ULTIMI GIORNI REGISTRATI: ${days.map(d => { const x = tot(foods.filter(e => e.date === d)); return `${d.slice(5)} ${r(x.k)} kcal/P ${r(x.p)}`; }).join(' | ')}`);
  }
  const ck = s.checkins.slice(-5);
  if (ck.length) out.push(`CHECK-IN: ${ck.map(c => `${d(c.date)} sonno ${c.sleep} h, fatica ${c.fatigue}/5, indolenzimento ${c.soreness}/5${c.weight ? `, peso ${c.weight}` : ''}${c.pain ? ', dolore' : ''}${c.note ? ` «${c.note}»` : ''}`).join(' | ')}`);
  const dec = s.decisions.slice(-4);
  if (dec.length) out.push(`ULTIME DECISIONI DEL PIANO: ${dec.map(x => `${x.title}: ${x.reason}`).join(' | ')}`);
  return out.join('\n').slice(0, 16000);
}

/** Evidence cards most relevant to the question, for the model to ground its answer. */
export function evidenceFor(question: string) {
  return retrieve(question, 6).map(p => ({ title: p.title, year: p.year, finding: p.finding, coach_use: p.coach_use.replace(/^Inferenza:\s*/i, '') }));
}
