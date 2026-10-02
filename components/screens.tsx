'use client';
import { type ReactNode } from 'react';
import { Dumbbell, Footprints, Utensils, ArrowUpRight, Check, Flame, ArrowRight, Sparkles } from 'lucide-react';
import { type Session, type Plan, type Profile, dayNames } from '../lib/types';
import { muscleNames, type NutritionPlan } from '../lib/planner';
import { Heading, Metric, TemperCurve } from './ui';

// Secondary screens of the app: plan reveal, programme, diet, check-in, welcome.
const typeClass = (s: Session) => (s.type === 'run' ? 'run' : 'strength');
const summaryLine = (s: Session) => s.type === 'run'
  ? `${s.runMinutes ?? '—'} min · RPE ${s.targetRpe ?? 4}`
  : `${s.exercises.length} esercizi · ${s.exercises.reduce((t, e) => t + e.sets, 0)} serie${s.phases.some(x => x.label.startsWith('Cardio')) ? ' · + cardio' : ''}`;

export function SessionCard({ s, done, open }: { s: Session; done: boolean; open: () => void }) {
  return <button className="sessioncard" onClick={open}>
    <span className={'typeicon ' + typeClass(s)}>{s.type === 'run' ? <Footprints size={20} /> : <Dumbbell size={20} />}</span>
    <span className="grow"><small>{dayNames[s.day]} · <span className="num">{s.duration} min</span></small><strong>{s.title}</strong><small>{summaryLine(s)}</small></span>
    {done ? <Check className="done-mark" aria-label="Fatto" /> : <ArrowUpRight size={18} />}
  </button>;
}

export function Reveal({ p, plan, n, close }: { p: Profile; plan: Plan; n: NutritionPlan; close: () => void }) {
  const bp = plan.blueprint!;
  const gym = plan.sessions.filter(x => x.type === 'strength');
  const split = gym.every(x => x.kind === 'full') ? 'Corpo intero' : gym.some(x => x.kind === 'push') ? 'Spinta · tirata · gambe' : 'Parte superiore / inferiore';
  return <section className="reveal">
    <div className="eyebrow"><Sparkles size={14} /> {p.goalAuto ? 'Obiettivo scelto dal coach in base ai tuoi dati' : 'Il piano che ti consiglio'}</div>
    <h1>{p.name}, ecco il tuo piano.</h1>
    <p className="lead">{bp.summary}</p>
    <div className="revealgrid">
      <div className="rcard strength"><Dumbbell /><span>Palestra</span><strong>{gym.length} × settimana</strong><small>{split} · fino a {p.minutes} min · blocchi di {bp.meso.length} settimane con scarico</small></div>
      <div className="rcard run"><Footprints /><span>Cardio e passi</span><strong>{bp.weekly.find(w => w.label === 'Cardio')?.value}</strong><small>{bp.cardioPlan}</small></div>
      {!n.blocked && n.average ? <div className="rcard food"><Utensils /><span>Dieta · {n.phaseLabel}</span><strong>{n.average.kcal} kcal</strong><small>{n.average.protein} g di proteine al giorno · {n.weeklyChange?.toLowerCase()}</small></div>
        : <div className="rcard food"><Utensils /><span>Dieta</span><strong>{n.phaseLabel}</strong><small>{n.reason}</small></div>}
      {n.bodyFat !== null && <div className="rcard deload"><Flame /><span>Grasso stimato</span><strong>{n.bodyFat.toLocaleString('it-IT')}%</strong><small>Dalla circonferenza vita: ricontrollala ogni 2 settimane.</small></div>}
    </div>
    {n.phaseReason && <div className="panel why"><h3>Perché questa fase</h3><p>{n.phaseReason}</p></div>}
    <button className="primary big" onClick={close}>Iniziamo <ArrowRight size={18} /></button>
  </section>;
}

export function Programme({ plan, card, onEdit, onBuild, onCoach, onNext }: { plan: Plan; card: (s: Session) => ReactNode; onEdit: () => void; onBuild: () => void; onCoach: () => void; onNext: () => void }) {
  const bp = plan.blueprint;
  const max = bp ? Math.max(...Object.values(bp.muscleSets), 1) : 1;
  return <>
    <Heading label={plan.custom ? `Il tuo piano · settimana ${plan.week}` : `Blocco ${plan.progress?.mesoCount ?? 1} · settimana ${plan.week}`} title="Il tuo allenamento." description={plan.custom ? 'Esercizi, serie e giorni scelti da te. Il coach ti suggerisce i carichi.' : bp?.summary ?? ''}>
      <button className="primary" onClick={onBuild}>{plan.custom ? 'Modifica il mio piano' : 'Crea il tuo piano'}</button>
      {plan.custom ? <button className="secondary" onClick={onCoach}>Piano del coach</button> : <button className="secondary" onClick={onEdit}>Modifica risposte</button>}
    </Heading>
    {bp && !plan.custom && <div className="metrics">{bp.weekly.map(w => <Metric key={w.label} label={w.label} value={w.value} />)}</div>}
    <div className="grid2">
      <section>
        <div className="sectionheading"><h2>Questa settimana</h2><small>{plan.sessions.length} allenamenti</small></div>
        {plan.sessions.map(card)}
        <button className="primary" onClick={onNext} style={{ marginTop: 8 }}>Chiudi la settimana e aggiorna</button>
      </section>
      {bp && !plan.custom && <section className="stack">
        <div className="sectionheading"><h2>Il blocco</h2><small>{bp.meso.label} · settimana {bp.meso.week} di {bp.meso.length}</small></div>
        <div className="panel dark"><TemperCurve meso={bp.meso} /></div>
        <div className="panel"><h2>Serie a settimana per muscolo</h2>
          <div className="musclebars">{Object.entries(bp.muscleSets).filter(([, v]) => v > 0).map(([m, v]) => <div className="musclebar" key={m}><span>{muscleNames[m as keyof typeof muscleNames]}</span><span className="track"><span style={{ width: `${(v / max) * 100}%` }} /></span><strong>{v}</strong></div>)}</div>
        </div>
        {plan.sessions.some(x => x.type === 'run') && <div className="panel"><h2>Intensità del cardio</h2>
          {bp.zones.slice(0, 2).map(z => <div className="zone" key={z.name}><strong>{z.name}</strong><span>{z.talk} · {z.rpe}</span><small>{z.hr ? `circa ${z.hr}` : ''}</small></div>)}
        </div>}
      </section>}
    </div>
  </>;
}

