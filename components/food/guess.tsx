'use client';
/* eslint-disable @next/next/no-img-element -- local blob: preview of the meal photo */
import { useEffect, useRef, useState } from 'react';
import { Plus, Minus, Camera, Check, RefreshCw, Mic, Sparkles } from 'lucide-react';
import type { MealSlot } from '../../lib/types';
import { forGrams } from '../../lib/foods';
import { MealSelect, fmt, sum, shrink, postPhoto, type AddMany } from './shared';

type Guess = { name: string; grams: number; kcal: number; p: number; c: number; f: number; confidence: 'alta' | 'media' | 'bassa'; ref?: string; on: boolean };
type Result = { dish: string; question: string; items: Guess[] };

/** Meal from a photo (kind "photo") or from a written or dictated description (kind "text"): foods and grams to check, then added together. */
export function GuessMeal({ kind, date, meal, setMeal, addMany }: { kind: 'photo' | 'text'; date: string; meal: MealSlot; setMeal: (m: MealSlot) => void; addMany: AddMany }) {
  const [image, setImage] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [note, setNote] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function analyse(body: { image?: string; text?: string }, extra: string, previous?: Guess[]) {
    setError(''); setBusy(true);
    try {
      const d = await postPhoto<Omit<Result, 'items'> & { items: Omit<Guess, 'on'>[] }>({ ...body, mode: body.image ? 'meal' : 'text', note: extra, previous: previous?.filter(x => x.on).map(x => ({ name: x.name, grams: x.grams })) });
      if (!d.items?.length) throw Error(body.image ? 'Non vedo cibo nella foto: riprova inquadrando tutto il piatto, dall’alto o di tre quarti.' : 'Non ho capito cosa hai mangiato: scrivi alimenti e quantità, per esempio «pasta al pomodoro e un’insalata».');
      setResult({ dish: d.dish, question: d.question, items: d.items.map(x => ({ ...x, on: true })) });
      setNote('');
    } catch (e) { setError((e as Error).message); }
    setBusy(false);
  }
  async function pick(file: File) {
    setResult(null); setError('');
    let img: string;
    try { img = await shrink(file, 1536, 0.85); } catch { setError('Non riesco ad aprire questa foto.'); return; }
    setImage(img); await analyse({ image: img }, note);
  }
  const source = image ? { image } : { text };
  const items = result?.items;
  const set = (i: number, patch: Partial<Guess>) => setResult(r => r && { ...r, items: r.items.map((y, j) => j === i ? { ...y, ...patch } : y) });
  const chosen = items?.filter(x => x.on && x.grams > 0) ?? [];
  const tot = sum(chosen.map(x => ({ ...x, id: '', date, meal, source: 'photo' as const })));
  const step = (g: number) => g >= 200 ? 20 : g >= 50 ? 10 : 5;
  return <>
    {kind === 'photo' && <label className="photodrop">
      <input type="file" accept="image/*" capture="environment" hidden onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) pick(f); }} />
      {image ? <img src={image} alt="Il tuo piatto" /> : <span><Camera size={28} /><b>Scatta o scegli la foto del piatto</b><small>Tutto il piatto inquadrato, con le posate accanto: aiutano a capire le dimensioni</small></span>}
    </label>}
    {kind === 'photo' && !result && <label className="field"><span>Descrizione (facoltativa, migliora molto la stima)</span><textarea rows={2} maxLength={500} placeholder="Es. carbonara con 100 g di pasta cruda, 1 cucchiaio d’olio" value={note} onChange={e => setNote(e.target.value)} /></label>}
    {kind === 'text' && !result && <form className="textmeal" onSubmit={e => { e.preventDefault(); if (text.trim()) analyse({ text }, ''); }}>
      <label className="field"><span>Cosa hai mangiato?</span>
        <div className="dictate"><textarea rows={3} maxLength={600} autoFocus placeholder="Es. 200 g di petto di pollo, un piatto di riso e un’insalata con un cucchiaio d’olio" value={text} onChange={e => setText(e.target.value)} /><Dictate onText={t => setText(x => (x ? x.trim() + ' ' : '') + t)} /></div>
      </label>
      <button className="primary big" disabled={!text.trim() || busy}><Sparkles size={18} /> Calcola</button>
    </form>}
    {busy && <p className="note center"><span className="spinner" /> {result ? 'Aggiorno la stima…' : kind === 'photo' ? 'Riconosco i cibi e stimo le porzioni…' : 'Calcolo alimenti e grammi…'}</p>}
    {error && <p className="formerror">{error}</p>}
    {result && items && <>
      <p className="dish">{result.dish && <b>{result.dish}</b>}<small>Controlla e correggi i grammi</small></p>
      {items.map((x, i) => { const m = forGrams(x, x.grams); return <div className={'guess' + (x.on ? '' : ' off')} key={i}>
        <label className="setcheck"><input type="checkbox" checked={x.on} onChange={e => set(i, { on: e.target.checked })} /></label>
        <span className="grow"><b>{x.name}</b><small className="num">{fmt(m.kcal)} kcal · P {m.p} · C {m.c} · G {m.f}</small>
          {(x.confidence !== 'alta' || x.ref) && <small className="tags">{x.confidence !== 'alta' && <i className={'conf ' + x.confidence}>{x.confidence === 'bassa' ? 'stima incerta' : 'stima media'}</i>}{x.ref && <i className="ref">valori da tabella</i>}</small>}</span>
        <span className="gramsedit">
          <button type="button" className="iconbtn small" aria-label={`Meno ${x.name}`} onClick={() => set(i, { grams: Math.max(0, x.grams - step(x.grams)) })}><Minus size={14} /></button>
          <label className="gramsin"><input type="number" inputMode="numeric" min={1} max={3000} value={x.grams} onChange={e => set(i, { grams: Number(e.target.value) || 0 })} /><span>g</span></label>
          <button type="button" className="iconbtn small" aria-label={`Più ${x.name}`} onClick={() => set(i, { grams: x.grams + step(x.grams) })}><Plus size={14} /></button>
        </span>
      </div>; })}
      <form className="refine" onSubmit={e => { e.preventDefault(); if (note.trim()) analyse(source, result.question ? `Domanda: ${result.question} Risposta: ${note}` : note, items); }}>
        {result.question && <p className="question">{result.question}</p>}
        <div className="codeinput"><input placeholder={result.question ? 'Rispondi…' : 'Correggi: «c’era anche il pane», «niente olio»…'} maxLength={500} value={note} onChange={e => setNote(e.target.value)} /><button className="secondary" disabled={!note.trim() || busy}><RefreshCw size={16} /> {result.question ? 'Invia' : 'Ricalcola'}</button></div>
      </form>
      <MealSelect meal={meal} setMeal={setMeal} />
      <button className="primary big" disabled={!chosen.length || busy} onClick={() => addMany(chosen.map(x => ({ date, meal, name: x.name, grams: x.grams, kcal: x.kcal, p: x.p, c: x.c, f: x.f, source: kind === 'photo' ? 'photo' : 'manual' })))}><Check size={18} /> Aggiungi {chosen.length} {chosen.length === 1 ? 'alimento' : 'alimenti'} · {fmt(tot.kcal)} kcal</button>
      <p className="note">{kind === 'photo' ? 'Stima da foto: i grammi possono sbagliare del 20–30%. Per i confezionati il codice a barre è più preciso.' : 'Se non indichi i grammi uso porzioni tipiche: correggili qui sopra.'}</p>
    </>}
  </>;
}

