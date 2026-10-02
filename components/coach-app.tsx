'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Footprints, MessageCircle, Utensils, CalendarDays, Gauge, UserRound, Plus, ShieldCheck, Download, Upload, Trash2, Moon, Activity, ArrowRight, ChartLine, SendHorizontal, Eraser, LogOut } from 'lucide-react';
import { type AppState, type Session, type Decision, type Profile, type Measurement, emptyState, dayNames, goalNames } from '../lib/types';
import { nutrition, activityFrom, coreGoal, weeklySummary } from '../lib/planner';
import { load, save, apply, clearLocal, type Action } from '../lib/store';
import Workout from './workout';
import { Questionnaire, defaults } from './questionnaire';
import { Modal } from './modal';
import { FoodDiary } from './food/diary';
import { Reminders } from './reminders';
import { registerWorker } from '../lib/push';
import { watchErrors } from '../lib/report';
import { Login } from './login';
import { supabase, loadRemote, pushRemote, pullRemote, onRemoteChange, deleteRemote, accessToken } from '../lib/supabase';
import { merge } from '../lib/merge';
import { Progress, MeasureForm } from './progress';
import { buildContext, evidenceFor } from '../lib/context';
import { answer } from '../lib/coach';
import { clearPhotos, deletePhotos } from '../lib/photos';
import { Brand, Heading, MacroRow, Rich, TemperCurve } from './ui';
import { SessionCard, Reveal, Programme, Diet, CheckIn, Welcome } from './screens';
const tabs = [['home', 'Oggi', Gauge], ['plan', 'Allenamento', CalendarDays], ['progress', 'Progressi', ChartLine], ['food', 'Dieta', Utensils], ['chat', 'Coach', MessageCircle]] as const;

function todayIndex() {
  const w = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'Europe/Rome' }).format(new Date());
  return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(w);
}
const typeClass = (s: Session) => (s.type === 'run' ? 'run' : 'strength');

