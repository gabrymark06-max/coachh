import type { ReactNode } from 'react';
import Link from 'next/link';
import { Mark } from '../components/mark';

export const CONTACT = 'marchesinigabriele2006@gmail.com';
export const UPDATED = '1 ottobre 2026';

/** Shared shell for the privacy and terms pages: readable column, brand, back link. */
export function Legal({ title, children }: { title: string; children: ReactNode }) {
  return <div className="legal">
    <header><Link href="/" className="brand"><Mark size={36} /><span><strong>tempra</strong><small>il tuo coach</small></span></Link></header>
    <article>
      <h1>{title}</h1>
      <p className="note">Ultimo aggiornamento: {UPDATED}</p>
      {children}
      <p className="legalnav"><Link href="/privacy">Privacy</Link> · <Link href="/termini">Termini di servizio</Link> · <Link href="/">Torna all’app</Link></p>
    </article>
  </div>;
}
