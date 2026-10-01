'use client';
/* eslint-disable @next/next/no-img-element -- photos are local blob: URLs from IndexedDB, which next/image cannot optimise */
import { useEffect, useMemo, useState } from 'react';
import { Camera, Plus, Trash2, Pencil, Ruler, Scale, Dumbbell, Flame, ImageIcon } from 'lucide-react';
import type { AppState, Measurement, Pose } from '../lib/types';
import { poseNames } from '../lib/types';
import { history, bestE1rm } from '../lib/planner';
import { photoUrl, savePhoto, deletePhotos } from '../lib/photos';

type Metric = 'weight' | 'waist' | 'chest' | 'arm' | 'thigh' | 'hips';
const metricNames: Record<Metric, string> = { weight: 'Peso', waist: 'Vita', chest: 'Petto', arm: 'Braccio', thigh: 'Coscia', hips: 'Fianchi' };
const unitOf = (m: Metric) => (m === 'weight' ? 'kg' : 'cm');
const fmt = (x: number, d = 1) => x.toLocaleString('it-IT', { maximumFractionDigits: d });
const day = (iso: string) => new Date(iso.length === 10 ? iso + 'T12:00:00' : iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
const dayLong = (iso: string) => new Date(iso.length === 10 ? iso + 'T12:00:00' : iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' });
const today = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Rome' });

function usePhoto(key?: string) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let live = true, made: string | null = null;
    if (key) photoUrl(key).then(u => { made = u; if (live) setUrl(u); else if (u) URL.revokeObjectURL(u); });
    return () => { live = false; if (made) URL.revokeObjectURL(made); setUrl(null); };
  }, [key]);
  return url;
}
function Photo({ k, alt }: { k?: string; alt: string }) {
  const url = usePhoto(k);
  return url ? <img src={url} alt={alt} /> : <span className="nophoto"><ImageIcon size={22} /></span>;
}

/** Points of a metric over time; body weight also uses the morning weights of the check-ins. */
function series(s: AppState, m: Metric) {
  const pts = (s.measurements ?? []).filter(x => x[m] !== null).map(x => ({ date: x.date, v: x[m] as number }));
  if (m === 'weight') for (const c of s.checkins) if (c.weight !== null) pts.push({ date: c.date.slice(0, 10), v: c.weight });
  const byDay = new Map<string, number>();
  for (const p of pts.sort((a, b) => a.date.localeCompare(b.date))) byDay.set(p.date.slice(0, 10), p.v);
  return [...byDay].map(([date, v]) => ({ date, v }));
}

function Chart({ pts, unit }: { pts: { date: string; v: number }[]; unit: string }) {
  if (pts.length < 2) return <p className="note chartempty">{pts.length ? `Una misura: ${fmt(pts[0].v)} ${unit}. Dalla prossima vedi l’andamento.` : 'Ancora nessuna misura.'}</p>;
  const W = 640, H = 220, P = 28;
  const t0 = Date.parse(pts[0].date), t1 = Date.parse(pts.at(-1)!.date), span = Math.max(1, t1 - t0);
  const lo = Math.min(...pts.map(p => p.v)), hi = Math.max(...pts.map(p => p.v)), pad = Math.max(0.5, (hi - lo) * 0.15);
  const x = (d: string) => P + ((Date.parse(d) - t0) / span) * (W - 2 * P);
  const y = (v: number) => H - P - ((v - (lo - pad)) / (hi - lo + 2 * pad)) * (H - 2 * P);
  // 7-point moving average smooths daily water swings.
  const avg = pts.map((_, i) => { const w = pts.slice(Math.max(0, i - 3), i + 4); return w.reduce((t, p) => t + p.v, 0) / w.length; });
  const line = (vals: number[]) => vals.map((v, i) => `${i ? 'L' : 'M'}${x(pts[i].date).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  return <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Andamento da ${fmt(pts[0].v)} a ${fmt(pts.at(-1)!.v)} ${unit}`}>
    {[lo, (lo + hi) / 2, hi].map((v, i) => <g key={i}><line x1={P} x2={W - P} y1={y(v)} y2={y(v)} className="grid" /><text x={W - P} y={y(v) - 5} textAnchor="end" className="axis">{fmt(v)}</text></g>)}
    {pts.length >= 5 && <path d={line(avg)} className="avg" />}
    <path d={line(pts.map(p => p.v))} className="raw" />
    {pts.map((p, i) => <circle key={i} cx={x(p.date)} cy={y(p.v)} r={pts.length > 30 ? 2 : 4} className="dot" />)}
    <text x={P} y={H - 6} className="axis">{day(pts[0].date)}</text>
    <text x={W - P} y={H - 6} textAnchor="end" className="axis">{day(pts.at(-1)!.date)}</text>
  </svg>;
}

