'use client';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Check, Flame, Timer, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { AppState, CatalogEntry, Profile, Session, SetResult } from '../lib/types';
import { loadCatalog } from '../lib/catalog';
import { Technique } from './exercise-picker';
import { alternatives, howTo, suggest, history, rampSets, warmupFor, bestE1rm, e1rm, type Suggestion } from '../lib/planner';

function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="field"><span>{label}</span>{children}</label>; }
const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const nowMs = () => Date.now();
const kg = (x: number) => `${x.toLocaleString('it-IT')} kg`;
const rpeLabels: Record<number, string> = { 4: 'facile', 5: 'moderato', 6: 'impegnativo', 7: 'duro', 8: 'molto duro', 9: 'quasi al limite', 10: 'massimo' };

export default function Workout({ session: s, profile: p, state, deload, changeVariant, save }: { session: Session; profile: Profile; state: AppState; deload: boolean; changeVariant: (x: unknown) => unknown; save: (x: unknown) => unknown }) {
  const tips = useMemo(() => Object.fromEntries(s.exercises.map(e => [e.id, suggest(e, history(state, e.name), { deload })])) as Record<string, Suggestion>, [s, state, deload]);
  const [r, setR] = useState<SetResult[]>(() => s.exercises.flatMap(e => Array.from({ length: e.sets }, (_, i) => ({ exerciseId: e.id, set: i + 1, weight: tips[e.id]?.load ?? e.load, reps: 0, rir: null }))));
  const [recorded, setRecorded] = useState<Record<number, boolean>>({});
  // Best estimated max so far per exercise: a set that beats it is flagged as a personal record right away (immediate feedback helps performance).
  const best = useMemo(() => Object.fromEntries(s.exercises.map(e => [e.id, Math.max(0, ...history(state, e.name).map(x => bestE1rm(x, e.rir) ?? 0))])), [s, state]);
  const isPr = (x: SetResult, rir: number) => !!x.weight && x.reps > 0 && best[x.exerciseId] > 0 && e1rm(x.weight, x.reps, x.rir ?? rir) > best[x.exerciseId] * 1.005;
  const [complete, setComplete] = useState(true);
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [rest, setRest] = useState<{ until: number; total: number } | null>(null);
  const [now, setNow] = useState(nowMs);
  const [dur, setDur] = useState<string | null>(null);

  useEffect(() => { if (!running) return; const t = setInterval(() => setSeconds(x => x + 1), 1000); return () => clearInterval(t); }, [running]);
  useEffect(() => {
    if (!rest) return;
    const t = setInterval(() => {
      const n = nowMs(); setNow(n);
      if (n >= rest.until) { setRest(null); try { navigator.vibrate?.([200, 100, 200]); } catch { /* not supported */ } }
    }, 250);
    return () => clearInterval(t);
  }, [rest]);

  const strength = s.type === 'strength';
  const total = s.exercises.reduce((t, e) => t + e.sets, 0);
  const warm = strength ? warmupFor(s, p) : null;
  const missing = strength && complete && r.some((_, i) => !recorded[i]);
  const tick = (i: number, on: boolean, restSec: number) => {
    setRecorded(v => ({ ...v, [i]: on }));
    if (on) { const t = nowMs(); setRest({ until: t + restSec * 1000, total: restSec }); setNow(t); if (!running) setRunning(true); }
  };

  return <form className="workout" onSubmit={e => {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    save({ sessionId: s.id, duration: Number(d.get('duration')), rpe: Number(d.get('rpe')), pain: d.get('pain') === 'on', distance: d.get('distance') ? Number(d.get('distance')) : null, note: String(d.get('note') ?? ''), completed: complete, readiness: 3, actualRunMinutes: d.get('actualRunMinutes') ? Number(d.get('actualRunMinutes')) : null, results: r.filter((_, i) => recorded[i]) });
  }}>
    <div className="wtop">
      <span className="tag">{s.duration} min{strength ? ` · ${total} serie` : ''}{deload ? ' · scarico' : ''}</span>
      <button type="button" className="secondary" onClick={() => setRunning(!running)}><Timer size={16} /> {clock(seconds)} · {running ? 'Pausa' : 'Avvia'}</button>
    </div>
    {s.adaptation && <p className="adaptation">{s.adaptation}</p>}

    {warm && <section className="warmup">
      <h3><Flame size={18} /> Riscaldamento</h3>
      <ol>
        <li><b>{warm.general}</b></li>
        {warm.drills.map(x => <li key={x.name}>{x.name} <span>{x.dose}</span></li>)}
        <li>Poi le serie di avvicinamento indicate sui primi esercizi.</li>
      </ol>
    </section>}

    {!strength && <div className="phases">{s.phases.map((x, i) => <div key={i}><span>{String(i + 1).padStart(2, '0')}</span><div><h3>{x.label}</h3><p>{x.effort}</p></div><strong>{x.minutes}′</strong></div>)}</div>}

    {strength && s.exercises.map((e, ei) => {
      const tip = tips[e.id];
      const h = howTo(e.name);
      const alts = state.plan?.custom ? [] : alternatives(p, e);
      const firstOfPattern = e.role === 'main' && e.increment > 0 && (ei === 0 || s.exercises.slice(0, ei).every(x => x.family !== e.family)) && ei < 3;
      const ramp = firstOfPattern ? rampSets(e.name, tip.load, e.low) : [];
      const Icon = tip.kind === 'up' ? TrendingUp : tip.kind === 'down' ? TrendingDown : Minus;
      return <section className="exercise" key={e.id}>
        <div className="exhead">
          <span className="exnum num">{String(ei + 1).padStart(2, '0')}</span>
          <div><h3>{e.name}</h3><small className="num">{e.sets} × {e.low}–{e.high}{e.unit === 'seconds' ? ' s' : ''}{e.family === 'plyo' || e.unit === 'seconds' ? '' : ` · RIR ${e.rir}`} · recupero {e.rest >= 120 ? `${e.rest / 60}′` : `${e.rest}″`}</small></div>
        </div>
        <div className={'target ' + tip.kind}>
          <Icon size={18} />
          <div>
            <strong>{tip.load ? <>Oggi {kg(tip.load)} <span>· {tip.target}</span></> : tip.kind === 'start' && e.increment > 0 ? 'Prima volta: trova il carico' : `Obiettivo: ${tip.target}`}</strong>
            {tip.last && <small>Ultima volta: {tip.last}</small>}
            <small>{tip.why}</small>
          </div>
        </div>
        {ramp.length > 0 && <p className="ramp"><b>Avvicinamento</b> {ramp.join(' → ')}</p>}
        <div className="setheader"><span>Serie</span><span>Kg</span><span>{e.unit === 'seconds' ? 'Secondi' : 'Ripetizioni'}</span><span>RIR</span></div>
        {r.map((x, i) => x.exerciseId === e.id ? <div className={'setrow' + (recorded[i] ? ' done' : '') + (recorded[i] && isPr(x, e.rir) ? ' pr' : '')} key={i}>
          <label className="setcheck"><input aria-label={`${e.name} serie ${x.set} fatta`} type="checkbox" checked={!!recorded[i]} onChange={ev => tick(i, ev.target.checked, e.rest)} /><span>{x.set}</span></label>
          {(['weight', 'reps', 'rir'] as const).map(k => <input key={k} disabled={(k === 'weight' && e.increment === 0) || (k === 'rir' && (e.unit === 'seconds' || e.family === 'plyo'))} aria-label={`${e.name} serie ${x.set} ${k}`} type="number" inputMode="decimal" min={0} max={k === 'weight' ? 400 : k === 'reps' ? 300 : 10} step={k === 'weight' ? '.5' : '1'} placeholder={k === 'weight' ? (e.increment === 0 ? '—' : 'kg') : k === 'reps' ? String(e.high) : String(e.rir)} value={k === 'reps' && x.reps === 0 ? '' : x[k] ?? ''} onChange={ev => setR(a => a.map((v, j) => j === i ? { ...v, [k]: ev.target.value ? Number(ev.target.value) : k === 'reps' ? 0 : null } : (k === 'weight' && v.exerciseId === e.id && j > i && !recorded[j] ? { ...v, weight: ev.target.value ? Number(ev.target.value) : null } : v)))} />)}
        </div> : null)}
        {!h && e.catalogId && <details className="howto"><summary>Tecnica</summary><CatalogTechnique id={e.catalogId} own={state.customExercises ?? []} /></details>}
        {h && <details className="howto"><summary>Tecnica{alts.length > 1 ? ' e alternative' : ''}</summary>
          <p>{h.setup}</p>
          <ol>{h.steps.map((x, i) => <li key={i}>{x}</li>)}</ol>
          <p className="mistakes"><b>Evita:</b> {h.mistakes.join(' · ')}</p>
          {e.family !== 'core' && e.family !== 'plyo' && <p className="tempo">Discesa in 2–3 secondi{h.stretch ? ', un secondo di pausa in allungamento' : ''}, salita decisa.</p>}
          {alts.length > 1 && <Field label="Macchina occupata o non ti piace? Cambia esercizio"><select value={e.name} onChange={ev => { if (Object.values(recorded).some(Boolean) && !confirm('Cambiare esercizio azzera le serie non ancora salvate. Continuare?')) return; changeVariant({ sessionId: s.id, exerciseId: e.id, name: ev.target.value }); }}>{alts.map(n => <option key={n}>{n}</option>)}</select></Field>}
        </details>}
      </section>;
    })}

    {strength && s.phases.length > 2 && <div className="phases">{s.phases.slice(1, -1).map((x, i) => <div key={i}><span>+</span><div><h3>{x.label}</h3><p>{x.effort}</p></div><strong>{x.minutes}′</strong></div>)}</div>}

    <section className="finish">
      <h3>Com’è andata?</h3>
      <div className="formgrid">
        <Field label="Seduta"><select value={complete ? 'full' : 'partial'} onChange={e => setComplete(e.target.value === 'full')}><option value="full">Completa</option><option value="partial">Parziale</option></select></Field>
        <Field label="Durata (minuti)"><input name="duration" type="number" inputMode="numeric" min={1} max={240} required placeholder={String(s.duration)} value={dur ?? (seconds >= 60 ? String(Math.round(seconds / 60)) : '')} onChange={e => setDur(e.target.value)} /></Field>
        <Field label="Fatica complessiva"><select name="rpe" required defaultValue=""><option value="" disabled>Scegli</option>{[4, 5, 6, 7, 8, 9, 10].map(x => <option key={x} value={x}>{x} · {rpeLabels[x]}</option>)}</select></Field>
        {s.type === 'run' && <><Field label="Minuti di cardio fatti"><input name="actualRunMinutes" type="number" min={0} max={240} placeholder={String(s.runMinutes ?? '')} /></Field><Field label="Distanza km (facoltativa)"><input name="distance" type="number" min={0} max={100} step=".01" /></Field></>}
      </div>
      <label className="check"><input type="checkbox" name="pain" /> <span>Ho sentito dolore (non il normale bruciore)</span></label>
      <Field label="Note per il coach (facoltative)"><textarea name="note" maxLength={1000} placeholder="Es. panca: spalla un po’ rigida, squat facile" /></Field>
      {missing && <p className="note">Spunta tutte le serie, oppure scegli «Parziale».</p>}
      <button className="primary big" disabled={missing}>Salva <Check size={18} /></button>
    </section>

    {rest && <div className="resttimer" role="status">
      <span>Recupero</span><strong className="num">{clock(Math.max(0, Math.ceil((rest.until - now) / 1000)))}</strong>
      <span className="restbar"><span style={{ width: `${Math.max(0, Math.min(100, (rest.until - now) / (rest.total * 10)))}%` }} /></span>
      <button type="button" onClick={() => setRest({ until: rest.until + 30000, total: rest.total + 30 })}>+30″</button>
      <button type="button" onClick={() => setRest(null)}>Salta</button>
    </div>}
  </form>;
}

/** Technique and photos of a library or own exercise, loaded when opened. */
function CatalogTechnique({ id, own }: { id: string; own: CatalogEntry[] }) {
  const [e, setE] = useState<CatalogEntry | null | undefined>(() => own.find(x => x.id === id));
  useEffect(() => { if (e === undefined) loadCatalog().then(l => setE(l.find(x => x.id === id) ?? null)).catch(() => setE(null)); }, [e, id]);
  if (e === undefined) return <p className="note"><span className="spinner" /></p>;
  if (!e || (!e.s.length && !e.img?.length)) return <p className="note">Nessuna descrizione per questo esercizio.</p>;
  return <Technique e={e} />;
}
