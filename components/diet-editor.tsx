'use client';
import { useMemo, useState } from 'react';
import { Plus, Minus, Trash2, Check, RotateCcw, Search, Copy, X } from 'lucide-react';
import type { AppState, DietTargets, MyMeal } from '../lib/types';
import type { Action } from '../lib/store';
import type { NutritionPlan } from '../lib/planner';
import { searchGeneric, findGeneric, forGrams } from '../lib/foods';

type Kind = 'training' | 'rest';
type Macros = { protein: number; carbs: number; fat: number };
const kcalOf = (m: Macros) => Math.round(m.protein * 4 + m.carbs * 4 + m.fat * 9);
const fmt = (x: number) => Math.round(x).toLocaleString('it-IT');
const MACROS = [['protein', 'Proteine', 4], ['carbs', 'Carboidrati', 4], ['fat', 'Grassi', 9]] as const;

function KindSwitch({ kind, set }: { kind: Kind; set: (k: Kind) => void }) {
  return <div className="segmented full"><button type="button" aria-pressed={kind === 'training'} onClick={() => set('training')}>Giorni di allenamento</button><button type="button" aria-pressed={kind === 'rest'} onClick={() => set('rest')}>Giorni di riposo</button></div>;
}

/** The person's own targets (kcal follow from the macros) and own sample day, built from the food table. */
export function DietEditor({ state, coach, act, done }: { state: AppState; coach: NutritionPlan | null; act: (a: Action) => boolean; done: () => void }) {
  const [view, setView] = useState<'targets' | 'day'>('targets');
  const [kind, setKind] = useState<Kind>('training');
  return <div className="dieteditor">
    <div className="dtabs" role="tablist">
      <button type="button" role="tab" aria-selected={view === 'targets'} onClick={() => setView('targets')}>Calorie e macro{state.diet && <i>tuoi</i>}</button>
      <button type="button" role="tab" aria-selected={view === 'day'} onClick={() => setView('day')}>Giornata tipo{state.myDay && <i>tua</i>}</button>
    </div>
    <KindSwitch kind={kind} set={setKind} />
    {view === 'targets' ? <Targets state={state} coach={coach} kind={kind} act={act} done={done} /> : <MyDay state={state} coach={coach} kind={kind} act={act} done={done} />}
  </div>;
}

