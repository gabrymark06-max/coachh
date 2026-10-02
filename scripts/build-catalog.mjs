// Builds public/catalog.json: the free-exercise-db library (Unlicense, github.com/yuhonas/free-exercise-db),
// translated once into Italian with Gemini, plus Tempra's own exercises. Resumable: translations are cached.
//   GEMINI_API_KEY=… node scripts/build-catalog.mjs
import fs from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';

const SRC = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';
const CACHE = path.resolve('scripts/.catalog-it.json');
const OUT = path.resolve('public/catalog.json');
const KEY = process.env.GEMINI_API_KEY;
const MODELS = ['gemini-3.5-flash', 'gemini-flash-latest', 'gemini-3.5-flash-lite'];
const sleep = ms => new Promise(r => setTimeout(r, ms));

const EQ = { barbell: 'bilanciere', dumbbell: 'manubri', cable: 'cavi', machine: 'macchina', 'body only': 'corpo libero', kettlebells: 'kettlebell', bands: 'elastici', 'medicine ball': 'palla medica', 'exercise ball': 'fitball', 'foam roll': 'foam roller', 'e-z curl bar': 'bilanciere EZ', other: 'altro' };
const MU = { quadriceps: 'quadricipiti', hamstrings: 'femorali', glutes: 'glutei', chest: 'petto', lats: 'dorsali', 'middle back': 'dorso', 'lower back': 'lombari', traps: 'trapezi', shoulders: 'spalle', biceps: 'bicipiti', forearms: 'avambracci', triceps: 'tricipiti', calves: 'polpacci', abdominals: 'addominali', adductors: 'adduttori', abductors: 'abduttori', neck: 'collo' };
// Coaching-engine muscle groups (weekly sets and warm-ups are counted on these).
const GROUP = { quadriceps: 'quads', hamstrings: 'hamstrings', glutes: 'glutes', chest: 'chest', lats: 'back', 'middle back': 'back', 'lower back': 'back', traps: 'back', shoulders: 'shoulders', biceps: 'biceps', forearms: 'biceps', triceps: 'triceps', calves: 'calves', abdominals: 'core', adductors: 'quads', abductors: 'glutes' };
const CAT = { strength: 'forza', stretching: 'stretching', plyometrics: 'pliometria', powerlifting: 'powerlifting', 'olympic weightlifting': 'pesistica', strongman: 'strongman', cardio: 'cardio' };

const PROMPT = `Traduci in italiano questi esercizi da palestra per un'app di allenamento italiana.
- "name": il nome che si usa davvero nelle palestre italiane. Esempi: "Barbell Bench Press - Medium Grip" → "Panca piana con bilanciere"; "Smith Machine Squat" → "Squat al multipower"; "Wide-Grip Lat Pulldown" → "Lat machine presa larga"; "Seated Cable Rows" → "Pulley basso"; "Dumbbell Bicep Curl" → "Curl con manubri". Tieni i termini inglesi che in Italia si usano così (leg press, hip thrust, face pull, pullover, crunch, plank, deadlift → stacco). Niente maiuscole inutili. Nomi diversi per esercizi diversi.
- "steps": le istruzioni riscritte in 2-5 passi brevi all'imperativo (tu), senza "ripeti per le ripetizioni raccomandate".
Rispondi con lo stesso "id" di ogni esercizio.`;

async function translate(batch) {
  const body = {
    contents: [{ role: 'user', parts: [{ text: PROMPT + '\n\n' + JSON.stringify(batch.map(x => ({ id: x.id, name: x.name, instructions: x.instructions }))) }] }],
    generationConfig: { temperature: 0.2, responseMimeType: 'application/json', responseSchema: { type: 'ARRAY', items: { type: 'OBJECT', properties: { id: { type: 'STRING' }, name: { type: 'STRING' }, steps: { type: 'ARRAY', items: { type: 'STRING' } } }, required: ['id', 'name', 'steps'] } } },
  };
  for (let attempt = 0; attempt < 12; attempt++) {
    const model = MODELS[attempt % MODELS.length];
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': KEY }, body: JSON.stringify(body) }).catch(() => null);
    if (res?.ok) {
      const d = await res.json();
      const text = (d.candidates?.[0]?.content?.parts ?? []).filter(p => !p.thought).map(p => p.text ?? '').join('');
      try { return JSON.parse(text); } catch { /* retry */ }
    }
    await sleep(2000 + attempt * 1500);
  }
  throw Error('translation failed for ' + batch[0].id);
}

