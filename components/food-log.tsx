'use client';
/* eslint-disable @next/next/no-img-element -- product thumbnails come from Open Food Facts and local blob: URLs */
import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, ScanBarcode, Camera, Search, History, Trash2, PenLine, Check } from 'lucide-react';
import type { AppState, FoodEntry, MealSlot, Plan } from '../lib/types';
import { mealNames } from '../lib/types';
import type { NutritionPlan } from '../lib/planner';
import { searchGeneric, forGrams, type FoodItem } from '../lib/foods';
import { accessToken } from '../lib/supabase';
import { Modal } from './modal';

type Add = (e: Omit<FoodEntry, 'id'> & { id?: string }) => boolean;
const SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const iso = (d: Date) => d.toLocaleDateString('sv-SE', { timeZone: 'Europe/Rome' });
const shift = (date: string, days: number) => { const d = new Date(date + 'T12:00:00'); d.setDate(d.getDate() + days); return iso(d); };
const fmt = (x: number) => Math.round(x).toLocaleString('it-IT');
const sum = (list: FoodEntry[]) => list.reduce((t, e) => { const m = forGrams(e, e.grams); return { kcal: t.kcal + m.kcal, p: t.p + m.p, c: t.c + m.c, f: t.f + m.f }; }, { kcal: 0, p: 0, c: 0, f: 0 });
/** Meal slot that fits the current hour. */
const slotNow = (): MealSlot => { const h = Number(new Date().toLocaleString('en-GB', { hour: '2-digit', hour12: false, timeZone: 'Europe/Rome' })); return h < 11 ? 'breakfast' : h < 15 ? 'lunch' : h < 18 ? 'snack' : 'dinner'; };