function Compare({ list }: { list: Measurement[] }) {
  const [pose, setPose] = useState<Pose>('front');
  const withPose = list.filter(m => m.photos[pose]);
  const [a, setA] = useState<string>(''), [b, setB] = useState<string>('');
  const [mode, setMode] = useState<'side' | 'slide'>('side');
  const [cut, setCut] = useState(50);
  const before = withPose.find(m => m.id === a) ?? withPose[0], after = withPose.find(m => m.id === b) ?? withPose.at(-1);
  const urlA = usePhoto(before?.photos[pose]), urlB = usePhoto(after?.photos[pose]);
  return <section className="panel block">
    <div className="sectionheading"><h2>Prima e dopo</h2>
      <div className="segmented">{(['front', 'side', 'back'] as Pose[]).map(x => <button key={x} type="button" aria-pressed={pose === x} onClick={() => setPose(x)}>{poseNames[x]}</button>)}</div></div>
    {withPose.length < 1 ? <p className="note">Aggiungi foto «{poseNames[pose].toLowerCase()}» alle misurazioni: qui le confronti nel tempo.</p> : <>
      <div className="comparepick">
        <label className="field"><span>Prima</span><select value={before?.id} onChange={e => setA(e.target.value)}>{withPose.map(m => <option key={m.id} value={m.id}>{day(m.date)}{m.weight ? ` · ${fmt(m.weight)} kg` : ''}</option>)}</select></label>
        <label className="field"><span>Dopo</span><select value={after?.id} onChange={e => setB(e.target.value)}>{withPose.map(m => <option key={m.id} value={m.id}>{day(m.date)}{m.weight ? ` · ${fmt(m.weight)} kg` : ''}</option>)}</select></label>
        <div className="segmented"><button type="button" aria-pressed={mode === 'side'} onClick={() => setMode('side')}>Affiancate</button><button type="button" aria-pressed={mode === 'slide'} onClick={() => setMode('slide')}>Scorri</button></div>
      </div>
      {mode === 'side' ? <div className="pair">
        <figure>{urlA ? <img src={urlA} alt="Prima" /> : <span className="nophoto" />}<figcaption>{before && day(before.date)}</figcaption></figure>
        <figure>{urlB ? <img src={urlB} alt="Dopo" /> : <span className="nophoto" />}<figcaption>{after && day(after.date)}</figcaption></figure>
      </div> : <div className="slider">
        {urlA && <img src={urlA} alt="Prima" />}
        {urlB && <img src={urlB} alt="Dopo" className="top" style={{ clipPath: `inset(0 0 0 ${cut}%)` }} />}
        <span className="divider" style={{ left: `${cut}%` }} />
        <input type="range" min={0} max={100} value={cut} onChange={e => setCut(Number(e.target.value))} aria-label="Confronto prima e dopo" />
        <small className="lbl l">{before && day(before.date)}</small><small className="lbl r">{after && day(after.date)}</small>
      </div>}
    </>}
  </section>;
}