export default function CoachApp() {
  const [s, setRaw] = useState<AppState>(() => load());
  const [tab, setTab] = useState('home');
  const [error, setError] = useState('');
  const [edit, setEdit] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [chat, setChat] = useState('');
  const [check, setCheck] = useState(false);
  const [review, setReview] = useState<Decision[] | null>(null);
  const [welcome, setWelcome] = useState(true);
  const [reveal, setReveal] = useState(false);
  const [dayKind, setDayKind] = useState<'training' | 'rest'>('training');
  const [measure, setMeasure] = useState<Measurement | 'new' | null>(null);
  const [pending, setPending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  // Login: 'off' when Supabase is not configured (data stays on the device), otherwise the session decides.
  const [auth, setAuth] = useState<'checking' | 'out' | 'in' | 'off'>(supabase ? 'checking' : 'off');
  const [email, setEmail] = useState('');
  const [recovery, setRecovery] = useState(false);
  const uid = useRef<string | null>(null);

  const persist = (next: AppState) => { save(next); if (uid.current) pushRemote(uid.current, next); };
  const setS = (next: AppState) => { setRaw(next); try { persist(next); } catch (e) { setError((e as Error).message); } };
  const update = (fn: (prev: AppState) => AppState) => setRaw(prev => { const next = fn(prev); try { persist(next); } catch { /* reported on the next action */ } return next; });

  useEffect(() => { registerWorker(); watchErrors(); }, []);
  useEffect(() => {
    if (!supabase) return;
    let live = true;
    // On sign-in this device's copy is merged with the cloud copy (unless the device belonged to someone else).
    const signedIn = async (id: string, mail: string) => {
      if (uid.current === id) return;
      uid.current = id;
      setEmail(mail);
      try {
        const remote = await loadRemote(id);
        const owner = localStorage.getItem('tempra-owner');
        const local = owner && owner !== id ? emptyState() : load();
        // Both copies count: what was done on this device while offline is merged with the cloud copy.
        const next = remote ? merge(local, { ...emptyState(), ...remote }) : local;
        if (!live) return;
        setRaw(next); save(next);
        if (next.profile) pushRemote(id, next);
        localStorage.setItem('tempra-owner', id);
      } catch (e) { setError((e as Error).message); }
      if (live) setAuth('in');
    };
    supabase.auth.getSession().then(({ data }) => { if (!live) return; if (data.session) signedIn(data.session.user.id, data.session.user.email ?? ''); else setAuth('out'); });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
      if (session) signedIn(session.user.id, session.user.email ?? '');
      else if (event === 'SIGNED_OUT') { uid.current = null; setAuth('out'); }
    });
    onRemoteChange(merged => setRaw(prev => { const next = merge(prev, merged); try { save(next); } catch { /* storage full: kept in memory */ } return next; }));
    return () => { live = false; sub.subscription.unsubscribe(); onRemoteChange(null); };
  }, []);
  // Coming back to the app: pick up what was logged on another device.
  const latest = useRef(s);
  useEffect(() => { latest.current = s; }, [s]);
  useEffect(() => {
    const back = () => { if (document.visibilityState === 'visible' && uid.current) pullRemote(uid.current, latest.current); };
    document.addEventListener('visibilitychange', back);
    return () => document.removeEventListener('visibilitychange', back);
  }, []);

  async function logout() {
    if (!confirm('Uscire dall’account? I tuoi dati restano salvati nel cloud.')) return;
    await supabase?.auth.signOut();
    uid.current = null;
    clearLocal(); await clearPhotos();
    setRaw(emptyState()); setEdit(false); setWelcome(true); setTab('home'); setAuth('out');
  }
  useEffect(() => { if (tab === 'chat') endRef.current?.scrollIntoView({ block: 'end' }); }, [tab, s.messages.length, pending]);

  /** Ask the coach: Gemini on the server with the person's data and the relevant evidence; local rules if the AI is not configured. */
  async function ask(q: string) {
    const text = q.trim();
    if (!text || pending) return;
    setError('');
    let base: AppState;
    try { base = apply(s, { type: 'message', data: { role: 'user', text } }); } catch (e) { setError((e as Error).message); return; }
    setS(base); setChat(''); setPending(true);
    let reply: { text: string; mode: string } | null = null;
    try {
      const token = await accessToken();
      const res = await fetch('/api/coach', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ messages: base.messages.slice(-16).map(m => ({ role: m.role, text: m.text })), context: buildContext(base), evidence: evidenceFor(text) }) });
      const data = await res.json().catch(() => ({})) as { text?: string; error?: string };
      if (res.ok && data.text) reply = { text: data.text, mode: 'ai' };
      else if (res.status === 503 || res.status === 404) reply = { text: answer(text, base).text, mode: 'local' };
      else setError(data.error ?? 'Il coach non ha risposto. Riprova.');
    } catch { reply = { text: answer(text, base).text, mode: 'local' }; }
    if (reply) { const r = reply; update(prev => apply(prev, { type: 'message', data: { role: 'assistant', text: r.text, mode: r.mode } })); }
    setPending(false);
  }

  function act(action: Action) {
    setError('');
    try {
      const next = apply(s, action);
      setS(next);
      if (action.type === 'log') setReview(next.logs.at(-1)?.feedback ?? []);
      if (action.type === 'variant' && session) setSession(next.plan?.sessions.find(v => v.id === session.id) ?? null);
      return true;
    } catch (e) { setError(e instanceof Error ? e.message : 'Operazione non riuscita.'); return false; }
  }
  function importData(file: File) {
    file.text().then(t => { const x = JSON.parse(t) as AppState; if (!x || typeof x !== 'object' || !('logs' in x)) throw Error(); setS({ ...emptyState(), ...x }); setEdit(false); }).catch(() => setError('File non valido: usa un file esportato da Tempra.'));
  }

  const p = s.profile, plan = s.plan, bp = plan?.blueprint;
  const logs = s.logs.filter(x => plan?.sessions.some(y => y.id === x.sessionId) && x.week === plan.week);
  const doneIds = new Set(logs.filter(x => x.completed !== false).map(x => x.sessionId));
  const today = todayIndex();
  const next = plan?.sessions.filter(x => !doneIds.has(x.id)).sort((a, b) => ((a.day - today + 7) % 7) - ((b.day - today + 7) % 7))[0];
  const n = p ? nutrition(p, activityFrom(p, plan), s.tdee) : null;
  const todayTraining = !!plan?.sessions.some(x => x.day === today);
  const modal = (title: string, body: ReactNode, close: () => void) => <Modal title={title} close={close}>{error && <div className="error" role="alert">{error}</div>}{body}</Modal>;
  const save1 = (v: Profile) => { if (act({ type: 'profile', data: v })) { setEdit(false); setReveal(true); setTab('home'); } };

  if (auth === 'checking') return <div className="boot"><span className="bootmark" /></div>;
  if (auth === 'out' || recovery) return <Login recovery={recovery} done={() => setRecovery(false)} />;

  // First run: welcome, then questionnaire.
  if (!p) return <div className="onboarding">
    <header className="obhead"><Brand /></header>
    {welcome ? <Welcome cloud={auth === 'in'} begin={() => setWelcome(false)} /> : <Questionnaire initial={defaults} busy={false} onSave={save1} onCancel={() => setWelcome(true)} />}
    {error && <div className="error floating" role="alert">{error}</div>}
  </div>;

  return <div className="app">
    <aside>
      <Brand />
      <nav>{tabs.map(([key, label, Icon]) => <button key={key} className={tab === key ? 'active' : ''} aria-current={tab === key ? 'page' : undefined} onClick={() => { setTab(key); window.scrollTo({ top: 0 }); }}><Icon size={20} /><span>{label}</span></button>)}</nav>
      <div className="sidefoot"><button onClick={() => setEdit(true)}><UserRound size={18} /> {p.name}</button></div>
    </aside>
    <div className="workspace">
      <div className="mobilebar"><Brand /><button className="iconbtn" onClick={() => setEdit(true)} aria-label="Profilo"><UserRound size={20} /></button></div>
      <main>
        {error && !edit && !session && !check && <div className="error" role="alert">{error}<button onClick={() => setError('')}>Chiudi</button></div>}
        {plan?.blocked && <section className="panel notice"><div className="eyebrow"><ShieldCheck size={14} /> Sicurezza</div><h2>Il piano aspetta il via libera</h2>{plan.notes.map((x, i) => <p key={i}>{x}</p>)}<button className="primary" onClick={() => setEdit(true)}>Aggiorna le risposte</button></section>}

        {reveal && plan && !plan.blocked && bp && n && <Reveal p={p} plan={plan} n={n} close={() => setReveal(false)} />}

        {!reveal && tab === 'home' && plan && !plan.blocked && <>
          <Heading label={`Settimana ${plan.week} · ${bp?.meso.label.toLowerCase() ?? ''}`} title={`Ciao, ${p.name}.`} description={`${goalNames[coreGoal(p)]} · ${doneIds.size} di ${plan.sessions.length} allenamenti fatti questa settimana.`}>
            <button className="secondary" onClick={() => setCheck(true)}><Plus size={16} /> Come stai oggi</button>
          </Heading>
          <section className="today">
            <div className={'main ' + (next ? (bp?.meso.deload ? 'deload' : typeClass(next)) : '')}>
              {next ? <>
                <div className="eyebrow">{next.day === today ? 'Oggi' : `Prossimo · ${dayNames[next.day]}`}</div>
                <h2>{next.title}</h2>
                <div className="facts">
                  <div><strong>{next.duration}′</strong><small>durata</small></div>
                  {next.type === 'strength' ? <div><strong>{next.exercises.reduce((t, e) => t + e.sets, 0)}</strong><small>serie</small></div> : <div><strong>{next.runMinutes}′</strong><small>di cardio</small></div>}
                  <div><strong>{next.targetRpe ?? '—'}</strong><small>sforzo / 10</small></div>
                </div>
                <ul className="preview">{next.type === 'strength'
                  ? next.exercises.map(e => <li key={e.id}><span>{e.name}</span><span>{e.sets}×{e.low}–{e.high}{e.unit === 'seconds' ? 's' : ''}</span></li>)
                  : next.phases.map((x, i) => <li key={i}><span>{x.label}</span><span>{x.minutes}′</span></li>)}</ul>
                <button className="primary big" onClick={() => setSession(next)}>Inizia l’allenamento <ArrowRight size={18} /></button>
              </> : <><div className="eyebrow">Settimana completata</div><h2>Tutto fatto. Ottimo lavoro.</h2><p>Chiudi la settimana: aggiorno serie, cardio e passi in base a com’è andata.</p><button className="primary" onClick={() => setTab('plan')}>Vai all’allenamento</button></>}
            </div>
            <div className="side">
              <div className="eyebrow">Il tuo blocco</div>
              {bp && <TemperCurve meso={bp.meso} />}
              <p>{bp ? `Settimana ${bp.meso.week} di ${bp.meso.length}: il carico sale e l’ultima settimana scarichi.` : ''}</p>
            </div>
          </section>
          {bp?.habits && <section className="habits">{bp.habits.map((h, i) => <div key={h.label} className="habit"><span className="habiticon">{[<Footprints key="a" />, <Moon key="b" />, <Utensils key="c" />, <Activity key="d" />][i]}</span><div><strong>{h.value}</strong><span>{h.label}</span><small>{h.detail}</small></div></div>)}</section>}
          <section className="block">
            <div className="sectionheading"><h2>La tua settimana</h2><button className="ghost" onClick={() => setTab('plan')}>Dettagli ↗</button></div>
            <div className="lanes">{dayNames.map((d, i) => {
              const x = plan.sessions.find(y => y.day === i);
              return x ? <button key={d} className={`lane ${typeClass(x)} ${doneIds.has(x.id) ? 'done' : ''} ${i === today ? 'today-lane' : ''}`} onClick={() => setSession(x)}><small>{d.slice(0, 3).toUpperCase()}</small><strong>{x.title}</strong><span className="min">{doneIds.has(x.id) ? '✓ fatto' : `${x.duration}′`}</span></button>
                : <div key={d} className={`lane rest ${i === today ? 'today-lane' : ''}`}><small>{d.slice(0, 3).toUpperCase()}</small><strong>Riposo</strong><span className="min">cammina</span></div>;
            })}</div>
          </section>
          <div className="grid2">
            {n && !n.blocked && n.training && n.rest && <section className="panel foodsnap"><div className="eyebrow">Dieta di oggi · {todayTraining ? 'giorno di allenamento' : 'giorno di riposo'}</div>
              <MacroRow m={todayTraining ? n.training : n.rest} />
              <button className="ghost" onClick={() => setTab('food')}>Vedi cosa mangiare ↗</button></section>}
            <section className="panel"><div className="eyebrow">La settimana in breve</div>
              <ul className="weekly">{weeklySummary(s, n).map(x => <li key={x.label}><p><strong>{x.label}.</strong> {x.text}</p></li>)}</ul>
              <button className="secondary" onClick={() => setTab('chat')}><MessageCircle size={16} /> Chiedi al coach</button>
            </section>
          </div>
          <section className="panel block"><div className="sectionheading"><h2>Diario</h2><small>{s.logs.length} allenamenti</small></div>
            {s.logs.length ? s.logs.slice(-6).reverse().map(l => <div className="decision" key={l.id}><strong>{l.title}</strong><br /><small className="num">{new Date(l.date).toLocaleDateString('it-IT')} · {l.duration} min · sforzo {l.rpe}/10{l.completed === false ? ' · parziale' : ''}{l.pain ? ' · dolore' : ''}</small>{l.note && <p>{l.note}</p>}{l.feedback && <button className="ghost" onClick={() => setReview(l.feedback!)}>Cosa ne pensa il coach ↗</button>}</div>)
              : <p>Qui trovi ogni allenamento registrato. Il primo serve a calibrare i carichi.</p>}
          </section>
        </>}

        {!reveal && tab === 'plan' && plan && !plan.blocked && <Programme plan={plan} card={x => <SessionCard key={x.id} s={x} done={doneIds.has(x.id)} open={() => setSession(x)} />} onEdit={() => setEdit(true)} onNext={() => { if (confirm('Chiudere la settimana? Serie, cardio e passi si aggiornano in base agli allenamenti registrati.')) act({ type: 'week' }); }} />}

        {!reveal && tab === 'food' && p && n && <Diet n={n} dayKind={dayKind} setDayKind={setDayKind} edit={() => setEdit(true)} diary={!n.blocked && <FoodDiary state={s} n={n} plan={plan} act={act} />} />}

        {!reveal && tab === 'progress' && <Progress state={s} add={() => setMeasure('new')} edit={m => setMeasure(m)} remove={m => { if (confirm(`Eliminare la misurazione del ${new Date(m.date + 'T12:00:00').toLocaleDateString('it-IT')}${Object.keys(m.photos).length ? ' e le sue foto' : ''}?`)) { act({ type: 'measureDelete', data: m.id }); deletePhotos(Object.values(m.photos)); } }} />}

        {!reveal && tab === 'chat' && <>
          <Heading label="Il tuo coach" title="Chiedi pure." description="Conosce il tuo piano, i carichi, il diario e le misure.">
            {s.messages.length > 0 && <button className="secondary" onClick={() => { if (confirm('Cancellare la conversazione?')) act({ type: 'clearChat' }); }}><Eraser size={16} /> Nuova chat</button>}
          </Heading>
          <section className="panel chatpanel">
            <div className="chatmessages" aria-live="polite">
              {!s.messages.length && <div className="chatintro"><MessageCircle size={30} /><h2>Su cosa ti serve una mano?</h2>
                <div className="chiprow center">{['Che carico metto oggi?', 'Come sto andando?', 'Il cardio mi serve?', 'Cosa mangio dopo l’allenamento?', 'Posso cambiare un esercizio?'].map(q => <button className="chip" key={q} onClick={() => ask(q)}>{q}</button>)}</div></div>}
              {s.messages.map(m => <div className={'message ' + m.role} key={m.id}><Rich text={m.text} />{m.mode === 'local' && <small className="mode">Risposta base: la chat AI non è ancora attiva.</small>}</div>)}
              {pending && <div className="message assistant typing" aria-label="Il coach sta scrivendo"><span /><span /><span /></div>}
              <div ref={endRef} />
            </div>
            <form className="chatinput" onSubmit={e => { e.preventDefault(); ask(chat); }}>
              <input aria-label="Messaggio al coach" value={chat} onChange={e => setChat(e.target.value)} maxLength={2000} placeholder="Scrivi al coach" />
              <button className="primary" disabled={!chat.trim() || pending} aria-label="Invia"><SendHorizontal size={18} /></button>
            </form>
          </section>
        </>}
      </main>
      <footer>Tempra · per adulti. Non sostituisce il parere del medico o del dietista.</footer>
    </div>
    <nav className="tabbar">{tabs.map(([key, label, Icon]) => <button key={key} className={tab === key ? 'active' : ''} onClick={() => { setTab(key); setReveal(false); window.scrollTo({ top: 0 }); }}><Icon size={22} /><span>{label}</span></button>)}</nav>

    {edit && modal('Le tue risposte', <>
      <Questionnaire initial={p} busy={false} onSave={save1} onCancel={() => setEdit(false)} />
      <div className="dataactions">
        <button className="secondary" onClick={() => { const u = URL.createObjectURL(new Blob([JSON.stringify(s, null, 2)], { type: 'application/json' })); const a = document.createElement('a'); a.href = u; a.download = 'tempra-dati.json'; a.click(); URL.revokeObjectURL(u); }}><Download size={16} /> Esporta i dati</button>
        <button className="secondary" onClick={() => fileRef.current?.click()}><Upload size={16} /> Importa</button>
        <input ref={fileRef} type="file" accept="application/json" hidden onChange={e => e.target.files?.[0] && importData(e.target.files[0])} />
        <button className="danger" onClick={() => { if (confirm(auth === 'in' ? 'Eliminare profilo, piano, diario, misure e foto dal tuo account? Non si può annullare.' : 'Eliminare profilo, piano e diario da questo dispositivo?')) { const id = uid.current; act({ type: 'reset' }); clearPhotos(); if (id) deleteRemote(id); setEdit(false); setWelcome(true); } }}><Trash2 size={16} /> Elimina tutto</button>
      </div>
      {auth === 'in' && <Reminders />}
      {auth === 'in' && <div className="account"><span>Account: <b>{email}</b></span><button className="secondary" onClick={logout}><LogOut size={16} /> Esci</button></div>}</>, () => setEdit(false))}
    {measure && modal(measure === 'new' ? 'Nuova misurazione' : 'Modifica misurazione', <MeasureForm initial={measure === 'new' ? null : measure} save={m => { if (act({ type: 'measure', data: m })) setMeasure(null); else throw Error('Controlla i valori inseriti.'); }} />, () => setMeasure(null))}
    {session && modal(session.title, <Workout key={session.exercises.map(x => x.id).join(',')} profile={p} state={s} deload={!!bp?.meso.deload} changeVariant={data => act({ type: 'variant', data: data as { sessionId: string; exerciseId: string; name: string } })} session={session} save={x => { if (act({ type: 'log', data: x as never })) setSession(null); }} />, () => setSession(null))}
    {check && modal('Come stai oggi?', <CheckIn save={v => { if (act({ type: 'checkin', data: v as never })) setCheck(false); }} />, () => setCheck(false))}
    {review && modal('Il commento del coach', <>{review.map(d => <div className="decision" key={d.id}><h3>{d.title}</h3><p>{d.reason}</p></div>)}</>, () => setReview(null))}
  </div>;
}
