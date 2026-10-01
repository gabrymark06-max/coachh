// Tempra logo: a tempered steel bar (gradient) over the letter t.
export function Mark({ size = 38 }: { size?: number }) {
  return <svg className="mark" width={size} height={size} viewBox="0 0 64 64" aria-hidden><defs><linearGradient id="tm" x1="0" x2="1"><stop offset="0" stopColor="#D9A93A" /><stop offset=".38" stopColor="#A4602F" /><stop offset=".68" stopColor="#6B4E9B" /><stop offset="1" stopColor="#2F5DA8" /></linearGradient></defs><rect width="64" height="64" rx="15" fill="#1D2329" /><rect x="12" y="15" width="40" height="9" rx="2.5" fill="url(#tm)" /><path d="M27.5 24h9v21.5c0 2.2 1.1 3.3 3.3 3.3h3.7V53h-6.2c-6.3 0-9.8-3.3-9.8-9.4z" fill="#EEF1F3" /></svg>;
}
