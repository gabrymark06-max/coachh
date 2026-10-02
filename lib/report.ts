// Sends uncaught errors to /api/log, at most a few per page load, so problems on real phones become visible.
let sent = 0;
function send(message: string, stack?: string) {
  if (sent >= 5 || !message) return;
  sent++;
  const body = JSON.stringify({ message, stack, page: location.pathname });
  try { if (!navigator.sendBeacon?.('/api/log', new Blob([body], { type: 'application/json' }))) fetch('/api/log', { method: 'POST', body, headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(() => undefined); } catch { /* reporting must never break the app */ }
}
export function watchErrors() {
  if (typeof window === 'undefined' || location.hostname === 'localhost') return;
  window.addEventListener('error', e => send(e.message, (e.error as Error | undefined)?.stack));
  window.addEventListener('unhandledrejection', e => { const r = e.reason as Error | undefined; send(r?.message ?? String(e.reason), r?.stack); });
}
