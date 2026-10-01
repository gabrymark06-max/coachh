'use client';
import { useState } from 'react';
import { ArrowRight, Mail, Lock, Dumbbell, ChartLine, MessageCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Mark } from './mark';

type Mode = 'signin' | 'signup' | 'reset' | 'newpass';

const friendly = (m: string) =>
  /Invalid login credentials/i.test(m) ? 'Email o password non corretti.'
  : /Email not confirmed/i.test(m) ? 'Conferma prima l’email: apri il link che ti abbiamo mandato.'
  : /already registered|already been registered/i.test(m) ? 'Questa email ha già un account: accedi.'
  : /provider is not enabled|Unsupported provider/i.test(m) ? 'Questo metodo di accesso non è ancora attivo. Usa un altro metodo.'
  : /Password should be/i.test(m) ? 'La password deve avere almeno 8 caratteri.'
  : /rate limit|too many/i.test(m) ? 'Troppi tentativi: riprova tra qualche minuto.'
  : m;

function Google() {
  return <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" /><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" /><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" /><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" /></svg>;
}
function Apple() {
  return <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden fill="currentColor"><path d="M16.37 12.77c-.02-2.14 1.75-3.17 1.83-3.22-1-1.46-2.55-1.66-3.1-1.68-1.32-.13-2.58.78-3.25.78-.67 0-1.7-.76-2.8-.74-1.44.02-2.77.84-3.51 2.13-1.5 2.6-.38 6.45 1.08 8.56.71 1.03 1.56 2.19 2.67 2.15 1.07-.04 1.48-.69 2.77-.69 1.3 0 1.66.69 2.79.67 1.15-.02 1.88-1.05 2.58-2.09.81-1.2 1.15-2.36 1.17-2.42-.03-.01-2.24-.86-2.26-3.42zM14.24 6.48c.59-.72.99-1.71.88-2.7-.85.03-1.88.57-2.49 1.28-.55.63-1.03 1.64-.9 2.61.95.07 1.92-.48 2.51-1.19z" /></svg>;
}

export function Login({ recovery = false, done }: { recovery?: boolean; done?: () => void }) {
  const [mode, setMode] = useState<Mode>(recovery ? 'newpass' : 'signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  if (!supabase) return null;
  const sb = supabase;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  async function oauth(provider: 'google' | 'apple') {
    setError(''); setBusy(true);
    const { error } = await sb.auth.signInWithOAuth({ provider, options: { redirectTo: origin } });
    if (error) { setError(friendly(error.message)); setBusy(false); }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setInfo(''); setBusy(true);
    try {
      if (mode === 'signin') {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (mode === 'signup') {
        if (password.length < 8) throw Error('La password deve avere almeno 8 caratteri.');
        const { data, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: origin } });
        if (error) throw error;
        if (!data.session) { setInfo(`Ti abbiamo mandato un’email a ${email}: apri il link per confermare l’account, poi accedi.`); setMode('signin'); }
      } else if (mode === 'reset') {
        const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: origin });
        if (error) throw error;
        setInfo(`Se esiste un account per ${email}, ti arriva un’email con il link per scegliere una nuova password.`);
      } else {
        if (password.length < 8) throw Error('La password deve avere almeno 8 caratteri.');
        const { error } = await sb.auth.updateUser({ password });
        if (error) throw error;
        done?.();
      }
    } catch (x) { setError(friendly((x as Error).message)); }
    setBusy(false);
  }

  const title = { signin: 'Bentornato.', signup: 'Crea il tuo account.', reset: 'Recupera la password.', newpass: 'Scegli una nuova password.' }[mode];
  return <div className="login">
    <section className="loginart" aria-hidden>
      <div className="brand"><Mark size={44} /><span><strong>tempra</strong><small>il tuo coach</small></span></div>
      <h1>Il coach che ti segue <em>ogni allenamento</em>.</h1>
      <ul>
        <li><Dumbbell /> Carichi calcolati su quello che hai fatto la volta prima</li>
        <li><ChartLine /> Misure e foto per vedere se stai cambiando davvero</li>
        <li><MessageCircle /> Un coach in chat che conosce il tuo piano</li>
      </ul>
      <span className="temperline" />
    </section>
    <section className="loginform">
      <div className="brand mobileonly"><Mark size={40} /><span><strong>tempra</strong><small>il tuo coach</small></span></div>
      <h2>{title}</h2>
      <p className="note">{mode === 'newpass' ? 'Almeno 8 caratteri.' : mode === 'reset' ? 'Inserisci l’email del tuo account.' : 'Piano, diario, misure e foto restano nel tuo account, su ogni dispositivo.'}</p>
      {(mode === 'signin' || mode === 'signup') && <>
        <div className="oauth">
          <button type="button" className="oauthbtn" disabled={busy} onClick={() => oauth('google')}><Google /> Continua con Google</button>
          <button type="button" className="oauthbtn apple" disabled={busy} onClick={() => oauth('apple')}><Apple /> Continua con Apple</button>
        </div>
        <div className="divider"><span>oppure con l’email</span></div>
      </>}
      <form onSubmit={submit}>
        {mode !== 'newpass' && <label className="authfield"><Mail size={18} /><input type="email" required autoComplete="email" placeholder="La tua email" value={email} onChange={e => setEmail(e.target.value.trim())} /></label>}
        {mode !== 'reset' && <label className="authfield"><Lock size={18} /><input type="password" required minLength={mode === 'signin' ? 1 : 8} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} placeholder={mode === 'signin' ? 'Password' : 'Password (almeno 8 caratteri)'} value={password} onChange={e => setPassword(e.target.value)} /></label>}
        {error && <p className="formerror" role="alert">{error}</p>}
        {info && <p className="authinfo" role="status">{info}</p>}
        <button className="primary big" disabled={busy}>{busy ? 'Attendi…' : { signin: 'Accedi', signup: 'Crea account', reset: 'Mandami il link', newpass: 'Salva password' }[mode]} {!busy && <ArrowRight size={18} />}</button>
      </form>
      <div className="authlinks">
        {mode === 'signin' && <><button type="button" className="ghost" onClick={() => { setMode('signup'); setError(''); setInfo(''); }}>Non hai un account? Registrati</button><button type="button" className="ghost muted" onClick={() => { setMode('reset'); setError(''); setInfo(''); }}>Password dimenticata?</button></>}
        {(mode === 'signup' || mode === 'reset') && <button type="button" className="ghost" onClick={() => { setMode('signin'); setError(''); }}>Hai già un account? Accedi</button>}
      </div>
      <small className="fine">Per adulti. Continuando accetti che i tuoi dati di allenamento siano salvati nel tuo account per far funzionare il coach.</small>
    </section>
  </div>;
}
