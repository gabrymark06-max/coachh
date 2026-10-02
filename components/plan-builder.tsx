'use client';
import { useState } from 'react';
import { Plus, Minus, Trash2, ArrowUp, ArrowDown, Check, RotateCcw, ChevronDown, Pencil } from 'lucide-react';
import type { CatalogEntry, Exercise, Plan, Session } from '../lib/types';
import { dayNames } from '../lib/types';
import type { Action } from '../lib/store';
import { sessionTime } from '../lib/planner';
import { toExercise } from '../lib/catalog';
import { ExercisePicker } from './exercise-picker';

type Day = { id?: string; title: string; day: number; exercises: Exercise[] };
const uid = () => Math.random().toString(36).slice(2, 10);
const short = (d: number) => dayNames[d].slice(0, 3);
const restLabel = (s: number) => s < 60 ? `${s}″` : `${Math.floor(s / 60)}′${s % 60 ? String(s % 60).padStart(2, '0') : ''}`;
const minutes = (d: Day) => d.exercises.length ? sessionTime({ type: 'strength', exercises: d.exercises, phases: [{ label: '', minutes: 8, effort: '' }, { label: '', minutes: 3, effort: '' }] } as unknown as Session) : 0;

/** A number with − and + around it: easier than typing on a phone. */
function Stepper({ label, value, set, min, max, step = 1, show }: { label: string; value: number; set: (v: number) => void; min: number; max: number; step?: number; show?: (v: number) => string }) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  return <div className="stepper">
    <span>{label}</span>
    <div>
      <button type="button" aria-label={`${label} meno`} disabled={value <= min} onClick={() => set(clamp(value - step))}><Minus size={15} /></button>
      <b className="num">{show ? show(value) : value}</b>
      <button type="button" aria-label={`${label} più`} disabled={value >= max} onClick={() => set(clamp(value + step))}><Plus size={15} /></button>
    </div>
  </div>;
}