export function FoodDiary({ state, n, plan, add, remove }: { state: AppState; n: NutritionPlan; plan: Plan | null; add: Add; remove: (id: string) => void }) {
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
      </div>
    </div>
    <div className="mealgrid">{SLOTS.map(slot => {
      const items = day.filter(e => e.meal === slot), t = sum(items);
      return <article className="mealcard" key={slot}>
        <header><h3>{mealNames[slot]}</h3><small className="num">{fmt(t.kcal)} kcal · P {fmt(t.p)}</small></header>
        {items.map(e => { const m = forGrams(e, e.grams); return <div className="foodrow" key={e.id}>
          <button className="foodname" onClick={() => setPicker({ meal: slot, mode: 'qty', entry: e })}><b>{e.name}</b><small>{e.brand ? `${e.brand} · ` : ''}{fmt(e.grams)} g</small></button>
          <span className="num">{fmt(m.kcal)}</span>
          <button className="iconbtn small" aria-label={`Elimina ${e.name}`} onClick={() => remove(e.id)}><Trash2 size={15} /></button>
        </div>; })}
        <button className="ghost addfood" onClick={() => setPicker({ meal: slot, mode: 'search' })}><Plus size={16} /> Aggiungi</button>
      </article>;
    })}</div>
    {picker && <Modal title={picker.entry ? 'Modifica alimento' : `Aggiungi · ${mealNames[picker.meal]}`} close={() => setPicker(null)}>
      <Picker initial={picker} date={date} recent={foods} add={e => { const ok = add(e); if (ok) setPicker(null); return ok; }} />
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

type Mode = 'search' | 'scan' | 'photo' | 'recent' | 'qty' | 'manual';
type Picked = FoodItem & { grams?: number; source: FoodEntry['source']; id?: string };

function Picker({ initial, date, recent, add }: { initial: { meal: MealSlot; mode: Mode; entry?: FoodEntry }; date: string; recent: FoodEntry[]; add: Add }) {
  const [mode, setMode] = useState<Mode>(initial.mode);
  const [meal, setMeal] = useState<MealSlot>(initial.meal);
  const [picked, setPicked] = useState<Picked | null>(initial.entry ? { ...initial.entry, source: initial.entry.source } : null);
  const choose = (f: FoodItem, source: FoodEntry['source'], grams?: number) => { setPicked({ ...f, source, grams }); setMode('qty'); };
  const tabs: [Mode, string, typeof Search][] = [['search', 'Cerca', Search], ['scan', 'Codice', ScanBarcode], ['photo', 'Foto', Camera], ['recent', 'Recenti', History]];
  return <div className="picker">
    {mode !== 'qty' && <div className="segmented full">{tabs.map(([m, l, Icon]) => <button key={m} type="button" aria-pressed={mode === m || (mode === 'manual' && m === 'search')} onClick={() => setMode(m)}><Icon size={16} /> {l}</button>)}</div>}
    {mode === 'search' && <SearchFood choose={choose} manual={() => setMode('manual')} />}
    {mode === 'scan' && <Scan choose={choose} />}
    {mode === 'photo' && <PhotoMeal date={date} meal={meal} setMeal={setMeal} add={add} />}
    {mode === 'recent' && <Recent list={recent} choose={choose} />}
    {mode === 'manual' && <Manual choose={choose} />}
    {mode === 'qty' && picked && <Quantity item={picked} meal={meal} setMeal={setMeal} back={initial.entry ? undefined : () => setMode('search')} save={grams => add({ id: picked.id, date: initial.entry?.date ?? date, meal, name: picked.name, brand: picked.brand, grams, kcal: picked.kcal, p: picked.p, c: picked.c, f: picked.f, code: picked.code, source: picked.source })} />}
  </div>;
}

function FoodOption({ f, onClick }: { f: FoodItem; onClick: () => void }) {
  return <button type="button" className="foodopt" onClick={onClick}>
    {f.image ? <img src={f.image} alt="" /> : <span className="foodicon" />}
    <span className="grow"><b>{f.name}</b><small>{f.brand ? `${f.brand} · ` : ''}{fmt(f.kcal)} kcal · P {f.p} · C {f.c} · G {f.f} <i>/100 g</i></small></span>
    <Plus size={18} />
  </button>;
}

function SearchFood({ choose, manual }: { choose: (f: FoodItem, s: FoodEntry['source']) => void; manual: () => void }) {
  const [q, setQ] = useState('');
  const [remote, setRemote] = useState<{ q: string; items: FoodItem[] } | null>(null);
  const [error, setError] = useState('');
  const generic = useMemo(() => searchGeneric(q), [q]);
  useEffect(() => {
    if (q.trim().length < 3) return;
    const t = setTimeout(() => {
      fetch(`/api/food?q=${encodeURIComponent(q.trim())}`).then(r => r.json()).then((d: { items?: FoodItem[]; error?: string }) => { setRemote({ q, items: d.items ?? [] }); setError(d.error ?? ''); }).catch(() => setError('Ricerca dei prodotti non disponibile.'));
    }, 450);
    return () => clearTimeout(t);
  }, [q]);
  const branded = remote?.q === q ? remote.items : [];
  const loading = q.trim().length >= 3 && remote?.q !== q && !error;
  return <>
    <label className="authfield search"><Search size={18} /><input autoFocus placeholder="Es. yogurt greco, pasta, Barilla…" value={q} onChange={e => { setQ(e.target.value); setError(''); }} /></label>
    {generic.length > 0 && <><p className="pickerlabel">Alimenti comuni</p>{generic.map(f => <FoodOption key={f.name} f={f} onClick={() => choose(f, 'generic')} />)}</>}
    {(branded.length > 0 || loading) && <p className="pickerlabel">Prodotti di marca {loading && <span className="spinner" />}</p>}
    {branded.map(f => <FoodOption key={(f.code ?? '') + f.name} f={f} onClick={() => choose(f, 'search')} />)}
    {error && <p className="note">{error}</p>}
    {q.trim().length >= 3 && !loading && !generic.length && !branded.length && <p className="note">Nessun risultato per «{q}».</p>}
    <button type="button" className="ghost" onClick={manual}><PenLine size={16} /> Inserisci a mano i valori dell’etichetta</button>
  </>;
}

function Scan({ choose }: { choose: (f: FoodItem, s: FoodEntry['source']) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState('Avvio la fotocamera…');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const lookup = async (c: string) => {
    setBusy(true); setStatus(`Cerco il prodotto ${c}…`);
    const res = await fetch(`/api/food?code=${c}`).catch(() => null);
    const d = await res?.json().catch(() => null) as { item?: FoodItem; error?: string } | null;
    setBusy(false);
    if (d?.item) choose(d.item, 'barcode');
    else setStatus(d?.error ?? 'Prodotto non trovato.');
  };
  useEffect(() => {
    let stream: MediaStream | null = null, stop = false, timer: ReturnType<typeof setTimeout>;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 } }, audio: false });
        if (stop || !video.current) return;
        video.current.srcObject = stream; await video.current.play();
        const formats = ['ean_13', 'ean_8', 'upc_a', 'upc_e'];
        type Detector = { detect: (s: HTMLVideoElement) => Promise<{ rawValue: string }[]> };
        const Native = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Detector }).BarcodeDetector;
        const detector: Detector = Native ? new Native({ formats }) : new (await import('barcode-detector/ponyfill')).BarcodeDetector({ formats: formats as never });
        setStatus('Inquadra il codice a barre');
        const tick = async () => {
          if (stop || !video.current) return;
          const found = await detector.detect(video.current).catch(() => []);
          const raw = found.find(x => /^\d{8,14}$/.test(x.rawValue))?.rawValue;
          if (raw) { try { navigator.vibrate?.(80); } catch { /* not supported */ } stream?.getTracks().forEach(t => t.stop()); lookup(raw); return; }
          timer = setTimeout(tick, 250);
        };
        tick();
      } catch { setStatus('Fotocamera non disponibile: consenti l’accesso alla fotocamera oppure scrivi il codice qui sotto.'); }
    })();
    return () => { stop = true; clearTimeout(timer); stream?.getTracks().forEach(t => t.stop()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- start the camera once
  }, []);
  return <>
    <div className="scanner"><video ref={video} muted playsInline /><span className="scanframe" /></div>
    <p className="note center">{busy ? <span className="spinner" /> : null} {status}</p>
    <form className="codeinput" onSubmit={e => { e.preventDefault(); if (/^\d{8,14}$/.test(code)) lookup(code); }}>
      <input inputMode="numeric" placeholder="Oppure scrivi il codice (8–13 cifre)" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} />
      <button className="secondary" disabled={!/^\d{8,14}$/.test(code) || busy}>Cerca</button>
    </form>
  </>;
}