type Recognition = { lang: string; interimResults: boolean; continuous: boolean; start: () => void; stop: () => void; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null };

/** Dictation button: the browser's speech recognition in Italian, when available (Chrome, Edge, Safari). */
function Dictate({ onText }: { onText: (t: string) => void }) {
  const [on, setOn] = useState(false);
  const [can, setCan] = useState(false);
  const rec = useRef<Recognition | null>(null);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- feature check that needs window, done once after mount
  useEffect(() => setCan(!!speechApi()), []);
  if (!can) return null;
  const toggle = () => {
    if (on) { rec.current?.stop(); return; }
    const Api = speechApi()!; const r = new Api();
    r.lang = 'it-IT'; r.interimResults = false; r.continuous = false;
    r.onresult = e => onText(Array.from(e.results).map(x => x[0].transcript).join(' '));
    r.onend = () => setOn(false); r.onerror = () => setOn(false);
    rec.current = r; r.start(); setOn(true);
  };
  return <button type="button" className={'iconbtn mic' + (on ? ' live' : '')} aria-label={on ? 'Ferma la dettatura' : 'Detta'} onClick={toggle}><Mic size={18} /></button>;
}
const speechApi = () => { const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition }; return w.SpeechRecognition ?? w.webkitSpeechRecognition; };