/** Tempra's own exercises (Italian, with technique): bundled from the engine. */
async function own() {
  const out = path.resolve('scripts/.own.mjs');
  await build({ stdin: { contents: "export { families } from '../lib/engine/exercises';", resolveDir: path.resolve('scripts'), loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error' });
  const { families } = await import('file://' + out);
  fs.rmSync(out);
  const eqOf = n => /multipower/i.test(n) ? 'multipower' : /bilanciere ez/i.test(n) ? 'bilanciere EZ' : /bilanciere/i.test(n) ? 'bilanciere' : /manubri|manubrio/i.test(n) ? 'manubri' : /cavo|cavi|pulley|lat machine|croci ai/i.test(n) ? 'cavi' : /kettlebell/i.test(n) ? 'kettlebell' : /elastic/i.test(n) ? 'elastici' : /macchina|press|machine|leg |pendulum|hack|belt|pec deck|chest press/i.test(n) ? 'macchina' : 'corpo libero';
  const seen = new Set();
  return Object.values(families).flatMap(f => f.list.filter(e => !seen.has(e.name) && seen.add(e.name)).map(e => ({
    id: 't-' + e.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    n: e.name, eq: eqOf(e.name), mu: [], g: Object.entries(f.muscles).filter(([, w]) => w >= 1).map(([m]) => m), c: f.unit === 'seconds' ? 'forza' : 'forza', l: e.level,
    s: [e.setup, ...e.steps], unit: f.unit === 'seconds' ? 'seconds' : undefined, fam: f.key, src: 'tempra',
  })));
}

const raw = await (await fetch(SRC)).json();
const cache = fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, 'utf8')) : {};
const todo = raw.filter(x => !cache[x.id]);
console.log(`${raw.length} exercises, ${todo.length} to translate`);
if (todo.length && !KEY) throw Error('GEMINI_API_KEY missing');
const batches = []; for (let i = 0; i < todo.length; i += 25) batches.push(todo.slice(i, i + 25));
let done = 0;
for (let i = 0; i < batches.length; i += 3) {
  const results = await Promise.all(batches.slice(i, i + 3).map(translate));
  for (const list of results) for (const t of list) if (t?.id && t.name) cache[t.id] = { name: t.name.trim(), steps: t.steps.map(s => s.trim()).filter(Boolean) };
  fs.writeFileSync(CACHE, JSON.stringify(cache));
  done += results.reduce((a, l) => a + l.length, 0);
  console.log(`translated ${done}/${todo.length}`);
}

const level = { beginner: 1, intermediate: 2, expert: 3 };
const lib = raw.filter(x => cache[x.id]).map(x => ({
  id: x.id, n: cache[x.id].name.charAt(0).toUpperCase() + cache[x.id].name.slice(1), en: x.name,
  eq: /smith/i.test(x.name) ? 'multipower' : EQ[x.equipment] ?? 'corpo libero',
  mu: [...x.primaryMuscles, ...x.secondaryMuscles].map(m => MU[m]).filter(Boolean),
  g: [...new Set(x.primaryMuscles.map(m => GROUP[m]).filter(Boolean))],
  c: CAT[x.category] ?? 'forza', l: level[x.level] ?? 2, s: cache[x.id].steps, img: x.images,
  unit: /plank|hold|stretch|wall sit/i.test(x.name) || x.category === 'stretching' ? 'seconds' : undefined,
}));
// Same Italian name twice (different source exercises): keep them apart with the original name.
const count = {}; for (const e of lib) count[e.n.toLowerCase()] = (count[e.n.toLowerCase()] ?? 0) + 1;
for (const e of lib) if (count[e.n.toLowerCase()] > 1) e.n = `${e.n} (${e.en})`;
const mine = await own();
const names = new Set(mine.map(e => e.n.toLowerCase()));
const all = [...mine, ...lib.filter(e => !names.has(e.n.toLowerCase()))];
fs.writeFileSync(OUT, JSON.stringify(all));
console.log(`catalog: ${all.length} exercises (${mine.length} Tempra + ${all.length - mine.length} free-exercise-db) → ${OUT}`);
