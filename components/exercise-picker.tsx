'use client';
/* eslint-disable @next/next/no-img-element -- exercise photos come from the free-exercise-db repository */
import { useEffect, useMemo, useState } from 'react';
import { Search, Plus, Trash2, ChevronLeft, Info } from 'lucide-react';
import type { CatalogEntry } from '../lib/types';
import { loadCatalog, searchCatalog, equipmentList, groupNames, IMG } from '../lib/catalog';

/** Searchable exercise library (≈1,000 + the person's own), with filters by muscle and equipment, and "create your own". */
export function ExercisePicker({ custom, pick, create, remove }: { custom: CatalogEntry[]; pick: (e: CatalogEntry) => void; create: (e: Omit<CatalogEntry, 'id' | 'src' | 'c' | 'l' | 'mu'>) => boolean; remove: (id: string) => void }) {
  const [list, setList] = useState<CatalogEntry[] | null>(null);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [group, setGroup] = useState('');
  const [eq, setEq] = useState('');
  const [making, setMaking] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => { loadCatalog().then(setList).catch(e => setError((e as Error).message)); }, []);
  const all = useMemo(() => [...custom, ...(list ?? [])], [custom, list]);
  const found = useMemo(() => searchCatalog(all, q, { group, eq }), [all, q, group, eq]);
  if (making) return <CreateExercise back={() => setMaking(false)} save={e => { if (create(e)) setMaking(false); }} initialName={q} />;
  return <div className="xpicker">
    <label className="authfield search"><Search size={18} /><input autoFocus placeholder="Cerca: panca, squat multipower, curl…" value={q} onChange={e => setQ(e.target.value)} /></label>
    <div className="chiprow">{Object.entries(groupNames).map(([k, v]) => <button key={k} type="button" className={'chip' + (group === k ? ' on' : '')} onClick={() => setGroup(group === k ? '' : k)}>{v}</button>)}</div>
    <select className="select" value={eq} onChange={e => setEq(e.target.value)} aria-label="Attrezzo"><option value="">Tutti gli attrezzi</option>{equipmentList.map(x => <option key={x} value={x}>{x[0].toUpperCase() + x.slice(1)}</option>)}</select>
    <button type="button" className="ghost" onClick={() => setMaking(true)}><Plus size={16} /> Crea un esercizio tuo{q.trim() ? ` «${q.trim()}»` : ''}</button>
    {!list && !error && <p className="note center"><span className="spinner" /> Carico la libreria…</p>}
    {error && <p className="formerror">{error}</p>}
    {list && <p className="pickerlabel">{found.length === 60 ? 'Primi 60 risultati' : `${found.length} esercizi`}</p>}
    {found.map(e => <div className={'xrow' + (open === e.id ? ' open' : '')} key={e.id}>
      <button type="button" className="xmain" onClick={() => pick(e)}>
        <span className="grow"><b>{e.n}</b><small>{[e.eq, ...e.g.map(g => groupNames[g]?.toLowerCase())].filter(Boolean).join(' · ')}{e.src === 'custom' ? ' · tuo' : ''}</small></span>
      </button>
      {e.src === 'custom' && <button type="button" className="iconbtn small" aria-label={`Elimina ${e.n}`} onClick={() => { if (confirm(`Eliminare l’esercizio «${e.n}»?`)) remove(e.id); }}><Trash2 size={15} /></button>}
      {(e.s.length > 0 || e.img?.length) && <button type="button" className={'iconbtn small xinfo' + (open === e.id ? ' on' : '')} aria-label={`Come si fa: ${e.n}`} aria-expanded={open === e.id} onClick={() => setOpen(open === e.id ? null : e.id)}><Info size={17} /></button>}
      <button type="button" className="xadd" aria-label={`Aggiungi ${e.n}`} onClick={() => pick(e)}><Plus size={20} /></button>
      {open === e.id && <Technique e={e} />}
    </div>)}
  </div>;
}

export function Technique({ e }: { e: Pick<CatalogEntry, 'n' | 's' | 'img'> }) {
  return <div className="technique">
    {!!e.img?.length && <div className="xphotos">{e.img.slice(0, 2).map(src => <img key={src} src={IMG + src} alt={e.n} loading="lazy" />)}</div>}
    {e.s.length > 0 && <ol>{e.s.map((x, i) => <li key={i}>{x}</li>)}</ol>}
  </div>;
}

function CreateExercise({ back, save, initialName }: { back: () => void; save: (e: Omit<CatalogEntry, 'id' | 'src' | 'c' | 'l' | 'mu'>) => void; initialName: string }) {
  const [name, setName] = useState(initialName);
  const [eq, setEq] = useState('macchina');
  const [groups, setGroups] = useState<string[]>([]);
  const [unit, setUnit] = useState<'reps' | 'seconds'>('reps');
  const [notes, setNotes] = useState('');
  return <form className="xpicker" onSubmit={e => { e.preventDefault(); save({ n: name, eq, g: groups, unit, s: notes.split('\n').map(x => x.trim()).filter(Boolean) }); }}>
    <button type="button" className="ghost back" onClick={back}><ChevronLeft size={16} /> Libreria</button>
    <label className="field"><span>Nome</span><input required maxLength={80} value={name} onChange={e => setName(e.target.value)} placeholder="Es. Chest press convergente Technogym" /></label>
    <label className="field"><span>Attrezzo</span><select value={eq} onChange={e => setEq(e.target.value)}>{equipmentList.map(x => <option key={x} value={x}>{x[0].toUpperCase() + x.slice(1)}</option>)}</select></label>
    <div className="field"><span>Muscoli allenati (il principale per primo)</span>
      <div className="chiprow">{Object.entries(groupNames).map(([k, v]) => <button key={k} type="button" className={'chip' + (groups.includes(k) ? ' on' : '')} onClick={() => setGroups(g => g.includes(k) ? g.filter(x => x !== k) : [...g, k].slice(0, 4))}>{v}</button>)}</div></div>
    <div className="segmented full"><button type="button" aria-pressed={unit === 'reps'} onClick={() => setUnit('reps')}>Ripetizioni</button><button type="button" aria-pressed={unit === 'seconds'} onClick={() => setUnit('seconds')}>Secondi (tenute)</button></div>
    <label className="field"><span>Note di esecuzione (facoltative, una per riga)</span><textarea rows={3} maxLength={1200} value={notes} onChange={e => setNotes(e.target.value)} /></label>
    <button className="primary big" disabled={!name.trim() || !groups.length}><Plus size={18} /> Crea e aggiungi</button>
  </form>;
}
