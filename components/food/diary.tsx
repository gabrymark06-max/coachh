'use client';
import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, ScanBarcode, Camera, Search, Trash2, Mic, Copy, Bookmark } from 'lucide-react';
import type { AppState, FoodEntry, MealSlot, Plan } from '../../lib/types';
import { mealNames } from '../../lib/types';
import type { NutritionPlan } from '../../lib/planner';
import type { Action } from '../../lib/store';
import { forGrams } from '../../lib/foods';
import { Modal } from '../modal';
import { SLOTS, iso, shift, fmt, sum, slotNow } from './shared';
import { Picker, type Mode } from './picker';

export function FoodDiary({ state, n, plan, act }: { state: AppState; n: NutritionPlan; plan: Plan | null; act: (a: Action) => boolean }) {
  const today = iso(new Date());
  const [date, setDate] = useState(today);
  const [picker, setPicker] = useState<{ meal: MealSlot; mode: Mode; entry?: FoodEntry } | null>(null);
  const foods = useMemo(() => state.foods ?? [], [state.foods]);
  const day = foods.filter(e => e.date === date);
  const weekday = (new Date(date + 'T12:00:00').getDay() + 6) % 7;
  const training = !!plan?.sessions.some(s => s.day === weekday);
  const target = training ? n.training : n.rest;
  const total = sum(day);
  const left = target ? target.kcal - total.kcal : 0;
  // Last seven days with something logged: average against the targets.
  const week = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => shift(today, -i)).filter(d => foods.some(e => e.date === d));
    if (days.length < 2) return null;
    const totals = days.map(d => sum(foods.filter(e => e.date === d)));
    return { days: days.length, kcal: totals.reduce((t, x) => t + x.kcal, 0) / days.length, p: totals.reduce((t, x) => t + x.p, 0) / days.length };
  }, [foods, today]);
  const yesterday = foods.filter(e => e.date === shift(date, -1));
  const strip = (e: FoodEntry) => ({ name: e.name, brand: e.brand, grams: e.grams, kcal: e.kcal, p: e.p, c: e.c, f: e.f, code: e.code, source: e.source });
  // Copying keeps foods and grams, with a new date (and meal): the fastest way to log a routine day.
  const copy = (list: FoodEntry[], meal?: MealSlot) => act({ type: 'foods', data: list.map(e => ({ ...strip(e), date, meal: meal ?? e.meal })) });
  const saveMeal = (slot: MealSlot, items: FoodEntry[]) => {
    const name = prompt('Nome del pasto da salvare', `${mealNames[slot]} solita`)?.trim();
    if (name) act({ type: 'mealSave', data: { name, items: items.map(strip) } });
  };
  const label = date === today ? 'Oggi' : date === shift(today, -1) ? 'Ieri' : new Date(date + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });

  return <section className="fooddiary">
    <div className="sectionheading"><h2>Diario alimentare</h2>
      <div className="datenav">
        <button className="iconbtn" aria-label="Giorno precedente" onClick={() => setDate(shift(date, -1))}><ChevronLeft size={18} /></button>
        <strong>{label}</strong>
        <button className="iconbtn" aria-label="Giorno successivo" disabled={date >= today} onClick={() => setDate(shift(date, 1))}><ChevronRight size={18} /></button>
      </div>
    </div>
    <div className="grid2 tight">
      <div className="panel intake">
        <div className="eyebrow">{training ? 'Giorno di allenamento' : 'Giorno di riposo'}</div>
        <div className="kcalleft"><strong className="num">{fmt(Math.abs(left))}</strong><span>{left >= 0 ? 'kcal rimaste' : 'kcal oltre l’obiettivo'}</span></div>
        {target && <div className="bars">
          <Bar label="Calorie" value={total.kcal} goal={target.kcal} unit="kcal" />
          <Bar label="Proteine" value={total.p} goal={target.protein} unit="g" cls="p" />
          <Bar label="Carboidrati" value={total.c} goal={target.carbs} unit="g" cls="c" />
          <Bar label="Grassi" value={total.f} goal={target.fat} unit="g" cls="f" />
        </div>}
        {week && <p className="note">Media ultimi {week.days} giorni registrati: <b className="num">{fmt(week.kcal)}</b> kcal e <b className="num">{fmt(week.p)}</b> g di proteine.</p>}
      </div>
      <div className="panel quickadd">
        <h3>Aggiungi in un attimo</h3>
        <button className="quick" onClick={() => setPicker({ meal: slotNow(), mode: 'scan' })}><ScanBarcode /><span><b>Scansiona il codice a barre</b><small>Prodotti confezionati</small></span></button>
        <button className="quick" onClick={() => setPicker({ meal: slotNow(), mode: 'photo' })}><Camera /><span><b>Foto del piatto</b><small>Riconosco i cibi e stimo i grammi</small></span></button>
        <button className="quick" onClick={() => setPicker({ meal: slotNow(), mode: 'search' })}><Search /><span><b>Cerca un alimento</b><small>Alimenti comuni e prodotti di marca</small></span></button>
        <button className="quick" onClick={() => setPicker({ meal: slotNow(), mode: 'text' })}><Mic /><span><b>Scrivi o detta</b><small>«Pollo, riso e insalata»: calcolo io i grammi</small></span></button>
      </div>
    </div>
    {!day.length && yesterday.length > 0 && <button className="secondary copyday" onClick={() => copy(yesterday)}><Copy size={16} /> Copia la giornata di ieri · {fmt(sum(yesterday).kcal)} kcal</button>}
    <div className="mealgrid">{SLOTS.map(slot => {
      const items = day.filter(e => e.meal === slot), t = sum(items);
      return <article className="mealcard" key={slot}>
        <header><h3>{mealNames[slot]}</h3><small className="num">{fmt(t.kcal)} kcal · P {fmt(t.p)}</small>
          {items.length > 1 && <button className="iconbtn small" aria-label={`Salva ${mealNames[slot]} come pasto`} title="Salva come pasto" onClick={() => saveMeal(slot, items)}><Bookmark size={15} /></button>}</header>
        {items.map(e => { const m = forGrams(e, e.grams); return <div className="foodrow" key={e.id}>
          <button className="foodname" onClick={() => setPicker({ meal: slot, mode: 'qty', entry: e })}><b>{e.name}</b><small>{e.brand ? `${e.brand} · ` : ''}{fmt(e.grams)} g</small></button>
          <span className="num">{fmt(m.kcal)}</span>
          <button className="iconbtn small" aria-label={`Elimina ${e.name}`} onClick={() => act({ type: 'foodDelete', data: e.id })}><Trash2 size={15} /></button>
        </div>; })}
        <button className="ghost addfood" onClick={() => setPicker({ meal: slot, mode: 'search' })}><Plus size={16} /> Aggiungi</button>
        {!items.length && day.length > 0 && yesterday.some(e => e.meal === slot) && <button className="ghost addfood" onClick={() => copy(yesterday.filter(e => e.meal === slot), slot)}><Copy size={15} /> Come ieri</button>}
      </article>;
    })}</div>
    {picker && <Modal title={picker.entry ? 'Modifica alimento' : `Aggiungi · ${mealNames[picker.meal]}`} close={() => setPicker(null)}>
      <Picker initial={picker} date={date} recent={foods} meals={state.meals ?? []}
        add={e => { const ok = act({ type: 'food', data: e }); if (ok) setPicker(null); return ok; }}
        addMany={list => { const ok = act({ type: 'foods', data: list }); if (ok) setPicker(null); return ok; }}
        deleteMeal={id => act({ type: 'mealDelete', data: id })} />
    </Modal>}
  </section>;
}

function Bar({ label, value, goal, unit, cls = '' }: { label: string; value: number; goal: number; unit: string; cls?: string }) {
  const pct = goal ? Math.min(100, value / goal * 100) : 0;
  return <div className={'intakebar ' + cls + (value > goal * 1.05 ? ' over' : '')}>
    <span>{label}</span><span className="num">{fmt(value)} / {fmt(goal)} {unit}</span>
    <span className="track"><span style={{ width: `${pct}%` }} /></span>
  </div>;
}
