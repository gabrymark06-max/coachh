'use client';
import { useState } from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown, Check, RotateCcw } from 'lucide-react';
import type { CatalogEntry, Exercise, Plan } from '../lib/types';
import { dayNames } from '../lib/types';
import type { Action } from '../lib/store';
import { toExercise } from '../lib/catalog';
import { ExercisePicker } from './exercise-picker';

type Day = { id?: string; title: string; day: number; exercises: Exercise[] };
const uid = () => Math.random().toString(36).slice(2, 10);

/** The person's own plan: days, exercises and sets. Starts from the current plan, so the coach's one can be edited too. */
export function PlanBuilder({ plan, custom, act, done }: { plan: Plan | null; custom: CatalogEntry[]; act: (a: Action) => boolean; done: () => void }) {
  // Edits the own plan when there is one (in use or kept aside), otherwise starts from the coach's plan.
  const [days, setDays] = useState<Day[]>(() => (plan?.sessions ?? []).filter(s => s.type === 'strength').map(s => ({ id: plan?.custom ? s.id : undefined, title: s.title, day: s.day, exercises: s.exercises.map(e => ({ ...e })) })));
  const [picking, setPicking] = useState<number | null>(null);
  const setDay = (i: number, patch: Partial<Day>) => setDays(d => d.map((x, j) => j === i ? { ...x, ...patch } : x));
  const setEx = (i: number, k: number, patch: Partial<Exercise>) => setDay(i, { exercises: days[i].exercises.map((e, j) => j === k ? { ...e, ...patch } : e) });
  const move = (i: number, k: number, by: number) => { const list = [...days[i].exercises]; const [x] = list.splice(k, 1); list.splice(k + by, 0, x); setDay(i, { exercises: list }); };
  const free = [0, 1, 2, 3, 4, 5, 6].filter(d => !days.some(x => x.day === d));
  const add = (e: CatalogEntry) => { if (picking === null) return; setDay(picking, { exercises: [...days[picking].exercises, toExercise(e, uid())] }); setPicking(null); };

  if (picking !== null) return <ExercisePicker custom={custom} pick={add}
    create={e => { const id = 'c-' + uid(); const ok = act({ type: 'customExercise', data: { ...e, id } }); if (ok) add({ ...e, id, mu: [], c: 'forza', l: 1, src: 'custom' }); return ok; }}
    remove={id => act({ type: 'customExerciseDelete', data: id })} />;

  return <div className="builder">
    <p className="note">Scegli tu giorni, esercizi e serie. Il coach non li cambia: ti suggerisce solo il carico di ogni esercizio in base alla volta prima e il riscaldamento.</p>
    {days.map((d, i) => <section className="bday" key={i}>
      <header>
        <input className="btitle" value={d.title} maxLength={40} aria-label="Nome della seduta" onChange={e => setDay(i, { title: e.target.value })} placeholder="Es. Petto e tricipiti" />
        <select value={d.day} aria-label="Giorno" onChange={e => setDay(i, { day: Number(e.target.value) })}>{[d.day, ...free].sort().map(x => <option key={x} value={x}>{dayNames[x]}</option>)}</select>
        <button type="button" className="iconbtn small" aria-label="Elimina la seduta" onClick={() => setDays(x => x.filter((_, j) => j !== i))}><Trash2 size={15} /></button>
      </header>
      {d.exercises.map((e, k) => <div className="bex" key={e.id}>
        <div className="bexhead"><b>{e.name}</b>
          <span>
            <button type="button" className="iconbtn small" aria-label="Su" disabled={k === 0} onClick={() => move(i, k, -1)}><ArrowUp size={14} /></button>
            <button type="button" className="iconbtn small" aria-label="Giù" disabled={k === d.exercises.length - 1} onClick={() => move(i, k, 1)}><ArrowDown size={14} /></button>
            <button type="button" className="iconbtn small" aria-label={`Togli ${e.name}`} onClick={() => setDay(i, { exercises: d.exercises.filter((_, j) => j !== k) })}><Trash2 size={14} /></button>
          </span></div>
        <div className="bexgrid">
          <label><span>Serie</span><input type="number" inputMode="numeric" min={1} max={10} value={e.sets} onChange={v => setEx(i, k, { sets: Number(v.target.value) })} /></label>
          <label><span>{e.unit === 'seconds' ? 'Secondi' : 'Ripetizioni'}</span><span className="range"><input type="number" inputMode="numeric" min={1} max={600} value={e.low} onChange={v => setEx(i, k, { low: Number(v.target.value) })} />–<input type="number" inputMode="numeric" min={1} max={600} value={e.high} onChange={v => setEx(i, k, { high: Number(v.target.value) })} /></span></label>
          {e.unit !== 'seconds' && <label><span>RIR</span><input type="number" inputMode="numeric" min={0} max={5} value={e.rir} onChange={v => setEx(i, k, { rir: Number(v.target.value) })} /></label>}
          <label><span>Rec. (s)</span><input type="number" inputMode="numeric" min={15} max={600} step={15} value={e.rest} onChange={v => setEx(i, k, { rest: Number(v.target.value) })} /></label>
        </div>
      </div>)}
      <button type="button" className="ghost addfood" onClick={() => setPicking(i)}><Plus size={16} /> Aggiungi esercizio</button>
    </section>)}
    {free.length > 0 && <button type="button" className="secondary" onClick={() => setDays(d => [...d, { title: `Seduta ${String.fromCharCode(65 + d.length)}`, day: free[0], exercises: [] }])}><Plus size={16} /> Aggiungi un giorno</button>}
    <div className="qtyactions">
      {days.length > 0 && <button type="button" className="ghost" onClick={() => { if (confirm('Ripartire da zero, senza sedute?')) setDays([]); }}><RotateCcw size={15} /> Da zero</button>}
      <button type="button" className="primary big" disabled={!days.length} onClick={() => { if (act({ type: 'customPlan', data: days })) done(); }}><Check size={18} /> Salva il mio piano</button>
    </div>
  </div>;
}