/** The person's own plan: days, exercises and sets. Starts from the current plan, so the coach's one can be edited too. */
export function PlanBuilder({ plan, custom, act, done }: { plan: Plan | null; custom: CatalogEntry[]; act: (a: Action) => boolean; done: () => void }) {
  // Edits the own plan when there is one (in use or kept aside), otherwise starts from the coach's plan.
  const [days, setDays] = useState<Day[]>(() => (plan?.sessions ?? []).filter(s => s.type === 'strength').map(s => ({ id: plan?.custom ? s.id : undefined, title: s.title, day: s.day, exercises: s.exercises.map(e => ({ ...e })) })).sort((a, b) => a.day - b.day));
  const [open, setOpen] = useState<number | null>(0);
  const [editing, setEditing] = useState<string | null>(null);
  const [picking, setPicking] = useState<number | null>(null);
  const setDay = (i: number, patch: Partial<Day>) => setDays(d => d.map((x, j) => j === i ? { ...x, ...patch } : x));
  const setEx = (i: number, k: number, patch: Partial<Exercise>) => setDay(i, { exercises: days[i].exercises.map((e, j) => j === k ? { ...e, ...patch } : e) });
  const move = (i: number, k: number, by: number) => { const list = [...days[i].exercises]; const [x] = list.splice(k, 1); list.splice(k + by, 0, x); setDay(i, { exercises: list }); };
  const used = new Set(days.map(d => d.day));
  const add = (e: CatalogEntry) => { if (picking === null) return; const ex = toExercise(e, uid()); setDay(picking, { exercises: [...days[picking].exercises, ex] }); setEditing(ex.id); setPicking(null); };
  const newDay = (day: number) => { setDays(d => [...d, { title: `Seduta ${String.fromCharCode(65 + d.length)}`, day, exercises: [] }]); setOpen(days.length); };
  const sets = days.reduce((a, d) => a + d.exercises.reduce((b, e) => b + e.sets, 0), 0);

  if (picking !== null) return <ExercisePicker custom={custom} pick={add}
    create={e => { const id = 'c-' + uid(); const ok = act({ type: 'customExercise', data: { ...e, id } }); if (ok) add({ ...e, id, mu: [], c: 'forza', l: 1, src: 'custom' }); return ok; }}
    remove={id => act({ type: 'customExerciseDelete', data: id })} />;

  return <div className="builder">
    <p className="note">Scegli giorni, esercizi e serie. Il coach non li cambia: ti suggerisce solo carichi e riscaldamento.</p>

    <div className="weekpick" role="group" aria-label="Giorni della settimana">
      {[0, 1, 2, 3, 4, 5, 6].map(d => { const i = days.findIndex(x => x.day === d); return <button type="button" key={d} className={i >= 0 ? 'on' : ''} aria-pressed={i >= 0}
        onClick={() => i >= 0 ? setOpen(i) : newDay(d)} title={i >= 0 ? days[i].title : `Aggiungi un allenamento ${dayNames[d].toLowerCase()}`}>{short(d)}</button>; })}
    </div>
    <p className="buildsum num">{days.length} {days.length === 1 ? 'allenamento' : 'allenamenti'} · {sets} serie a settimana</p>

    {days.map((d, i) => { const isOpen = open === i; return <section className={'bday' + (isOpen ? ' open' : '')} key={i}>
      <button type="button" className="bdayhead" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : i)}>
        <span className="daypill">{short(d.day)}</span>
        <span className="grow"><b>{d.title || 'Seduta'}</b><small className="num">{d.exercises.length} esercizi · {d.exercises.reduce((a, e) => a + e.sets, 0)} serie{d.exercises.length ? ` · ~${minutes(d)} min` : ''}</small></span>
        <ChevronDown size={18} className="chev" />
      </button>
      {isOpen && <div className="bdaybody">
        <div className="bdayfields">
          <label className="field"><span>Nome</span><input value={d.title} maxLength={40} onChange={e => setDay(i, { title: e.target.value })} placeholder="Es. Petto e tricipiti" /></label>
          <label className="field"><span>Giorno</span><select value={d.day} onChange={e => setDay(i, { day: Number(e.target.value) })}>{[0, 1, 2, 3, 4, 5, 6].filter(x => x === d.day || !used.has(x)).map(x => <option key={x} value={x}>{dayNames[x]}</option>)}</select></label>
        </div>

        {d.exercises.length === 0 && <p className="bempty">Nessun esercizio. Aggiungine uno dalla libreria.</p>}
        <ol className="bexlist">{d.exercises.map((e, k) => { const ed = editing === e.id; return <li className={'bex' + (ed ? ' editing' : '')} key={e.id}>
          <button type="button" className="bexrow" aria-expanded={ed} onClick={() => setEditing(ed ? null : e.id)}>
            <span className="bexn num">{k + 1}</span>
            <span className="grow"><b>{e.name}</b><small className="num">{e.sets} × {e.low}–{e.high}{e.unit === 'seconds' ? ' s' : ''}{e.unit !== 'seconds' ? ` · RIR ${e.rir}` : ''} · rec. {restLabel(e.rest)}</small></span>
            {ed ? <Check size={17} /> : <Pencil size={15} />}
          </button>
          {ed && <div className="bexedit">
            <div className="steppers">
              <Stepper label="Serie" value={e.sets} min={1} max={10} set={v => setEx(i, k, { sets: v })} />
              <Stepper label={e.unit === 'seconds' ? 'Secondi minimi' : 'Ripetizioni minime'} value={e.low} min={1} max={e.high} step={e.unit === 'seconds' ? 5 : 1} set={v => setEx(i, k, { low: v })} />
              <Stepper label={e.unit === 'seconds' ? 'Secondi massimi' : 'Ripetizioni massime'} value={e.high} min={e.low} max={e.unit === 'seconds' ? 600 : 50} step={e.unit === 'seconds' ? 5 : 1} set={v => setEx(i, k, { high: v })} />
              {e.unit !== 'seconds' && <Stepper label="RIR" value={e.rir} min={0} max={5} set={v => setEx(i, k, { rir: v })} />}
              <Stepper label="Recupero" value={e.rest} min={15} max={600} step={15} show={restLabel} set={v => setEx(i, k, { rest: v })} />
            </div>
            {e.unit !== 'seconds' && <p className="hint">RIR = ripetizioni che ti restano nel serbatoio a fine serie.</p>}
            <div className="bexactions">
              <button type="button" className="iconbtn small" aria-label="Su" disabled={k === 0} onClick={() => move(i, k, -1)}><ArrowUp size={15} /></button>
              <button type="button" className="iconbtn small" aria-label="Giù" disabled={k === d.exercises.length - 1} onClick={() => move(i, k, 1)}><ArrowDown size={15} /></button>
              <button type="button" className="ghost danger-text" onClick={() => setDay(i, { exercises: d.exercises.filter((_, j) => j !== k) })}><Trash2 size={15} /> Togli</button>
            </div>
          </div>}
        </li>; })}</ol>

        <button type="button" className="dashed" onClick={() => setPicking(i)}><Plus size={17} /> Aggiungi esercizio</button>
        <button type="button" className="ghost danger-text delday" onClick={() => { if (!d.exercises.length || confirm(`Eliminare "${d.title}"?`)) { setDays(x => x.filter((_, j) => j !== i)); setOpen(null); } }}><Trash2 size={15} /> Elimina questo allenamento</button>
      </div>}
    </section>; })}

    {used.size < 7 && <button type="button" className="dashed" onClick={() => newDay([0, 1, 2, 3, 4, 5, 6].find(x => !used.has(x))!)}><Plus size={17} /> Aggiungi un allenamento</button>}

    <div className="savebar">
      {days.length > 0 && <button type="button" className="ghost" onClick={() => { if (confirm('Ripartire da zero, senza allenamenti?')) { setDays([]); setOpen(null); } }}><RotateCcw size={15} /> Da zero</button>}
      <button type="button" className="primary big" disabled={!days.length} onClick={() => { if (act({ type: 'customPlan', data: days })) done(); }}><Check size={18} /> Salva il mio piano</button>
    </div>
  </div>;
}
