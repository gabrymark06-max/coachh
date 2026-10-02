'use client';
/* eslint-disable @next/next/no-img-element -- local blob: previews of the label photo */
import { useEffect, useRef, useState } from 'react';
import { PenLine, FileText, Check } from 'lucide-react';
import type { FoodEntry } from '../../lib/types';
import type { FoodItem } from '../../lib/foods';
import { shareProduct } from '../../lib/supabase';
import { fmt, shrink, postPhoto } from './shared';

export function Scan({ choose, known, readLabel, manual }: { choose: (f: FoodItem, s: FoodEntry['source']) => void; known: FoodEntry[]; readLabel: (x: { code?: string; name?: string }) => void; manual: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState('Avvio la fotocamera…');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [missing, setMissing] = useState<{ code: string; name?: string } | null>(null);
  const lookup = async (c: string) => {
    // A product this person already logged (also one read from its label) is found without asking the server.
    const mine = [...known].reverse().find(e => e.code === c);
    if (mine) { choose({ name: mine.name, brand: mine.brand, kcal: mine.kcal, p: mine.p, c: mine.c, f: mine.f, code: c }, 'barcode'); return; }
    setBusy(true); setMissing(null); setStatus(`Cerco il prodotto ${c}…`);
    const res = await fetch(`/api/food?code=${c}`).catch(() => null);
    const d = await res?.json().catch(() => null) as { item?: FoodItem; error?: string; name?: string } | null;
    setBusy(false);
    if (d?.item) { choose(d.item, 'barcode'); return; }
    if (res?.status === 404) { setMissing({ code: c, name: d?.name }); setStatus(d?.error ?? 'Prodotto non ancora nel database.'); }
    else setStatus(d?.error ?? 'Ricerca non riuscita: riprova.');
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
    {missing && <div className="missing">
      <p>Fotografa la tabella nutrizionale: leggo i valori e salvo il prodotto, così la prossima volta questo codice si trova subito, anche per gli altri utenti.</p>
      <button type="button" className="primary" onClick={() => readLabel(missing)}><FileText size={17} /> Fotografa l’etichetta</button>
      <button type="button" className="ghost" onClick={manual}><PenLine size={16} /> Inserisci i valori a mano</button>
    </div>}
    <form className="codeinput" onSubmit={e => { e.preventDefault(); if (/^\d{8,14}$/.test(code)) lookup(code); }}>
      <input inputMode="numeric" placeholder="Oppure scrivi il codice (8–13 cifre)" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} />
      <button className="secondary" disabled={!/^\d{8,14}$/.test(code) || busy}>Cerca</button>
    </form>
  </>;
}

/** Nutrition label read from a photo; with a barcode the product is also saved for everyone. */
export function LabelPhoto({ code, name, choose }: { code?: string; name?: string; choose: (f: FoodItem, s: FoodEntry['source']) => void }) {
  const [image, setImage] = useState<string | null>(null);
  const [title, setTitle] = useState(name ?? '');
  const [read, setRead] = useState<FoodItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const finish = (item: FoodItem, label: string) => {
    const product = { ...item, name: label, code };
    if (code) shareProduct({ ...product, code });
    choose(product, 'label');
  };
  async function pick(file: File) {
    setError(''); setBusy(true);
    try {
      const img = await shrink(file, 1800, 0.9); setImage(img);
      const { item } = await postPhoto<{ item: FoodItem }>({ image: img, mode: 'label' });
      const label = title.trim() || item.name;
      if (label) finish(item, label); else setRead(item); // only the table was in the photo: ask for the name
    } catch (e) { setError((e as Error).message); }
    setBusy(false);
  }
  return <>
    <label className="field"><span>Nome del prodotto{read ? '' : ' (se non si legge nella foto)'}</span><input value={title} maxLength={120} placeholder="Es. Biscotti al cacao Mulino Bianco" autoFocus={!!read} onChange={e => setTitle(e.target.value)} /></label>
    {read && <><p className="note">Valori letti: <b className="num">{fmt(read.kcal)}</b> kcal · P {read.p} · C {read.c} · G {read.f} per 100 g.</p>
      <button type="button" className="primary big" disabled={!title.trim()} onClick={() => finish(read, title.trim())}><Check size={18} /> Avanti</button></>}
    <label className="photodrop">
      <input type="file" accept="image/*" capture="environment" hidden onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) pick(f); }} />
      {image ? <img src={image} alt="Etichetta" /> : <span><FileText size={28} /><b>Fotografa la tabella nutrizionale</b><small>Da vicino, dritta, con buona luce e senza riflessi</small></span>}
    </label>
    {busy && <p className="note center"><span className="spinner" /> Leggo i valori…</p>}
    {error && <p className="formerror">{error}</p>}
  </>;
}
