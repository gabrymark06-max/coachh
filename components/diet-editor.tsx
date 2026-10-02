'use client';
import { useMemo, useState } from 'react';
import { Plus, Trash2, Check, RotateCcw, Search } from 'lucide-react';
import type { AppState, DietTargets, MyMeal } from '../lib/types';
import type { Action } from '../lib/store';
import type { NutritionPlan } from '../lib/planner';
import { searchGeneric, findGeneric, forGrams } from '../lib/foods';

type Kind = 'training' | 'rest';
const kcalOf = (m: { protein: number; carbs: number; fat: number }) => Math.round(m.protein * 4 + m.carbs * 4 + m.fat * 9);
const fmt = (x: number) => Math.round(x).toLocaleString('it-IT');

/** The person's own targets (kcal follow from the macros) and own sample day, built from the food table. */
export function DietEditor({ state, coach, act, done }: { state: AppState; coach: NutritionPlan | null; act: (a: Action) => boolean; done: () => void }) {
  const [view, setView] = useState<'targets' | 'day'>('targets');
  return <div className="dieteditor">
    <div className="segmented full"><button type="button" aria-pressed={view === 'targets'} onClick={() => setView('targets')}>Calorie e macro</button><button type="button" aria-pressed={view === 'day'} onClick={() => setView('day')}>Giornata tipo</button></div>
    {view === 'targets' ? <Targets state={state} coach={coach} act={act} done={done} /> : <MyDay state={state} coach={coach} act={act} done={done} />}
  </div>;
}

function Targets({ state, coach, act, done }: { state: AppState; coach: NutritionPlan | null; act: (a: Action) => boolean; done: () => void }) {
  const base = (k: Kind) => state.diet?.[k] ?? coach?.[k] ?? { kcal: 2200, protein: 150, carbs: 250, fat: 70 };
  const [t, setT] = useState<DietTargets>({ training: { ...base('training') }, rest: { ...base('rest') } });
  const set = (k: Kind, f: 'protein' | 'carbs' | 'fat', v: string) => setT(x => { const m = { ...x[k], [f]: Number(v) || 0 }; return { ...x, [k]: { ...m, kcal: kcalOf(m) } }; });
  return <form onSubmit={e => { e.preventDefault(); if (act({ type: 'diet', data: t })) done(); }}>
    {(['training', 'rest'] as const).map(k => <section className="targetbox" key={k}>
      <h3>{k === 'training' ? 'Giorni di allenamento' : 'Giorni di riposo'} <span className="num">{fmt(kcalOf(t[k]))} kcal</span></h3>
      <div className="formgrid three">
        {([['protein', 'Proteine'], ['carbs', 'Carboidrati'], ['fat', 'Grassi']] as const).map(([f, l]) => <label className="field" key={f}><span>{l} (g)</span><input type="number" inputMode="numeric" min={0} max={f === 'carbs' ? 1200 : 500} value={t[k][f]} onChange={e => set(k, f, e.target.value)} /></label>)}
      </div>
    </section>)}
    {coach?.training && <p className="note">Proposta del coach: {fmt(coach.training.kcal)} kcal in allenamento, {fmt(coach.rest!.kcal)} a riposo, {coach.training.protein} g di proteine.</p>}
    <div className="qtyactions">
      {state.diet && <button type="button" className="ghost" onClick={() => { if (act({ type: 'diet', data: null })) done(); }}><RotateCcw size={15} /> Usa quelli del coach</button>}
      <button className="primary big"><Check size={18} /> Salva</button>
    </div>
  </form>;
}

/** Coach meals use short food names: map them onto the food table to start from the coach's day. */
const fromCoach = (meals: { name: string; items: { food: string; grams: number }[] }[]): MyMeal[] => meals.map(m => ({
  name: m.name,
  items: m.items.map(i => { const name = i.food.replace('(peso crudo)', '(cruda)').replace('(peso crudo)', '(crudo)'); const f = findGeneric(name) ?? findGeneric(name.replace('(cruda)', '(crudo)')) ?? searchGeneric(i.food.replace(/\(.*\)/, ''), 1)[0]; return f ? { food: f.name, grams: i.grams } : null; }).filter((x): x is { food: string; grams: number } => !!x),
}));
const SLOTS = ['Colazione', 'Pranzo', 'Spuntino', 'Cena'];