type Guess = { name: string; grams: number; kcal: number; p: number; c: number; f: number; on: boolean };
function PhotoMeal({ date, meal, setMeal, add }: { date: string; meal: MealSlot; setMeal: (m: MealSlot) => void; add: Add }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [items, setItems] = useState<Guess[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function analyse(file: File) {
    setError(''); setItems(null); setBusy(true);
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
      const scale = Math.min(1, 1024 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
      canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const image = canvas.toDataURL('image/jpeg', 0.8);
      setPreview(image);
      const token = await accessToken();
      const res = await fetch('/api/food-photo', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ image }) });
      const d = await res.json().catch(() => ({})) as { items?: Omit<Guess, 'on'>[]; error?: string };
      if (!res.ok) throw Error(d.error ?? 'Analisi non riuscita.');
      if (!d.items?.length) throw Error('Non vedo cibo nella foto: riprova inquadrando il piatto dall’alto.');
      setItems(d.items.map(x => ({ ...x, on: true })));
    } catch (e) { setError((e as Error).message); }
    setBusy(false);
  }
  const chosen = items?.filter(x => x.on) ?? [];
  const tot = sum(chosen.map(x => ({ ...x, id: '', date, meal, source: 'photo' as const })));
  return <>
    <label className="photodrop">
      <input type="file" accept="image/*" capture="environment" hidden onChange={e => e.target.files?.[0] && analyse(e.target.files[0])} />
      {preview ? <img src={preview} alt="Il tuo piatto" /> : <span><Camera size={28} /><b>Scatta o scegli la foto del piatto</b><small>Dall’alto, con tutto il piatto inquadrato</small></span>}
    </label>
    {busy && <p className="note center"><span className="spinner" /> Riconosco i cibi…</p>}
    {error && <p className="formerror">{error}</p>}
    {items && <>
      <p className="pickerlabel">Controlla e correggi i grammi</p>
      {items.map((x, i) => <div className={'guess' + (x.on ? '' : ' off')} key={i}>
        <label className="setcheck"><input type="checkbox" checked={x.on} onChange={e => setItems(a => a!.map((y, j) => j === i ? { ...y, on: e.target.checked } : y))} /></label>
        <span className="grow"><b>{x.name}</b><small className="num">{fmt(forGrams(x, x.grams).kcal)} kcal · P {forGrams(x, x.grams).p}</small></span>
        <label className="gramsin"><input type="number" inputMode="numeric" min={1} max={2000} value={x.grams} onChange={e => setItems(a => a!.map((y, j) => j === i ? { ...y, grams: Number(e.target.value) || 0 } : y))} /><span>g</span></label>
      </div>)}
      <MealSelect meal={meal} setMeal={setMeal} />
      <button className="primary big" disabled={!chosen.length} onClick={() => { for (const x of chosen) if (x.grams > 0) add({ date, meal, name: x.name, grams: x.grams, kcal: x.kcal, p: x.p, c: x.c, f: x.f, source: 'photo' }); }}><Check size={18} /> Aggiungi {chosen.length} {chosen.length === 1 ? 'alimento' : 'alimenti'} · {fmt(tot.kcal)} kcal</button>
      <p className="note">Stima automatica: per i prodotti confezionati il codice a barre è più preciso.</p>
    </>}
  </>;
}

