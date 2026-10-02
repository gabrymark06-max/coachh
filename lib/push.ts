// Offline support and push reminders on this device: service worker registration and the push subscription,
// saved in Supabase so the daily reminder job can reach the device.
import { supabase, currentUserId } from './supabase';

export function registerWorker() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator) || location.hostname === 'localhost') return;
  navigator.serviceWorker.register('/sw.js').catch(() => undefined);
}

const pushReady = () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

/** 'unsupported' on browsers without web push (iPhone: only once the app is added to the home screen). */
export async function reminderStatus(): Promise<'on' | 'off' | 'blocked' | 'unsupported'> {
  if (!pushReady() || !supabase) return 'unsupported';
  if (Notification.permission === 'denied') return 'blocked';
  const reg = await navigator.serviceWorker.getRegistration();
  return (await reg?.pushManager.getSubscription()) ? 'on' : 'off';
}

const key = (b64: string) => { const s = atob((b64 + '='.repeat((4 - b64.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(s, c => c.charCodeAt(0)); };

export async function enableReminders() {
  if (!pushReady() || !supabase || !(await currentUserId())) throw Error('Promemoria non disponibili su questo browser.');
  if (await Notification.requestPermission() !== 'granted') throw Error('Permesso per le notifiche negato: puoi riattivarlo dalle impostazioni del browser.');
  const reg = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!) });
  const { error } = await supabase.from('push_subscriptions').upsert({ endpoint: sub.endpoint, subscription: sub.toJSON() });
  if (error) { await sub.unsubscribe(); throw Error('Non riesco a salvare i promemoria: riprova più tardi.'); }
}

export async function disableReminders() {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  await supabase?.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
  await sub.unsubscribe();
}