function Targets({ state, coach, kind, act, done }: { state: AppState; coach: NutritionPlan | null; kind: Kind; act: (a: Action) => boolean; done: () => void }) {
  const base = (k: Kind) => state.diet?.[k] ?? coach?.[k] ?? { kcal: 2200, protein: 150, carbs: 250, fat: 70 };
  const [t, setT] = useState<DietTargets>({ training: { ...base('training') }, rest: { ...base('rest') } });
  const m = t[kind];
  const kcal = kcalOf(m);
  const set = (f: keyof Macros, v: number) => setT(x => { const n = { ...x[kind], [f]: Math.max(0, Math.min(f === 'carbs' ? 1200 : 500, Math.round(v) || 0)) }; return { ...x, [kind]: { ...n, kcal: kcalOf(n) } }; });
  const other: Kind = kind === 'training' ? 'rest' : 'training';
  const ref = coach?.[kind];
  return <form onSubmit={e => { e.preventDefault(); if (act({ type: 'diet', data: t })) done(); }}>
    <div className="kcalhero">
      <b className="num">{fmt(kcal)}</b><span>kcal al giorno</span>
      {ref && <small>Proposta del coach: <span className="num">{fmt(ref.kcal)}</span></small>}
      <div className="macrobar" aria-hidden>{MACROS.map(([f, , k]) => <span key={f} className={f} style={{ width: `${kcal ? (m[f] * k / kcal) * 100 : 0}%` }} />)}</div>
    </div>
    <div className="macrolist">
      {MACROS.map(([f, label, k]) => <div className={'macroline ' + f} key={f}>
        <span className="dot" />
        <span className="grow"><b>{label}</b><small className="num">{kcal ? Math.round(m[f] * k / kcal * 100) : 0}% · {fmt(m[f] * k)} kcal</small></span>
        <div className="gstep">
          <button type="button" aria-label={`${label} meno 5 g`} onClick={() => set(f, m[f] - 5)}><Minus size={15} /></button>
          <label><input type="number" inputMode="numeric" min={0} value={m[f]} aria-label={`${label} in grammi`} onChange={e => set(f, Number(e.target.value))} /><span>g</span></label>
          <button type="button" aria-label={`${label} più 5 g`} onClick={() => set(f, m[f] + 5)}><Plus size={15} /></button>
        </div>
      </div>)}
    </div>
    <button type="button" className="ghost copyday" onClick={() => setT(x => ({ ...x, [other]: { ...x[kind] } }))}><Copy size={15} /> Usa gli stessi valori nei giorni di {other === 'rest' ? 'riposo' : 'allenamento'}</button>
    <div className="savebar">
      {state.diet && <button type="button" className="ghost" onClick={() => { if (act({ type: 'diet', data: null })) done(); }}><RotateCcw size={15} /> Torna al coach</button>}
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
const sum = (items: { food: string; grams: number }[]) => items.reduce((a, i) => { const f = findGeneric(i.food); if (!f) return a; const x = forGrams(f, i.grams); return { kcal: a.kcal + x.kcal, p: a.p + x.p, c: a.c + x.c, f: a.f + x.f }; }, { kcal: 0, p: 0, c: 0, f: 0 });

function Bar({ label, value, target, unit = 'g' }: { label: string; value: number; target?: number; unit?: string }) {
  const pct = target ? Math.min(100, (value / target) * 100) : 0;
  const off = target ? Math.abs(value - target) / target > 0.1 : false;
  return <div className={'tbar' + (off ? ' off' : '')}>
    <span>{label}</span><b className="num">{fmt(value)}{target ? <i>/{fmt(target)}</i> : null} {unit}</b>
    <span className="track"><span style={{ width: `${pct}%` }} /></span>
  </div>;
}

function MyDay({ state, coach, kind, act, done }: { state: AppState; coach: NutritionPlan | null; kind: Kind; act: (a: Action) => boolean; done: () => void }) {
  const [day, setDay] = useState<Record<Kind, MyMeal[]>>(() => state.myDay ?? {
    training: coach?.meals ? fromCoach(coach.meals.training) : SLOTS.map(name => ({ name, items: [] })),
    rest: coach?.meals ? fromCoach(coach.meals.rest) : SLOTS.map(name => ({ name, items: [] })),
  });
  const [adding, setAdding] = useState<number | null>(null);
  const [q, setQ] = useState('');
  const meals = day[kind];
  const setMeals = (list: MyMeal[]) => setDay(d => ({ ...d, [kind]: list }));
  const setItems = (i: number, items: MyMeal['items']) => setMeals(meals.map((x, j) => j === i ? { ...x, items } : x));
  const totals = useMemo(() => sum(meals.flatMap(m => m.items)), [meals]);
  const target = (state.diet ?? coach)?.[kind];
  const found = q.trim().length >= 2 ? searchGeneric(q, 6) : [];
  return <>
    <div className="daytargets">
      <Bar label="Calorie" value={totals.kcal} target={target?.kcal} unit="kcal" />
      <div className="tbars3">
        <Bar label="Proteine" value={totals.p} target={target?.protein} />
        <Bar label="Carboidrati" value={totals.c} target={target?.carbs} />
        <Bar label="Grassi" value={totals.f} target={target?.fat} />
      </div>
    </div>
    {meals.map((m, i) => { const t = sum(m.items); return <section className="mymeal" key={i}>
      <header>
        <input value={m.name} maxLength={40} aria-label="Nome del pasto" onChange={e => setMeals(meals.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
        <small className="num">{fmt(t.kcal)} kcal</small>
        <button type="button" className="iconbtn small" aria-label="Elimina il pasto" onClick={() => { if (!m.items.length || confirm(`Eliminare ${m.name}?`)) setMeals(meals.filter((_, j) => j !== i)); }}><Trash2 size={14} /></button>
      </header>
      {m.items.map((it, k) => { const f = findGeneric(it.food); const step = it.grams >= 100 ? 10 : 5; return <div className="myitem" key={k}>
        <span className="grow"><b>{it.food}</b><small className="num">{f ? `${fmt(forGrams(f, it.grams).kcal)} kcal · P ${fmt(forGrams(f, it.grams).p)} g` : ''}</small></span>
        <div className="gstep small">
          <button type="button" aria-label="Meno" onClick={() => it.grams - step <= 0 ? setItems(i, m.items.filter((_, h) => h !== k)) : setItems(i, m.items.map((y, h) => h === k ? { ...y, grams: y.grams - step } : y))}>{it.grams - step <= 0 ? <X size={14} /> : <Minus size={14} />}</button>
          <label><input type="number" inputMode="numeric" min={1} max={2000} value={it.grams} aria-label={`Grammi di ${it.food}`} onChange={e => setItems(i, m.items.map((y, h) => h === k ? { ...y, grams: Math.max(0, Math.min(2000, Number(e.target.value) || 0)) } : y))} /><span>g</span></label>
          <button type="button" aria-label="Più" onClick={() => setItems(i, m.items.map((y, h) => h === k ? { ...y, grams: Math.min(2000, y.grams + step) } : y))}><Plus size={14} /></button>
        </div>
      </div>; })}
      {adding === i ? <div className="myadd">
        <div className="myaddsearch"><label className="authfield search"><Search size={16} /><input autoFocus placeholder="Cerca un alimento" value={q} onChange={e => setQ(e.target.value)} /></label>
          <button type="button" className="iconbtn small" aria-label="Chiudi la ricerca" onClick={() => setAdding(null)}><X size={15} /></button></div>
        {found.map(f => <button type="button" className="foodopt" key={f.name} onClick={() => { setItems(i, [...m.items, { food: f.name, grams: f.serving ?? 100 }]); setQ(''); setAdding(null); }}><span className="grow"><b>{f.name}</b><small>{f.kcal} kcal /100 g · {f.serving ?? 100} g</small></span><Plus size={16} /></button>)}
      </div> : <button type="button" className="ghost addfood" onClick={() => { setAdding(i); setQ(''); }}><Plus size={15} /> Aggiungi alimento</button>}
    </section>; })}
    <button type="button" className="dashed" onClick={() => setMeals([...meals, { name: 'Pasto', items: [] }])}><Plus size={17} /> Aggiungi un pasto</button>
    <div className="savebar">
      {state.myDay && <button type="button" className="ghost" onClick={() => { if (act({ type: 'myDay', data: null })) done(); }}><RotateCcw size={15} /> Torna al coach</button>}
      <button type="button" className="primary big" onClick={() => { if (act({ type: 'myDay', data: day })) done(); }}><Check size={18} /> Salva la giornata</button>
    </div>
  </>;
}