export function Progress({ state: s, add, edit, remove }: { state: AppState; add: () => void; edit: (m: Measurement) => void; remove: (m: Measurement) => void }) {
  const [metric, setMetric] = useState<Metric>('weight');
  const list = s.measurements ?? [];
  const pts = useMemo(() => series(s, metric), [s, metric]);
  const delta = (m: Metric) => { const p = series(s, m); return p.length ? { last: p.at(-1)!.v, diff: p.length > 1 ? p.at(-1)!.v - p[0].v : null, since: p[0].date } : null; };
  const w = delta('weight'), wa = delta('waist');
  const strength = useMemo(() => {
    const names = new Set(s.logs.flatMap(l => l.results.map(r => r.name).filter(Boolean) as string[]));
    return [...names].map(name => {
      const h = history(s, name).map(x => ({ date: x.date, v: bestE1rm(x) })).filter((x): x is { date: string; v: number } => x.v !== null);
      return { name, h, change: h.length > 1 ? h.at(-1)!.v / h[0].v - 1 : 0 };
    }).filter(x => x.h.length >= 2).sort((a, b) => b.h.length - a.h.length).slice(0, 8);
  }, [s]);
  const height = s.profile?.height;
  const rfm = wa && height ? Math.round((s.profile?.sex === 'female' ? 76 : 64) - 20 * height / wa.last) : null;
  const sign = (x: number) => `${x > 0 ? '+' : ''}${fmt(x)}`;

  return <>
    <div className="pageheading"><div><div className="eyebrow">Progressi</div><h1>Come sta cambiando il tuo corpo.</h1><p>Misure ogni 1–2 settimane, sempre nelle stesse condizioni. Le foto restano solo su questo telefono.</p></div>
      <button className="primary" onClick={add}><Plus size={18} /> Nuova misurazione</button></div>
    <div className="stats">
      <div><Scale /><span>Peso</span><strong className="num">{w ? `${fmt(w.last)} kg` : '—'}</strong><small>{w?.diff != null ? `${sign(w.diff)} kg dal ${dayLong(w.since)}` : 'Aggiungi il peso del mattino'}</small></div>
      <div><Ruler /><span>Vita</span><strong className="num">{wa ? `${fmt(wa.last)} cm` : '—'}</strong><small>{wa?.diff != null ? `${sign(wa.diff)} cm dal ${dayLong(wa.since)}` : 'All’ombelico, a fine espirazione'}</small></div>
      <div><Flame /><span>Grasso stimato</span><strong className="num">{rfm ? `${rfm}%` : '—'}</strong><small>Dalla vita e dall’altezza: guarda la tendenza</small></div>
      <div><Dumbbell /><span>Forza</span><strong className="num">{strength.length ? `${sign(Math.round(strength.reduce((t, x) => t + x.change, 0) / strength.length * 1000) / 10)}%` : '—'}</strong><small>{strength.length ? `media su ${strength.length} esercizi` : 'Dopo due sedute dello stesso esercizio'}</small></div>
    </div>
    <section className="panel block">
      <div className="sectionheading"><h2>{metricNames[metric]}</h2>
        <div className="segmented scroll">{(Object.keys(metricNames) as Metric[]).map(m => <button key={m} type="button" aria-pressed={metric === m} onClick={() => setMetric(m)}>{metricNames[m]}</button>)}</div></div>
      <Chart pts={pts} unit={unitOf(metric)} />
      {metric === 'weight' && pts.length >= 5 && <p className="note">La linea chiara è la media mobile: il peso del singolo giorno oscilla per acqua e cibo.</p>}
    </section>
    <Compare list={list} />
    {strength.length > 0 && <section className="panel block"><h2>Forza stimata</h2><p className="note">Massimale stimato dalle tue serie (carico, ripetizioni e RIR).</p>
      <div className="lifts">{strength.map(x => {
        const lo = Math.min(...x.h.map(p => p.v)), hi = Math.max(...x.h.map(p => p.v)), sp = Math.max(1, hi - lo);
        return <div className="lift" key={x.name}><span>{x.name}</span>
          <svg viewBox="0 0 100 28" className="spark" aria-hidden><polyline points={x.h.map((p, i) => `${(i / (x.h.length - 1)) * 100},${26 - ((p.v - lo) / sp) * 24}`).join(' ')} /></svg>
          <strong className={'num ' + (x.change >= 0 ? 'up' : 'down')}>{sign(Math.round(x.change * 1000) / 10)}%</strong></div>;
      })}</div></section>}
    <section className="block">
      <div className="sectionheading"><h2>Storico</h2><small>{list.length} misurazioni</small></div>
      {!list.length && <div className="panel empty"><Camera size={28} /><p>Fai la prima misurazione oggi: peso, vita e tre foto. È il punto di partenza con cui confronterai tutto.</p><button className="primary" onClick={add}><Plus size={18} /> Inizia</button></div>}
      {[...list].reverse().map(m => <article className="mrow" key={m.id}>
        <div className="mdate"><strong>{day(m.date)}</strong><small>{new Date(m.date + 'T12:00:00').getFullYear()}</small></div>
        <div className="mvals">{(Object.keys(metricNames) as Metric[]).filter(k => m[k] !== null).map(k => <span key={k}><small>{metricNames[k]}</small><b className="num">{fmt(m[k] as number)}</b></span>)}{m.note && <p>{m.note}</p>}</div>
        <div className="thumbs">{(['front', 'side', 'back'] as Pose[]).filter(p => m.photos[p]).map(p => <Photo key={p} k={m.photos[p]} alt={poseNames[p]} />)}</div>
        <div className="mact"><button className="iconbtn" aria-label="Modifica" onClick={() => edit(m)}><Pencil size={16} /></button><button className="iconbtn" aria-label="Elimina" onClick={() => remove(m)}><Trash2 size={16} /></button></div>
      </article>)}
    </section>
  </>;
}

