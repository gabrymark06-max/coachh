'use client';
import { useEffect, useState } from 'react';
import { Bell, BellOff, Send } from 'lucide-react';
import { accessToken } from '../lib/supabase';
import { reminderStatus, enableReminders, disableReminders } from '../lib/push';

/** One notification each morning: today's session, or a rest-day nudge to weigh in and log meals. */
export function Reminders() {
  const [status, setStatus] = useState<Awaited<ReturnType<typeof reminderStatus>> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  useEffect(() => { reminderStatus().then(setStatus); }, []);
  if (!status) return null;
  const toggle = async () => {
    setBusy(true); setError('');
    try { if (status === 'on') await disableReminders(); else await enableReminders(); } catch (e) { setError((e as Error).message); }
    setStatus(await reminderStatus()); setBusy(false);
  };
  const test = async () => {
    setBusy(true); setError(''); setInfo('');
    const token = await accessToken();
    const res = await fetch('/api/push-test', { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {} }).catch(() => null);
    const d = await res?.json().catch(() => ({})) as { error?: string; sent?: number } | undefined;
    if (res?.ok) setInfo('Notifica inviata: dovrebbe arrivare tra pochi secondi.'); else setError(d?.error ?? 'Invio non riuscito.');
    setBusy(false);
  };
  return <div className="reminders">
    <div><b>Promemoria del mattino</b><small>{status === 'unsupported' ? 'Su iPhone aggiungi prima Tempra alla schermata Home (Condividi → Aggiungi alla schermata Home), poi aprila da lì.' : status === 'blocked' ? 'Notifiche bloccate: riattivale dalle impostazioni del browser.' : 'Una notifica al giorno: la seduta di oggi oppure pesata e pasti nei giorni di riposo.'}</small></div>
    {(status === 'on' || status === 'off') && <button className={status === 'on' ? 'secondary' : 'primary'} disabled={busy} onClick={toggle}>{status === 'on' ? <><BellOff size={16} /> Disattiva</> : <><Bell size={16} /> Attiva</>}</button>}
    {status === 'on' && <button className="ghost" disabled={busy} onClick={test}><Send size={15} /> Prova</button>}
    {error && <p className="formerror">{error}</p>}
    {info && <p className="note">{info}</p>}
  </div>;
}
