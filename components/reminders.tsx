'use client';
import { useEffect, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { reminderStatus, enableReminders, disableReminders } from '../lib/push';

/** One notification each morning: today's session, or a rest-day nudge to weigh in and log meals. */
export function Reminders() {
  const [status, setStatus] = useState<Awaited<ReturnType<typeof reminderStatus>> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { reminderStatus().then(setStatus); }, []);
  if (!status) return null;
  const toggle = async () => {
    setBusy(true); setError('');
    try { if (status === 'on') await disableReminders(); else await enableReminders(); } catch (e) { setError((e as Error).message); }
    setStatus(await reminderStatus()); setBusy(false);
  };
  return <div className="reminders">
    <div><b>Promemoria del mattino</b><small>{status === 'unsupported' ? 'Su iPhone aggiungi prima Tempra alla schermata Home (Condividi → Aggiungi alla schermata Home), poi aprila da lì.' : status === 'blocked' ? 'Notifiche bloccate: riattivale dalle impostazioni del browser.' : 'Una notifica al giorno: la seduta di oggi oppure pesata e pasti nei giorni di riposo.'}</small></div>
    {(status === 'on' || status === 'off') && <button className={status === 'on' ? 'secondary' : 'primary'} disabled={busy} onClick={toggle}>{status === 'on' ? <><BellOff size={16} /> Disattiva</> : <><Bell size={16} /> Attiva</>}</button>}
    {error && <p className="formerror">{error}</p>}
  </div>;
}
