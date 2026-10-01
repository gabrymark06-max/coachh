import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const out = path.resolve('.test-build');
await build({ entryPoints: { engine: 'tests/entry.ts' }, bundle: true, format: 'esm', platform: 'node', outdir: out, outExtension: { '.js': '.mjs' }, logLevel: 'error' });
const E = await import(pathToFileURL(path.join(out, 'engine.mjs')).href + '?' + Date.now());
const { generatePlan, nutrition, progressAfterLog, nextWeek, alternatives, answer, apply, resolveGoal, activityFrom, bodyFat, split } = E;
const evidence = new Set(JSON.parse(fs.readFileSync('lib/evidence.json', 'utf8')).map(p => p.id));

const base = { name: 'Test', age: 28, sex: 'male', weight: 80, height: 178, waist: 88, goal: 'recomp', strengthLevel: 'intermediate', runningLevel: 'new', days: [0, 2, 4], minutes: 60, equipment: 'gym', recentRunMinutes: 0, recentLongest: 0, activity: 'low', diet: 'omnivore', restrictions: '', clinical: false, pain: false, nutritionConsent: true, steps: 5500, cardio: [], mealsPerDay: 4, trainingTime: 'evening', allergens: [] };
const sources = new Set();
function checkPlan(plan, p, label) {
  assert.equal(plan.sessions.length, p.days.length, label + ': one session per day');
  assert.deepEqual(plan.sessions.map(x => x.day), [...p.days].sort((a, b) => a - b), label + ': days');
  const longCap = Math.max(p.minutes, Math.min(180, p.longRunMinutes ?? 0));
  for (const s of plan.sessions) {
    assert(s.duration > 0, label + ': duration');
    assert(s.duration <= (s.kind === 'long' ? longCap : p.minutes), `${label}: time ${s.title} ${s.duration}>${p.minutes}`);
    assert.equal(s.duration, s.type === 'run' ? s.phases.reduce((t, x) => t + x.minutes, 0) : s.duration, label + ': cardio phases add up');
    if (s.type === 'strength') assert(s.exercises.length >= 2, label + ': exercises');
    for (const id of s.sources) { assert(evidence.has(id), `${label}: unknown source ${id}`); sources.add(id); }
  }
  for (const r of plan.blueprint.pillars) for (const id of r.sources) { assert(evidence.has(id), `${label}: pillar source ${id}`); sources.add(id); }
  assert(plan.blueprint.habits.length === 4 && plan.blueprint.cardioPlan, label + ': habits and cardio plan');
}

// 1. Persona matrix.
let count = 0;
const goals = ['fat-loss', 'recomp', 'muscle', 'strength', 'health'];
const dayOptions = [[0, 3], [0, 2, 4], [0, 1, 3, 5], [0, 1, 2, 4, 5], [0, 1, 2, 3, 4, 5], [0, 1, 2, 3, 4, 5, 6]];
const cardioOptions = [[], ['walk'], ['bike', 'swim'], ['run']];
for (const goal of goals) for (const strengthLevel of ['new', 'intermediate', 'experienced']) for (const equipment of ['gym', 'dumbbells', 'bodyweight']) for (const days of dayOptions) for (const minutes of [30, 45, 60, 90]) for (const cardio of cardioOptions) {
  const runner = cardio.includes('run') && strengthLevel !== 'new' ? { runningLevel: 'regular', recentRunMinutes: 90, recentLongest: 40 } : {};
  const p = { ...base, goal, strengthLevel, equipment, days, minutes, cardio, ...runner };
  const plan = generatePlan(p);
  checkPlan(plan, p, JSON.stringify({ goal, strengthLevel, equipment, days: days.length, minutes, cardio }));
  if (runner.recentRunMinutes) assert(plan.sessions.filter(x => x.modality === 'run').reduce((t, x) => t + x.runMinutes, 0) <= runner.recentRunMinutes, 'Running starts within the recent dose');
  count++;
}
for (let mask = 0; mask < 128; mask++) {
  const days = Array.from({ length: 7 }, (_, i) => i).filter(i => mask & (1 << i));
  if (days.length < 2) continue;
  for (const minutes of [30, 45, 75]) { const p = { ...base, days, minutes, cardio: ['walk'] }; checkPlan(generatePlan(p), p, 'mask ' + mask); count++; }
}
console.log(`Engine: ${count} profiles generated within time and days.`);

