'use client';
import { useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Flame, Scale, Dumbbell, Trophy, HeartPulse, Sparkles, Building2, Home, PersonStanding, Footprints, Bike, Waves, Activity, Ship, Armchair, Hammer, Check } from 'lucide-react';
import { type Profile, type PainArea, type ScreeningFlag, type CardioMode, type Allergen, dayNames, painNames, screeningNames, allergenNames } from '../lib/types';
import { bodyFat, bandOf } from '../lib/planner';

export const defaults: Profile = {
  name: '', age: 25, sex: 'unspecified', weight: null, height: null, waist: null, goal: 'recomp', goalAuto: false, strengthLevel: 'new', runningLevel: 'new',
  days: [], minutes: 60, equipment: 'gym', recentRunMinutes: 0, recentLongest: 0, activity: 'low', diet: 'omnivore', restrictions: '', clinical: false,
  pain: false, nutritionConsent: true, strengthDays: 0, recentStrengthSessions: 0, focus: 'whole', exercisePreference: 'mixed', motivation: 'appearance',
  confidence: 3, stress: 2, barrier: 'none', coachStyle: 'supportive', goalDetail: '', screening: [], medicalClearance: false, painAreas: [], painCleared: false,
  event: 'none', nutritionPhase: 'auto', sleepHours: 7, longRunMinutes: 0, steps: 5500, cardio: [], mealsPerDay: 4, allergens: [], trainingTime: 'evening', dislikes: '',
};