export function Diet({ n, dayKind, setDayKind, edit, personalise, diary }: { n: NutritionPlan & { customTargets?: boolean; customDay?: boolean }; dayKind: 'training' | 'rest'; setDayKind: (k: 'training' | 'rest') => void; edit: () => void; personalise: () => void; diary: ReactNode }) {
  if (n.blocked) return <><Heading label="Dieta" title="Alimentazione." description="" /><section className="panel notice"><h2>Piano alimentare non attivo</h2><p>{n.reason}</p><button className="primary" onClick={edit}>Modifica risposte</button></section></>;
  const meals = n.meals ? (dayKind === 'training' ? n.meals.training : n.meals.rest) : [];
  return <>
    <Heading label="Dieta" title={n.customTargets ? 'La tua dieta.' : `Fase: ${n.phaseLabel.toLowerCase()}.`} description={n.customTargets ? 'Calorie e macro scelte da te.' : n.weeklyChange ?? ''}>
      <button className="primary" onClick={personalise}>Personalizza</button>
      <button className="secondary" onClick={edit}>Modifica risposte</button>
    </Heading>
    {diary}
    {meals.length > 0 && <>
      <div className="sectionheading" style={{ marginTop: 28 }}><h2>Giornata tipo</h2>
        <div className="segmented"><button aria-pressed={dayKind === 'training'} onClick={() => setDayKind('training')}>Allenamento</button><button aria-pressed={dayKind === 'rest'} onClick={() => setDayKind('rest')}>Riposo</button></div></div>
      <div className="meals">{meals.map((meal, i) => <article className="meal" key={i}>
        <header><h3>{meal.name}</h3><small className="num">{meal.kcal} kcal · {meal.p} g proteine</small></header>
        <ul>{meal.items.map((it, k) => <li key={k}><b className="num">{it.grams} g</b><span>{it.food}</span></li>)}</ul>
      </article>)}</div>
    </>}
  </>;
}

export function CheckIn({ save }: { save: (v: unknown) => unknown }) {
  return <form onSubmit={e => { e.preventDefault(); const d = new FormData(e.currentTarget); save({ sleep: Number(d.get('sleep')), fatigue: Number(d.get('fatigue')), soreness: Number(d.get('soreness')), pain: d.get('pain') === 'on', note: String(d.get('note') ?? ''), weight: d.get('weight') ? Number(d.get('weight')) : null }); }}>
    <div className="formgrid">
      <label className="field"><span>Ore di sonno stanotte</span><input name="sleep" type="number" inputMode="decimal" min={0} max={16} step="0.5" defaultValue={7} required /></label>
      <label className="field"><span>Peso al mattino (kg)</span><input name="weight" type="number" inputMode="decimal" min={35} max={250} step="0.1" /><small>3–7 volte a settimana: conta la media.</small></label>
      <label className="field"><span>Fatica · 1 bassa, 5 alta</span><select name="fatigue" defaultValue={2}>{[1, 2, 3, 4, 5].map(x => <option key={x}>{x}</option>)}</select></label>
      <label className="field"><span>Indolenzimento · 1 basso, 5 alto</span><select name="soreness" defaultValue={2}>{[1, 2, 3, 4, 5].map(x => <option key={x}>{x}</option>)}</select></label>
    </div>
    <label className="check"><input name="pain" type="checkbox" /> <span>Ho dolore, diverso dal normale indolenzimento</span></label>
    <label className="field"><span>Note</span><textarea name="note" maxLength={1000} /></label>
    <button className="primary big" style={{ marginTop: 12 }}>Salva</button>
  </form>;
}

export function Welcome({ begin, cloud }: { begin: () => void; cloud: boolean }) {
  return <section className="welcome">
    <h1>Il coach che ti dice <em>cosa fare</em>, in palestra e a tavola.</h1>
    <p className="lead">Rispondi a qualche domanda: costruisco allenamento, cardio e dieta per dimagrire, ricomporti o mettere massa, e li adatto ogni settimana a come va davvero.</p>
    <button className="primary big" onClick={begin}>Crea il mio piano <ArrowRight size={18} /></button>
    <div className="welcomegrid">
      <div className="wcard strength"><Dumbbell /><h2>Palestra</h2><p>Serie, carichi e scarichi calibrati sul tuo livello e sul tempo che hai.</p></div>
      <div className="wcard run"><Footprints /><h2>Cardio e passi</h2><p>Solo quelli che servono al tuo obiettivo, quando non rubano recupero ai muscoli.</p></div>
      <div className="wcard food"><Utensils /><h2>Dieta</h2><p>La fase giusta, le calorie e una giornata tipo con alimenti e grammi.</p></div>
    </div>
    <small className="fine">Basato sugli studi scientifici più solidi su allenamento e nutrizione. {cloud ? 'I tuoi dati restano nel tuo account, su ogni dispositivo.' : 'Nessun account: i dati restano sul tuo telefono.'} Per adulti.</small>
  </section>;
}

/** Minimal formatting for coach replies: paragraphs, bullet lists and **bold**. */