function MyDay({ state, coach, act, done }: { state: AppState; coach: NutritionPlan | null; act: (a: Action) => boolean; done: () => void }) {
  const [kind, setKind] = useState<Kind>('training');
  const [day, setDay] = useState<Record<Kind, MyMeal[]>>(() => state.myDay ?? {
    training: coach?.meals ? fromCoach(coach.meals.training) : SLOTS.map(name => ({ name, items: [] })),
    rest: coach?.meals ? fromCoach(coach.meals.rest) : SLOTS.map(name => ({ name, items: [] })),
  });
  const [adding, setAdding] = useState<number | null>(null);
  const [q, setQ] = useState('');
  const meals = day[kind];
  const setMeals = (list: MyMeal[]) => setDay(d => ({ ...d, [kind]: list }));
  const totals = useMemo(() => meals.flatMap(m => m.items).reduce((a, i) => { const f = findGeneric(i.food); if (!f) return a; const x = forGrams(f, i.grams); return { kcal: a.kcal + x.kcal, p: a.p + x.p, c: a.c + x.c, f: a.f + x.f }; }, { kcal: 0, p: 0, c: 0, f: 0 }), [meals]);
  const target = (state.diet ?? coach)?.[kind];
  const found = q.trim().length >= 2 ? searchGeneric(q, 6) : [];
  return <>
    <div className="segmented full"><button type="button" aria-pressed={kind === 'training'} onClick={() => setKind('training')}>Allenamento</button><button type="button" aria-pressed={kind === 'rest'} onClick={() => setKind('rest')}>Riposo</button></div>
    <p className="daytotal num"><b>{fmt(totals.kcal)}</b>{target ? ` / ${fmt(target.kcal)}` : ''} kcal · P {fmt(totals.p)}{target ? `/${target.protein}` : ''} · C {fmt(totals.c)} · G {fmt(totals.f)}</p>
    {meals.map((m, i) => <section className="mymeal" key={i}>
      <header><input value={m.name} maxLength={40} aria-label="Nome del pasto" onChange={e => setMeals(meals.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
        <button type="button" className="iconbtn small" aria-label="Elimina il pasto" onClick={() => setMeals(meals.filter((_, j) => j !== i))}><Trash2 size={14} /></button></header>
      {m.items.map((it, k) => <div className="myitem" key={k}>
        <span className="grow">{it.food}<small className="num">{fmt(forGrams(findGeneric(it.food)!, it.grams).kcal)} kcal</small></span>
        <label className="gramsin"><input type="number" inputMode="numeric" min={1} max={2000} value={it.grams} onChange={e => setMeals(meals.map((x, j) => j === i ? { ...x, items: x.items.map((y, h) => h === k ? { ...y, grams: Number(e.target.value) || 0 } : y) } : x))} /><span>g</span></label>
        <button type="button" className="iconbtn small" aria-label={`Togli ${it.food}`} onClick={() => setMeals(meals.map((x, j) => j === i ? { ...x, items: x.items.filter((_, h) => h !== k) } : x))}><Trash2 size={14} /></button>
      </div>)}
      {adding === i ? <div className="myadd">
        <label className="authfield search"><Search size={16} /><input autoFocus placeholder="Cerca un alimento" value={q} onChange={e => setQ(e.target.value)} /></label>
        {found.map(f => <button type="button" className="foodopt" key={f.name} onClick={() => { setMeals(meals.map((x, j) => j === i ? { ...x, items: [...x.items, { food: f.name, grams: f.serving ?? 100 }] } : x)); setQ(''); setAdding(null); }}><span className="grow"><b>{f.name}</b><small>{f.kcal} kcal /100 g</small></span><Plus size={16} /></button>)}
      </div> : <button type="button" className="ghost addfood" onClick={() => { setAdding(i); setQ(''); }}><Plus size={15} /> Alimento</button>}
    </section>)}
    <button type="button" className="secondary" onClick={() => setMeals([...meals, { name: 'Pasto', items: [] }])}><Plus size={16} /> Aggiungi un pasto</button>
    <div className="qtyactions">
      {state.myDay && <button type="button" className="ghost" onClick={() => { if (act({ type: 'myDay', data: null })) done(); }}><RotateCcw size={15} /> Usa quella del coach</button>}
      <button type="button" className="primary big" onClick={() => { if (act({ type: 'myDay', data: day })) done(); }}><Check size={18} /> Salva la giornata</button>
    </div>
  </>;
}
