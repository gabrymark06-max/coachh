'use client';
/* eslint-disable @next/next/no-img-element -- product thumbnails come from Open Food Facts and local blob: URLs */
import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, ScanBarcode, Camera, History, PenLine, Check, FileText, Trash2 } from 'lucide-react';
import type { FoodEntry, MealSlot, SavedMeal } from '../../lib/types';
import { searchGeneric, forGrams, counterpart, type FoodItem } from '../../lib/foods';
import { MealSelect, fmt, type Add, type AddMany } from './shared';
import { Scan, LabelPhoto } from './scan';
import { GuessMeal } from './guess';

export type Mode = 'search' | 'scan' | 'photo' | 'text' | 'recent' | 'qty' | 'manual' | 'label';
type Picked = FoodItem & { grams?: number; source: FoodEntry['source']; id?: string };

export function Picker({ initial, date, recent, meals, add, addMany, deleteMeal }: { initial: { meal: MealSlot; mode: Mode; entry?: FoodEntry }; date: string; recent: FoodEntry[]; meals: SavedMeal[]; add: Add; addMany: AddMany; deleteMeal: (id: string) => void }) {
  const [mode, setMode] = useState<Mode>(initial.mode);
  const [meal, setMeal] = useState<MealSlot>(initial.meal);
  const [picked, setPicked] = useState<Picked | null>(initial.entry ? { ...initial.entry, source: initial.entry.source } : null);
  const [label, setLabel] = useState<{ code?: string; name?: string }>({});
  const choose = (f: FoodItem, source: FoodEntry['source'], grams?: number) => { setPicked({ ...f, source, grams }); setMode('qty'); };
  const readLabel = (x: { code?: string; name?: string } = {}) => { setLabel(x); setMode('label'); };
  const tabs: [Mode, string, typeof Search][] = [['search', 'Cerca', Search], ['scan', 'Codice', ScanBarcode], ['photo', 'Foto', Camera], ['recent', 'Recenti', History]];
  return <div className="picker">
    {mode !== 'qty' && <div className="segmented full">{tabs.map(([m, l, Icon]) => <button key={m} type="button" aria-pressed={mode === m || ((mode === 'manual' || mode === 'text') && m === 'search') || (mode === 'label' && m === 'scan')} onClick={() => setMode(m)}><Icon size={16} /> {l}</button>)}</div>}
    {mode === 'search' && <SearchFood choose={choose} manual={() => setMode('manual')} write={() => setMode('text')} />}
    {mode === 'scan' && <Scan choose={choose} known={recent} readLabel={readLabel} manual={() => setMode('manual')} />}
    {mode === 'label' && <LabelPhoto {...label} choose={choose} />}
    {(mode === 'photo' || mode === 'text') && <GuessMeal key={mode} kind={mode} date={date} meal={meal} setMeal={setMeal} addMany={addMany} />}
    {mode === 'recent' && <Recent list={recent} meals={meals} choose={choose} logMeal={m => addMany(m.items.map(x => ({ ...x, date, meal })))} deleteMeal={deleteMeal} />}
    {mode === 'manual' && <Manual choose={choose} readLabel={() => readLabel()} />}
    {mode === 'qty' && picked && <Quantity item={picked} meal={meal} setMeal={setMeal} back={initial.entry ? undefined : () => setMode(picked.source === 'barcode' || picked.source === 'label' ? 'scan' : picked.source === 'recent' ? 'recent' : 'search')} swap={f => setPicked({ ...picked, ...f, image: undefined })} save={grams => add({ id: picked.id, date: initial.entry?.date ?? date, meal, name: picked.name, brand: picked.brand, grams, kcal: picked.kcal, p: picked.p, c: picked.c, f: picked.f, code: picked.code, source: picked.source })} />}
  </div>;
}

function FoodOption({ f, onClick }: { f: FoodItem; onClick: () => void }) {
  return <button type="button" className="foodopt" onClick={onClick}>
    {f.image ? <img src={f.image} alt="" /> : <span className="foodicon" />}
    <span className="grow"><b>{f.name}</b><small>{f.brand ? `${f.brand} · ` : ''}{fmt(f.kcal)} kcal · P {f.p} · C {f.c} · G {f.f} <i>/100 g</i></small></span>
    <Plus size={18} />
  </button>;
}

function SearchFood({ choose, manual, write }: { choose: (f: FoodItem, s: FoodEntry['source']) => void; manual: () => void; write: () => void }) {
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
    <button type="button" className="ghost" onClick={write}><PenLine size={16} /> Scrivi o detta cosa hai mangiato</button>
    <button type="button" className="ghost" onClick={manual}><FileText size={16} /> Inserisci i valori dell’etichetta</button>
  </>;
}