// 2. Gym first, cardio decided by the coach.
assert.deepEqual(split({ ...base, days: [0, 2, 4] }), { sc: 3, rc: 0 }, '3 days: all gym');
assert.deepEqual(split({ ...base, goal: 'fat-loss', days: [0, 1, 2, 3, 4, 5] }), { sc: 4, rc: 2 }, 'Fat loss with 6 days: 4 gym + 2 cardio');
assert.equal(split({ ...base, goal: 'muscle', strengthLevel: 'new', days: [0, 1, 2, 3, 4, 5] }).sc, 4, 'Beginners: at most 4 gym days');
const fl = generatePlan({ ...base, goal: 'fat-loss', days: [0, 1, 2, 3, 4, 5], cardio: ['bike'] });
assert(fl.sessions.some(x => x.modality === 'bike'), 'Cardio uses the preferred modality');
const finisher = generatePlan({ ...base, goal: 'fat-loss', days: [0, 2, 4], minutes: 75 });
assert(finisher.sessions.some(x => x.phases.some(ph => ph.label.startsWith('Cardio a fine seduta'))), 'No free days: cardio after lifting');
const bulk = generatePlan({ ...base, goal: 'muscle', waist: 78, days: [0, 2, 4] });
assert(bulk.progress.cardioMinutes < fl.progress.cardioMinutes, 'Less cardio when gaining muscle than when losing fat');
assert(fl.progress.steps > base.steps, 'Step target above current steps');
console.log('Gym first: split, cardio modality, finishers, dose by goal and steps passed.');

// 3. Body fat and auto goal.
assert.equal(bodyFat({ ...base, height: 180, waist: 90 }), 24);
assert.equal(resolveGoal({ ...base, goalAuto: true, waist: 105 }).goal, 'fat-loss');
assert.equal(resolveGoal({ ...base, goalAuto: true, waist: 88 }).goal, 'recomp');
assert.equal(resolveGoal({ ...base, goalAuto: true, waist: 74 }).goal, 'muscle');
assert.equal(resolveGoal({ ...base, goal: 'balanced' }).goal, 'recomp', 'Legacy goal mapped');
console.log('Body composition: RFM estimate and "advise me" goal passed.');

// 4. Safety.
assert.equal(generatePlan({ ...base, pain: true }).blocked, true);
assert.equal(generatePlan({ ...base, pain: true, painCleared: true, painAreas: ['knee'] }).blocked, false);
assert.equal(generatePlan({ ...base, screening: ['chest'] }).blocked, true);
assert.equal(generatePlan({ ...base, clinical: true, medicalClearance: true }).blocked, false);
const mod = generatePlan({ ...base, screening: ['heart'], goal: 'health', days: [0, 1, 2, 3, 4, 5], cardio: ['bike'] });
assert(!mod.sessions.some(x => x.kind === 'intervals' || x.kind === 'hills'), 'Moderate only: no intervals');
const shoulder = generatePlan({ ...base, pain: true, painCleared: true, painAreas: ['shoulder'], days: [0, 1, 3, 4] });
assert(!shoulder.sessions.some(s => s.exercises.some(e => e.family === 'vpush')), 'Shoulder: no overhead pressing');
console.log('Safety gates passed.');