type Opt<T> = { value: T; label: string; hint?: string; icon?: ReactNode };
function Cards<T extends string | number>({ options, value, onChange, cols = 2 }: { options: Opt<T>[]; value: T | undefined; onChange: (v: T) => void; cols?: number }) {
  const short = options.every(o => !o.hint && !o.icon && o.label.length <= 16);
  return <div className={`options cols-${cols}${short ? ' short' : ''}`} role="radiogroup">{options.map(o =>
    <button type="button" role="radio" aria-checked={value === o.value} key={String(o.value)} className={'option' + (value === o.value ? ' on' : '')} onClick={() => onChange(o.value)}>
      {o.icon && <span className="optionicon">{o.icon}</span>}<span className="optiontext"><strong>{o.label}</strong>{o.hint && <small>{o.hint}</small>}</span>{value === o.value && <Check className="tick" size={18} />}
    </button>)}</div>;
}
function Multi<T extends string>({ options, value, onChange }: { options: Opt<T>[]; value: T[]; onChange: (v: T[]) => void }) {
  return <div className="options cols-3">{options.map(o => {
    const on = value.includes(o.value);
    return <button type="button" aria-pressed={on} key={o.value} className={'option' + (on ? ' on' : '')} onClick={() => onChange(on ? value.filter(x => x !== o.value) : [...value, o.value])}>
      {o.icon && <span className="optionicon">{o.icon}</span>}<span className="optiontext"><strong>{o.label}</strong>{o.hint && <small>{o.hint}</small>}</span>{on && <Check className="tick" size={18} />}
    </button>;
  })}</div>;
}
function Chips<T extends string | number>({ options, value, onChange }: { options: Opt<T>[]; value: T | undefined; onChange: (v: T) => void }) {
  return <div className="chiprow">{options.map(o => <button type="button" key={String(o.value)} aria-pressed={value === o.value} className={'chip' + (value === o.value ? ' on' : '')} onClick={() => onChange(o.value)}>{o.label}</button>)}</div>;
}
function Q({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return <div className="q"><h3>{title}</h3>{hint && <p className="qhint">{hint}</p>}{children}</div>;
}
function NumberField({ label, value, onChange, min, max, step = 1, unit, placeholder }: { label: string; value: number | null | undefined; onChange: (v: number | null) => void; min: number; max: number; step?: number; unit: string; placeholder?: string }) {
  return <label className="numfield"><span>{label}</span><span className="numwrap"><input inputMode="decimal" type="number" min={min} max={max} step={step} placeholder={placeholder} value={value ?? ''} onChange={e => onChange(e.target.value === '' ? null : Number(e.target.value))} /><em>{unit}</em></span></label>;
}

const STEPS = ['Obiettivo', 'Il tuo corpo', 'Esperienza', 'Tempo', 'Fuori dalla palestra', 'Salute', 'Alimentazione', 'Come ti seguo'];

export function Questionnaire({ initial, busy, onSave, onCancel }: { initial: Profile; busy: boolean; onSave: (p: Profile) => unknown; onCancel?: () => void }) {
  const [p, setP] = useState<Profile>({ ...defaults, ...initial });
  const [step, setStep] = useState(0);
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setP(x => ({ ...x, [k]: v }));
  const bf = bodyFat(p), band = bandOf(p);
  const runs = (p.cardio ?? []).includes('run');
  const problems: string[] = [];
  if (step === 0 && !p.name.trim()) problems.push('Scrivi il tuo nome.');
  if (step === 1) {
    if (!p.age || p.age < 18 || p.age > 90) problems.push('Indica un’età tra 18 e 90 anni.');
    if (!p.height || p.height < 140 || p.height > 220) problems.push('Indica l’altezza in centimetri.');
    if (!p.weight || p.weight < 35 || p.weight > 250) problems.push('Indica il peso in chili.');
    if (p.waist && (p.waist < 50 || p.waist > 200)) problems.push('La circonferenza vita va in centimetri, tra 50 e 200.');
  }
  if (step === 3 && p.days.length < 2) problems.push('Scegli almeno 2 giorni.');
  if (step === 4 && runs && p.runningLevel !== 'new' && (!p.recentRunMinutes || !p.recentLongest || p.recentLongest > p.recentRunMinutes)) problems.push('Indica minuti di corsa a settimana e uscita più lunga (non può superare il totale).');
  const last = step === STEPS.length - 1;
  const next = () => { if (problems.length) return; if (last) onSave(p); else { setStep(step + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); } };

  return <div className="wizard">
    <div className="wizardtop">
      <div className="stepcount"><span>{step + 1}</span>/{STEPS.length} · {STEPS[step]}</div>
      <div className="progress" aria-hidden><span style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} /></div>
    </div>

    {step === 0 && <section className="wstep">
      <h2>Ciao! Come ti chiami?</h2>
      <input className="biginput" placeholder="Il tuo nome" value={p.name} maxLength={60} onChange={e => set('name', e.target.value)} autoFocus />
      <Q title="Cosa vuoi ottenere?" hint="La palestra è la base di tutto. Al resto — cardio, passi, dieta — penso io.">
        <Cards cols={2} value={p.goalAuto ? 'auto' : p.goal === 'balanced' ? 'recomp' : p.goal === 'running' ? 'health' : p.goal} onChange={v => setP(x => ({ ...x, goal: v === 'auto' ? 'recomp' : v as Profile['goal'], goalAuto: v === 'auto' }))} options={[
          { value: 'fat-loss', label: 'Dimagrire', hint: 'Perdere grasso tenendo i muscoli', icon: <Flame /> },
          { value: 'recomp', label: 'Ricomposizione', hint: 'Meno grasso e più muscolo insieme', icon: <Scale /> },
          { value: 'muscle', label: 'Mettere massa', hint: 'Più muscoli, con poco grasso', icon: <Dumbbell /> },
          { value: 'strength', label: 'Diventare più forte', hint: 'Carichi più alti sui fondamentali', icon: <Trophy /> },
          { value: 'health', label: 'Stare in forma', hint: 'Salute, energia, costanza', icon: <HeartPulse /> },
          { value: 'auto', label: 'Consigliami tu', hint: 'Decido io dai tuoi dati del corpo', icon: <Sparkles /> },
        ]} />
      </Q>
      <Q title="Vuoi aggiungere qualcosa con parole tue? (facoltativo)"><textarea className="bigtext" maxLength={400} value={p.goalDetail ?? ''} onChange={e => set('goalDetail', e.target.value)} placeholder="Esempio: perdere la pancia per l’estate senza perdere forza." /></Q>
    </section>}

    {step === 1 && <section className="wstep">
      <h2>Il punto di partenza</h2>
      <p className="lead">Servono per calorie, proteine e per capire quale fase di dieta ti conviene.</p>
      <Q title="Sesso"><Cards cols={3} value={p.sex} onChange={v => set('sex', v)} options={[{ value: 'male', label: 'Uomo' }, { value: 'female', label: 'Donna' }, { value: 'unspecified', label: 'Non indicato' }]} /></Q>
      <div className="numgrid">
        <NumberField label="Età" value={p.age} onChange={v => set('age', v ?? 0)} min={18} max={90} unit="anni" />
        <NumberField label="Altezza" value={p.height} onChange={v => set('height', v)} min={140} max={220} unit="cm" />
        <NumberField label="Peso" value={p.weight} onChange={v => set('weight', v)} min={35} max={250} step={0.1} unit="kg" />
        <NumberField label="Circonferenza vita" value={p.waist} onChange={v => set('waist', v)} min={50} max={200} step={0.5} unit="cm" placeholder="consigliata" />
      </div>
      <p className="tip">Vita: metro all’altezza dell’ombelico, in piedi, a fine espirazione, senza stringere. È il dato più utile per stimare il grasso.</p>
      {bf !== null && band && <div className={'readout ' + band}><span>Grasso corporeo stimato</span><strong>{bf.toLocaleString('it-IT')}%</strong><small>{band === 'lean' ? 'Basso' : band === 'ok' ? 'Nella norma' : band === 'high-ish' ? 'Un po’ alto' : 'Alto'} · stima dalla formula RFM, ±4%</small></div>}
    </section>}

    {step === 2 && <section className="wstep">
      <h2>La tua esperienza in palestra</h2>
      <Q title="Da quanto ti alleni con i pesi?"><Cards cols={3} value={p.strengthLevel} onChange={v => set('strengthLevel', v)} options={[
        { value: 'new', label: 'Inizio o riprendo', hint: 'Meno di 6 mesi regolari' },
        { value: 'intermediate', label: 'Con regolarità', hint: 'Da 6 mesi a 2 anni' },
        { value: 'experienced', label: 'Esperto', hint: 'Più di 2 anni, carichi alti' }]} /></Q>
      <Q title="Dove ti alleni?"><Cards cols={3} value={p.equipment} onChange={v => set('equipment', v)} options={[
        { value: 'gym', label: 'Palestra', hint: 'Macchine, bilancieri, cavi', icon: <Building2 /> },
        { value: 'dumbbells', label: 'Casa con manubri', icon: <Dumbbell /> },
        { value: 'bodyweight', label: 'Corpo libero', icon: <Home /> }]} /></Q>
      {p.equipment === 'gym' && <Q title="Preferisci"><Chips value={p.exercisePreference} onChange={v => set('exercisePreference', v)} options={[{ value: 'mixed', label: 'Un po’ di tutto' }, { value: 'machines', label: 'Macchine e cavi' }, { value: 'free', label: 'Pesi liberi' }]} /></Q>}
      <Q title="Muscoli a cui tieni di più"><Chips value={p.focus} onChange={v => set('focus', v)} options={[{ value: 'whole', label: 'Equilibrio' }, { value: 'upper', label: 'Parte superiore' }, { value: 'lower', label: 'Gambe e glutei' }]} /></Q>
      <Q title="Quante volte ti sei allenato a settimana nell’ultimo mese?"><Chips value={p.recentStrengthSessions ?? 0} onChange={v => set('recentStrengthSessions', v)} options={[0, 1, 2, 3, 4, 5].map(x => ({ value: x, label: x === 5 ? '5+' : String(x) }))} /></Q>
    </section>}

    {step === 3 && <section className="wstep">
      <h2>Quando puoi allenarti?</h2>
      <p className="lead">Scegli tutti i giorni liberi. Decido io quali sono di palestra e quali, se servono, di cardio.</p>
      <div className="daypick">{dayNames.map((d, i) => <button type="button" key={d} aria-pressed={p.days.includes(i)} className={p.days.includes(i) ? 'on' : ''} onClick={() => set('days', p.days.includes(i) ? p.days.filter(x => x !== i) : [...p.days, i].sort())}><small>{d.slice(0, 3)}</small></button>)}</div>
      <Q title="Quanto tempo hai per ogni allenamento?"><Chips value={p.minutes} onChange={v => set('minutes', v)} options={[30, 45, 60, 75, 90].map(x => ({ value: x, label: `${x} min` }))} /></Q>
      {p.days.length >= 2 && <Q title="Giorni di palestra" hint="Di solito è meglio lasciar decidere al coach in base all’obiettivo.">
        <select className="select" value={p.strengthDays ?? 0} onChange={e => set('strengthDays', Number(e.target.value))}><option value={0}>Decide il coach</option>{Array.from({ length: p.days.length }, (_, i) => i + 1).map(x => <option key={x} value={x}>{x} di palestra{p.days.length - x ? ` + ${p.days.length - x} di cardio` : ''}</option>)}</select>
      </Q>}
    </section>}

    {step === 4 && <section className="wstep">
      <h2>Fuori dalla palestra</h2>
      <p className="lead">Mi serve per stimare quanto consumi e per decidere cardio e passi.</p>
      <Q title="Il tuo lavoro o la tua giornata"><Cards cols={3} value={p.activity} onChange={v => set('activity', v)} options={[
        { value: 'low', label: 'Seduto', hint: 'Ufficio, studio', icon: <Armchair /> },
        { value: 'medium', label: 'In movimento', hint: 'In piedi, cammini spesso', icon: <PersonStanding /> },
        { value: 'high', label: 'Fisico', hint: 'Lavoro pesante', icon: <Hammer /> }]} /></Q>
      <Q title="Quanti passi fai in un giorno normale?" hint="Se hai uno smartwatch guarda la media della settimana."><Chips value={p.steps} onChange={v => set('steps', v)} options={[{ value: 3000, label: 'Meno di 4.000' }, { value: 5500, label: '4–7.000' }, { value: 8500, label: '7–10.000' }, { value: 11000, label: 'Più di 10.000' }]} /></Q>
      <Q title="Che cardio ti piace?" hint="Puoi sceglierne più di uno. Se non ne scegli, userò la camminata veloce.">
        <Multi value={p.cardio ?? []} onChange={v => set('cardio', v)} options={([['walk', 'Camminata', <Footprints key="w" />], ['run', 'Corsa', <Activity key="r" />], ['bike', 'Bici', <Bike key="b" />], ['elliptical', 'Ellittica', <PersonStanding key="e" />], ['swim', 'Nuoto', <Waves key="s" />], ['rower', 'Vogatore', <Ship key="o" />]] as [CardioMode, string, ReactNode][]).map(([value, label, icon]) => ({ value, label, icon }))} />
      </Q>
      {runs && <Q title="Con la corsa sei…"><Cards cols={3} value={p.runningLevel} onChange={v => set('runningLevel', v)} options={[{ value: 'new', label: 'All’inizio', hint: 'Parto alternando corsa e cammino' }, { value: 'regular', label: 'Corro già' }, { value: 'experienced', label: 'Corro da anni' }]} />
        {p.runningLevel !== 'new' && <div className="numgrid">
          <NumberField label="Corsa a settimana" value={p.recentRunMinutes} onChange={v => set('recentRunMinutes', v ?? 0)} min={0} max={600} unit="min" />
          <NumberField label="Uscita più lunga" value={p.recentLongest} onChange={v => set('recentLongest', v ?? 0)} min={0} max={180} unit="min" />
        </div>}
      </Q>}
    </section>}

    {step === 5 && <section className="wstep">
      <h2>Salute e recupero</h2>
      <p className="lead">Domande del questionario PAR-Q+. Una risposta positiva non ti esclude: decide quanto intenso può essere il piano.</p>
      <Q title="Qualcosa di questo ti riguarda?">
        <div className="checks">{(Object.keys(screeningNames) as ScreeningFlag[]).map(k => <label className="check" key={k}><input type="checkbox" checked={(p.screening ?? []).includes(k)} onChange={() => set('screening', (p.screening ?? []).includes(k) ? (p.screening ?? []).filter(x => x !== k) : [...(p.screening ?? []), k])} /><span>{screeningNames[k]}</span></label>)}
          <label className="check"><input type="checkbox" checked={p.clinical} onChange={e => set('clinical', e.target.checked)} /><span>Altre condizioni cliniche o disturbi alimentari seguiti da un professionista</span></label></div>
        {((p.screening ?? []).length > 0 || p.clinical) && <label className="check strong"><input type="checkbox" checked={!!p.medicalClearance} onChange={e => set('medicalClearance', e.target.checked)} /><span>Il medico mi ha autorizzato ad allenarmi</span></label>}
      </Q>
      <Q title="Hai dolore o un infortunio adesso?"><Chips value={p.pain ? 'yes' : 'no'} onChange={v => set('pain', v === 'yes')} options={[{ value: 'no', label: 'No' }, { value: 'yes', label: 'Sì' }]} />
        {p.pain && <><div className="chiprow" style={{ marginTop: 10 }}>{(Object.keys(painNames) as PainArea[]).map(k => <button type="button" key={k} aria-pressed={(p.painAreas ?? []).includes(k)} className={'chip' + ((p.painAreas ?? []).includes(k) ? ' on' : '')} onClick={() => set('painAreas', (p.painAreas ?? []).includes(k) ? (p.painAreas ?? []).filter(x => x !== k) : [...(p.painAreas ?? []), k])}>{painNames[k]}</button>)}</div>
          <label className="check strong"><input type="checkbox" checked={!!p.painCleared} onChange={e => set('painCleared', e.target.checked)} /><span>Un professionista mi ha detto che posso allenarmi rispettando la zona</span></label></>}
      </Q>
      <Q title="Quanto dormi di solito?"><Chips value={p.sleepHours} onChange={v => set('sleepHours', v)} options={[5, 6, 7, 8, 9].map(x => ({ value: x, label: x === 5 ? '5 o meno' : x === 9 ? '9+' : `${x} ore` }))} /></Q>
      <Q title="Quanto stress hai nella vita di tutti i giorni?"><Chips value={p.stress} onChange={v => set('stress', v)} options={[{ value: 1, label: 'Poco' }, { value: 2, label: 'Normale' }, { value: 3, label: 'Abbastanza' }, { value: 4, label: 'Tanto' }, { value: 5, label: 'Troppo' }]} /></Q>
    </section>}

    {step === 6 && <section className="wstep">
      <h2>Alimentazione</h2>
      <label className="toggle"><input type="checkbox" checked={p.nutritionConsent} onChange={e => set('nutritionConsent', e.target.checked)} /><span><strong>Voglio il piano alimentare</strong><small>Calorie, macronutrienti e giornata tipo con alimenti e grammi</small></span></label>
      {p.nutritionConsent && <>
        <Q title="Come mangi?"><Cards cols={3} value={p.diet} onChange={v => set('diet', v)} options={[{ value: 'omnivore', label: 'Di tutto' }, { value: 'vegetarian', label: 'Vegetariano' }, { value: 'vegan', label: 'Vegano' }]} /></Q>
        <Q title="Allergie o intolleranze"><div className="chiprow">{(Object.keys(allergenNames) as Allergen[]).map(k => <button type="button" key={k} aria-pressed={(p.allergens ?? []).includes(k)} className={'chip' + ((p.allergens ?? []).includes(k) ? ' on' : '')} onClick={() => set('allergens', (p.allergens ?? []).includes(k) ? (p.allergens ?? []).filter(x => x !== k) : [...(p.allergens ?? []), k])}>{allergenNames[k]}</button>)}</div></Q>
        <Q title="Quanti pasti preferisci fare?"><Chips value={p.mealsPerDay} onChange={v => set('mealsPerDay', v)} options={[3, 4, 5].map(x => ({ value: x, label: `${x} pasti` }))} /></Q>
        <Q title="Di solito ti alleni…"><Chips value={p.trainingTime} onChange={v => set('trainingTime', v)} options={[{ value: 'morning', label: 'Al mattino' }, { value: 'midday', label: 'In pausa pranzo' }, { value: 'evening', label: 'Pomeriggio o sera' }]} /></Q>
        <Q title="Cibi che non mangi o non ti piacciono"><input className="bigtext single" value={p.dislikes ?? ''} maxLength={400} onChange={e => set('dislikes', e.target.value)} placeholder="Esempio: salmone, tofu, farro" /></Q>
        <Q title="Fase della dieta" hint="Consigliato: lascia decidere al coach in base a obiettivo e grasso corporeo."><select className="select" value={p.nutritionPhase ?? 'auto'} onChange={e => set('nutritionPhase', e.target.value as Profile['nutritionPhase'])}><option value="auto">Decide il coach</option><option value="cut">Definizione</option><option value="recomp">Ricomposizione</option><option value="maintain">Mantenimento</option><option value="gain">Massa</option></select></Q>
      </>}
    </section>}

    {step === 7 && <section className="wstep">
      <h2>Come preferisci essere seguito?</h2>
      <Q title="Cosa ti motiva di più?"><Cards cols={2} value={p.motivation} onChange={v => set('motivation', v)} options={[{ value: 'appearance', label: 'Vedermi cambiare' }, { value: 'performance', label: 'Diventare più bravo' }, { value: 'health', label: 'Stare bene' }, { value: 'enjoyment', label: 'Divertirmi' }]} /></Q>
      <Q title="Cosa ti ha fermato in passato?"><Chips value={p.barrier} onChange={v => set('barrier', v)} options={[{ value: 'none', label: 'Niente in particolare' }, { value: 'time', label: 'Poco tempo' }, { value: 'fatigue', label: 'Stanchezza' }, { value: 'boredom', label: 'Noia' }]} /></Q>
      <Q title="Che tipo di coach vuoi?"><Cards cols={3} value={p.coachStyle} onChange={v => set('coachStyle', v)} options={[{ value: 'supportive', label: 'Incoraggiante' }, { value: 'direct', label: 'Diretto' }, { value: 'technical', label: 'Tecnico', hint: 'Con numeri e dati' }]} /></Q>
      <Q title="Quanto sei sicuro di riuscire a seguire il piano?"><Chips value={p.confidence} onChange={v => set('confidence', v)} options={[1, 2, 3, 4, 5].map(x => ({ value: x, label: ['Poco', 'Così così', 'Abbastanza', 'Molto', 'Al 100%'][x - 1] }))} /></Q>
    </section>}

    {problems.length > 0 && <p className="formerror" role="alert">{problems[0]}</p>}
    <div className="wizardnav">
      {step > 0 ? <button type="button" className="secondary" onClick={() => setStep(step - 1)}><ArrowLeft size={18} /> Indietro</button> : onCancel ? <button type="button" className="secondary" onClick={onCancel}>Annulla</button> : <span />}
      <button type="button" className="primary big" disabled={busy || problems.length > 0} onClick={next}>{last ? (busy ? 'Preparo il piano…' : 'Crea il mio piano') : 'Avanti'} {!last && <ArrowRight size={18} />}</button>
    </div>
  </div>;
}