export function MeasureForm({ initial, save }: { initial: Measurement | null; save: (m: Omit<Measurement, 'id'> & { id?: string }) => Promise<void> | void }) {
  const [files, setFiles] = useState<Partial<Record<Pose, File | null>>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const n = (v: FormDataEntryValue | null) => (v === null || v === '' ? null : Number(String(v).replace(',', '.')));
  return <form onSubmit={async e => {
    e.preventDefault(); setBusy(true); setErr('');
    const d = new FormData(e.currentTarget);
    try {
      const photos = { ...(initial?.photos ?? {}) };
      const replaced: string[] = [];
      for (const pose of ['front', 'side', 'back'] as Pose[]) {
        const f = files[pose];
        if (f === null && photos[pose]) { replaced.push(photos[pose]!); delete photos[pose]; }
        if (f) { if (photos[pose]) replaced.push(photos[pose]!); photos[pose] = await savePhoto(f); }
      }
      await save({ id: initial?.id, date: String(d.get('date')), weight: n(d.get('weight')), waist: n(d.get('waist')), chest: n(d.get('chest')), arm: n(d.get('arm')), thigh: n(d.get('thigh')), hips: n(d.get('hips')), note: String(d.get('note') ?? ''), photos });
      if (replaced.length) await deletePhotos(replaced);
    } catch (x) { setErr((x as Error).message); setBusy(false); }
  }}>
    <div className="formgrid">
      <label className="field"><span>Data</span><input name="date" type="date" required defaultValue={initial?.date ?? today()} max={today()} /></label>
      <label className="field"><span>Peso (kg) · al mattino</span><input name="weight" type="number" inputMode="decimal" step="0.1" min={35} max={250} defaultValue={initial?.weight ?? ''} /></label>
      <label className="field"><span>Vita (cm) · all’ombelico</span><input name="waist" type="number" inputMode="decimal" step="0.5" min={40} max={200} defaultValue={initial?.waist ?? ''} /></label>
      <label className="field"><span>Petto (cm) · all’altezza dei capezzoli</span><input name="chest" type="number" inputMode="decimal" step="0.5" min={50} max={200} defaultValue={initial?.chest ?? ''} /></label>
      <label className="field"><span>Braccio (cm) · rilassato, punto più largo</span><input name="arm" type="number" inputMode="decimal" step="0.5" min={15} max={70} defaultValue={initial?.arm ?? ''} /></label>
      <label className="field"><span>Coscia (cm) · a metà</span><input name="thigh" type="number" inputMode="decimal" step="0.5" min={30} max={100} defaultValue={initial?.thigh ?? ''} /></label>
      <label className="field"><span>Fianchi (cm) · punto più largo dei glutei</span><input name="hips" type="number" inputMode="decimal" step="0.5" min={50} max={200} defaultValue={initial?.hips ?? ''} /></label>
    </div>
    <h3 className="formlabel">Foto</h3>
    <div className="photopick">{(['front', 'side', 'back'] as Pose[]).map(pose => {
      const f = files[pose];
      return <label key={pose} className="photoslot">
        <input type="file" accept="image/*" capture="environment" hidden onChange={e => { const file = e.target.files?.[0]; if (file) setFiles(v => ({ ...v, [pose]: file })); }} />
        {f ? <LocalPreview file={f} /> : f === null || !initial?.photos[pose] ? <span className="nophoto"><Camera size={22} /></span> : <Photo k={initial.photos[pose]} alt={poseNames[pose]} />}
        <span>{poseNames[pose]}</span>
        {(f || (f !== null && initial?.photos[pose])) && <button type="button" className="ghost" onClick={e => { e.preventDefault(); setFiles(v => ({ ...v, [pose]: null })); }}>Rimuovi</button>}
      </label>;
    })}</div>
    <details className="howto"><summary>Come ottenere misure e foto confrontabili</summary>
      <ul>
        <li>Al mattino, dopo il bagno e prima di mangiare.</li>
        <li>Metro aderente alla pelle senza stringere, a fine espirazione, sempre negli stessi punti.</li>
        <li>Foto con la stessa luce, nello stesso posto e alla stessa distanza; telefono all’altezza dell’ombelico, posa rilassata.</li>
        <li>Ogni 1–2 settimane basta: il cambiamento si vede nelle tendenze, non nel singolo giorno.</li>
      </ul></details>
    <label className="field"><span>Note (facoltative)</span><input name="note" maxLength={500} defaultValue={initial?.note ?? ''} placeholder="Es. dopo 3 giorni di viaggio" /></label>
    {err && <p className="formerror">{err}</p>}
    <button className="primary big" disabled={busy} style={{ marginTop: 14 }}>{busy ? 'Salvataggio…' : 'Salva misurazione'}</button>
  </form>;
}

function LocalPreview({ file }: { file: File }) {
  const url = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  return <img src={url} alt="Anteprima" />;
}