// 5. Progression over weeks.
const state = { profile: base, plan: generatePlan({ ...base, days: [0, 1, 3, 4, 5] }), logs: [], checkins: [], decisions: [], messages: [], revision: 0 };
state.profile = { ...base, days: [0, 1, 3, 4, 5] };
const hist = [];
for (let w = 0; w < 6; w++) {
  const plan = state.plan;
  hist.push({ deload: plan.blueprint.meso.deload, sets: plan.sessions.reduce((t, s) => t + s.exercises.reduce((a, e) => a + e.sets, 0), 0), steps: plan.progress.steps, week: plan.blueprint.meso.week });
  for (const s of plan.sessions) state.logs.push({ id: 'x', sessionId: s.id, title: s.title, type: s.type, week: plan.week, completed: true, pain: false, rpe: s.type === 'run' ? 4 : 6, plannedRpe: s.targetRpe, duration: s.duration, results: [], note: '', date: new Date().toISOString(), distance: null });
  nextWeek(state);
  checkPlan(state.plan, state.profile, 'week ' + state.plan.week);
}
assert(hist[3].sets > hist[0].sets, 'Volume grows');
assert.equal(hist[4].deload, true, 'Deload in week 5');
assert(hist[4].sets < hist[3].sets, 'Deload reduces volume');
assert.equal(hist[5].week, 1, 'New block');
assert(hist[3].steps > hist[0].steps, 'Steps progress');
console.log('Progression: volume, deload, new block and steps passed.');

// 6. Session feedback.
const p6 = { ...base }, plan6 = generatePlan(p6), sess = plan6.sessions.find(x => x.type === 'strength'), ex = sess.exercises.find(e => e.increment > 0);
const st6 = { profile: p6, plan: plan6, logs: [], checkins: [], decisions: [], messages: [], revision: 0 };
const log = { sessionId: sess.id, results: Array.from({ length: ex.sets }, (_, i) => ({ exerciseId: ex.id, set: i + 1, weight: 30, reps: ex.high, rir: ex.rir })), pain: false, rpe: 6, duration: 40 };
assert(progressAfterLog(st6, log).some(d => d.rule === 'double-progression'));
assert(alternatives(p6, ex).length >= 1);
console.log('Feedback: double progression passed.');

// 7. Nutrition.
const act = (p, plan) => activityFrom(p, plan ?? generatePlan(p));
const nCut = nutrition({ ...base, goal: 'fat-loss', waist: 100 }, act({ ...base, goal: 'fat-loss', waist: 100 }));
const nGain = nutrition({ ...base, goal: 'muscle', waist: 78, weight: 70 }, act({ ...base, goal: 'muscle', waist: 78, weight: 70 }));
const nRec = nutrition({ ...base, goal: 'muscle', waist: 100 }, act({ ...base, goal: 'muscle', waist: 100 }));
assert.equal(nCut.phase, 'cut'); assert(nCut.average.kcal < nCut.tdee, 'Deficit');
assert.equal(nGain.phase, 'gain'); assert(nGain.average.kcal > nGain.tdee, 'Surplus');
assert.equal(nRec.phase, 'recomp', 'Muscle goal with high body fat: recomposition first');
assert(nCut.training.kcal >= nCut.rest.kcal, 'More food on training days');
assert(nCut.protein[1] / 80 >= 2.2, 'High protein in a deficit');
assert.equal(nutrition({ ...base, nutritionConsent: false }).blocked, true);
assert.equal(nutrition({ ...base, goal: 'fat-loss', weight: 52, height: 172, waist: 64 }).blocked, true, 'No deficit below BMI 18.5');
for (const variant of [{}, { diet: 'vegetarian' }, { diet: 'vegan' }, { allergens: ['lactose', 'gluten'] }, { mealsPerDay: 3 }, { mealsPerDay: 5, trainingTime: 'morning' }, { dislikes: 'pollo, tonno' }, { goal: 'muscle', waist: 78 }, { goal: 'fat-loss', sex: 'female', weight: 68, height: 165, waist: 86 }]) {
  const p = { ...base, ...variant };
  const n = nutrition(p, act(p));
  for (const [day, target] of [[n.meals.training, n.training], [n.meals.rest, n.rest]]) {
    const t = day.reduce((a, m) => ({ k: a.k + m.kcal, p: a.p + m.p }), { k: 0, p: 0 });
    assert(Math.abs(t.k - target.kcal) / target.kcal < 0.15, `Sample day kcal ${t.k} vs ${target.kcal} for ${JSON.stringify(variant)}`);
    assert(t.p >= target.protein * 0.85 && t.p <= target.protein * 1.25, `Sample day protein ${t.p} vs ${target.protein} for ${JSON.stringify(variant)}`);
    const foods = day.flatMap(m => m.items.map(i => i.food)).join(' | ');
    if (p.diet === 'vegan') assert(!/pollo|tacchino|manzo|merluzzo|salmone|tonno|uova|albume|yogurt greco|skyr|latte|mozzarella|siero|bresaola/.test(foods), 'Vegan: ' + foods);
    if (p.diet === 'vegetarian') assert(!/pollo|tacchino|manzo|merluzzo|salmone|tonno|bresaola/.test(foods), 'Vegetarian: ' + foods);
    if (p.allergens?.includes('lactose')) assert(!/yogurt greco|skyr|fiocchi di latte|mozzarella|siero/.test(foods), 'Lactose: ' + foods);
    if (p.allergens?.includes('gluten')) assert(!/pasta|pane|farro|avena|seitan/.test(foods), 'Gluten: ' + foods);
    if (p.dislikes) assert(!/pollo|tonno/.test(foods), 'Dislikes: ' + foods);
  }
  for (const t of n.tips) for (const id of t.sources) { assert(evidence.has(id)); sources.add(id); }
}
console.log('Nutrition: phases, deficit/surplus, carb cycling, sample days on target, diets and allergens passed.');