function Recent({ list, choose }: { list: FoodEntry[]; choose: (f: FoodItem, s: FoodEntry['source'], grams?: number) => void }) {
  const seen = new Set<string>();
  const items = [...list].reverse().filter(e => { const k = e.name + '|' + (e.brand ?? ''); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 25);
  if (!items.length) return <p className="note center">Qui trovi gli alimenti che registri, per aggiungerli di nuovo con un tocco.</p>;
  return <>{items.map(e => <FoodOption key={e.id} f={e} onClick={() => choose(e, 'recent', e.grams)} />)}</>;
}

function Manual({ choose }: { choose: (f: FoodItem, s: FoodEntry['source']) => void }) {
  return <form onSubmit={e => {
    e.preventDefault();
    const d = new FormData(e.currentTarget), v = (k: string) => Number(String(d.get(k) ?? '').replace(',', '.')) || 0;
    choose({ name: String(d.get('name')), kcal: v('kcal'), p: v('p'), c: v('c'), f: v('f') }, 'manual');
  }}>
    <p className="note">Copia i valori «per 100 g» dall’etichetta.</p>
    <div className="formgrid">
      <label className="field" style={{ gridColumn: '1 / -1' }}><span>Nome</span><input name="name" required maxLength={120} /></label>
      <label className="field"><span>Energia (kcal)</span><input name="kcal" type="number" inputMode="decimal" step="any" min={0} max={950} required /></label>
      <label className="field"><span>Proteine (g)</span><input name="p" type="number" inputMode="decimal" step="any" min={0} max={100} required /></label>
      <label className="field"><span>Carboidrati (g)</span><input name="c" type="number" inputMode="decimal" step="any" min={0} max={100} required /></label>
      <label className="field"><span>Grassi (g)</span><input name="f" type="number" inputMode="decimal" step="any" min={0} max={100} required /></label>
    </div>
    <button className="primary big">Avanti</button>
  </form>;
}

function MealSelect({ meal, setMeal }: { meal: MealSlot; setMeal: (m: MealSlot) => void }) {
  return <div className="segmented full mealpick">{SLOTS.map(s => <button key={s} type="button" aria-pressed={meal === s} onClick={() => setMeal(s)}>{mealNames[s]}</button>)}</div>;
}

function Quantity({ item, meal, setMeal, back, save }: { item: Picked; meal: MealSlot; setMeal: (m: MealSlot) => void; back?: () => void; save: (grams: number) => void }) {
  const [grams, setGrams] = useState(String(item.grams ?? item.serving ?? 100));
  const g = Number(grams.replace(',', '.')) || 0;
  const m = forGrams(item, g);
  const chips = [...new Set([item.serving, 50, 100, 150, 200].filter((x): x is number => !!x))];
  return <form className="qty" onSubmit={e => { e.preventDefault(); if (g > 0) save(g); }}>
    <div className="qtyhead">{item.image && <img src={item.image} alt="" />}<div><h3>{item.name}</h3><small>{item.brand ? `${item.brand} · ` : ''}{fmt(item.kcal)} kcal per 100 g</small></div></div>
    <label className="gramsbig"><input type="number" inputMode="decimal" min={1} max={3000} step="any" autoFocus value={grams} onChange={e => setGrams(e.target.value)} /><span>grammi</span></label>
    <div className="chiprow">{chips.map(c => <button type="button" key={c} className={'chip' + (g === c ? ' on' : '')} onClick={() => setGrams(String(c))}>{c === item.serving ? `${item.servingLabel ?? 'porzione'} · ${c} g` : `${c} g`}</button>)}</div>
    <div className="qtymacros num"><span><b>{fmt(m.kcal)}</b> kcal</span><span><b>{m.p}</b> P</span><span><b>{m.c}</b> C</span><span><b>{m.f}</b> G</span></div>
    <MealSelect meal={meal} setMeal={setMeal} />
    <div className="qtyactions">{back && <button type="button" className="secondary" onClick={back}>Indietro</button>}<button className="primary big" disabled={g <= 0}><Check size={18} /> {item.id ? 'Salva' : 'Aggiungi'}</button></div>
  </form>;
}