function Recent({ list, meals, choose, logMeal, deleteMeal }: { list: FoodEntry[]; meals: SavedMeal[]; choose: (f: FoodItem, s: FoodEntry['source'], grams?: number) => void; logMeal: (m: SavedMeal) => void; deleteMeal: (id: string) => void }) {
  const seen = new Set<string>();
  const items = [...list].reverse().filter(e => { const k = e.name + '|' + (e.brand ?? ''); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 25);
  if (!items.length && !meals.length) return <p className="note center">Qui trovi gli alimenti che registri, per aggiungerli di nuovo con un tocco.</p>;
  return <>
    {meals.length > 0 && <><p className="pickerlabel">Pasti salvati</p>{[...meals].reverse().map(m => <div className="savedmeal" key={m.id}>
      <button type="button" className="foodopt" onClick={() => logMeal(m)}><span className="foodicon" /><span className="grow"><b>{m.name}</b><small>{m.items.map(x => x.name).join(', ')} · {fmt(m.items.reduce((t, x) => t + forGrams(x, x.grams).kcal, 0))} kcal</small></span><Plus size={18} /></button>
      <button type="button" className="iconbtn small" aria-label={`Elimina ${m.name}`} onClick={() => { if (confirm(`Eliminare il pasto salvato «${m.name}»?`)) deleteMeal(m.id); }}><Trash2 size={15} /></button>
    </div>)}</>}
    {items.length > 0 && <p className="pickerlabel">Alimenti recenti</p>}
    {items.map(e => <FoodOption key={e.id} f={e} onClick={() => choose(e, 'recent', e.grams)} />)}
  </>;
}

function Manual({ choose, readLabel }: { choose: (f: FoodItem, s: FoodEntry['source']) => void; readLabel: () => void }) {
  return <form onSubmit={e => {
    e.preventDefault();
    const d = new FormData(e.currentTarget), v = (k: string) => Number(String(d.get(k) ?? '').replace(',', '.')) || 0;
    choose({ name: String(d.get('name')), kcal: v('kcal'), p: v('p'), c: v('c'), f: v('f') }, 'manual');
  }}>
    <button type="button" className="secondary full" onClick={readLabel}><FileText size={17} /> Leggi l’etichetta con la fotocamera</button>
    <p className="note">Oppure copia i valori «per 100 g» dall’etichetta.</p>
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

/** Open Food Facts serves each photo in several sizes: lists use the small one, the product card a sharper one. */
const sized = (url: string, size: '400' | 'full') => url.replace(/\.(100|200|400)\.jpg$/, `.${size}.jpg`);

function ProductPhoto({ src, name }: { src: string; name: string }) {
  const [zoom, setZoom] = useState(false);
  const [big, setBig] = useState(true);
  return <button type="button" className={'productphoto' + (zoom ? ' zoom' : '')} aria-label={zoom ? 'Riduci la foto' : `Ingrandisci la foto di ${name}`} onClick={() => setZoom(!zoom)}>
    <img src={big ? sized(src, zoom ? 'full' : '400') : src} alt="" onError={() => setBig(false)} />
  </button>;
}

function Quantity({ item, meal, setMeal, back, swap, save }: { item: Picked; meal: MealSlot; setMeal: (m: MealSlot) => void; back?: () => void; swap: (f: FoodItem) => void; save: (grams: number) => void }) {
  const [grams, setGrams] = useState(String(item.grams ?? item.serving ?? 100));
  const g = Number(grams.replace(',', '.')) || 0;
  const m = forGrams(item, g);
  const chips = [...new Set([item.serving, 50, 100, 150, 200].filter((x): x is number => !!x))];
  const other = item.brand ? null : counterpart(item.name);
  return <form className="qty" onSubmit={e => { e.preventDefault(); if (g > 0) save(g); }}>
    {item.image && <ProductPhoto src={item.image} name={item.name} />}
    <div className="qtyhead"><div><h3>{item.name}</h3><small>{item.brand ? `${item.brand} · ` : ''}{fmt(item.kcal)} kcal per 100 g</small></div></div>
    {other && <div className="segmented full rawcooked">
      <button type="button" aria-pressed={other.cooked} onClick={() => { if (!other.cooked) swap(other.food); }}>Pesato crudo</button>
      <button type="button" aria-pressed={!other.cooked} onClick={() => { if (other.cooked) swap(other.food); }}>Pesato cotto</button>
    </div>}
    <label className="gramsbig"><input type="number" inputMode="decimal" min={1} max={3000} step="any" autoFocus value={grams} onChange={e => setGrams(e.target.value)} /><span>grammi</span></label>
    <div className="chiprow">{chips.map(c => <button type="button" key={c} className={'chip' + (g === c ? ' on' : '')} onClick={() => setGrams(String(c))}>{c === item.serving && (item.servingLabel ?? '').replace(/\s/g, '').toLowerCase() !== `${c}g` ? `${item.servingLabel ?? 'porzione'} · ${c} g` : `${c} g`}</button>)}</div>
    <div className="qtymacros num"><span><b>{fmt(m.kcal)}</b> kcal</span><span><b>{m.p}</b> P</span><span><b>{m.c}</b> C</span><span><b>{m.f}</b> G</span></div>
    <MealSelect meal={meal} setMeal={setMeal} />
    <div className="qtyactions">{back && <button type="button" className="secondary" onClick={back}>Indietro</button>}<button className="primary big" disabled={g <= 0}><Check size={18} /> {item.id ? 'Salva' : 'Aggiungi'}</button></div>
  </form>;
}