// 8. Client store (no server).
let s = { profile: null, plan: null, logs: [], checkins: [], decisions: [], messages: [], revision: 0 };
s = apply(s, { type: 'profile', data: { ...base, goalAuto: true, waist: 104 } });
assert.equal(s.profile.goal, 'fat-loss'); assert(s.plan.sessions.length === 3);
const gym = s.plan.sessions.find(x => x.type === 'strength');
assert.throws(() => apply(s, { type: 'log', data: { sessionId: gym.id, duration: 40, rpe: 6, pain: false, distance: null, note: '', completed: true, results: [] } }), /Spunta/);
s = apply(s, { type: 'log', data: { sessionId: gym.id, duration: 40, rpe: 6, pain: false, distance: null, note: '', completed: true, results: gym.exercises.flatMap(e => Array.from({ length: e.sets }, (_, i) => ({ exerciseId: e.id, set: i + 1, weight: e.increment ? 20 : null, reps: e.high, rir: e.rir }))) } });
assert(s.logs.at(-1).feedback.some(x => x.rule === 'session-review'));
s = apply(s, { type: 'checkin', data: { sleep: 7, fatigue: 2, soreness: 2, pain: false, note: '', weight: 80 } });
s = apply(s, { type: 'week' }); assert.equal(s.plan.week, 2);
s = apply(s, { type: 'chat', data: 'Devo fare cardio?' }); assert(s.messages.at(-1).text.includes('passi'));
assert.throws(() => apply(s, { type: 'profile', data: { ...base, name: '' } }), /nome/);
s = apply(s, { type: 'reset' }); assert.equal(s.profile, null);
console.log('Store: profile, validation, logging, check-in, week, chat and reset passed.');

// 9. Coach answers.
const cs = { profile: base, plan: generatePlan(base), logs: [], checkins: [], decisions: [], messages: [], revision: 0 };
for (const q of ['Cosa faccio oggi?', 'Perché questa fase della dieta?', 'Quante proteine?', 'Devo fare cardio?', 'Lo stretching serve?']) assert(answer(q, cs).text.length > 40, q);
assert(sources.size >= 90, 'Broad evidence use: ' + sources.size);
console.log(`Coach answers passed. ${sources.size} distinct studies behind the generated plans.`);
fs.rmSync(out, { recursive: true, force: true });
