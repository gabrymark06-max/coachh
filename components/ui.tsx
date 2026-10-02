'use client';
import { type ReactNode } from 'react';
import { type Plan } from '../lib/types';
import { Mark } from './mark';

// Small building blocks shared by the screens.
export function Brand() { return <div className="brand"><Mark /><span><strong>tempra</strong><small>il tuo coach</small></span></div>; }

export function Heading({ label, title, description, children }: { label: string; title: string; description: string; children?: ReactNode }) {
  return <div className="pageheading"><div><div className="eyebrow">{label}</div><h1>{title}</h1>{description && <p>{description}</p>}</div>{children}</div>;
}

export function Metric({ label, value }: { label: string; value: string }) { return <div><span>{label}</span><strong>{value}</strong></div>; }

export function MacroRow({ m }: { m: { kcal: number; protein: number; carbs: number; fat: number } }) {
  const tot = m.protein * 4 + m.carbs * 4 + m.fat * 9;
  return <div className="macros">
    <div className="kcal"><strong className="num">{m.kcal}</strong><span>kcal</span></div>
    <div className="macrobar" aria-hidden><span className="p" style={{ width: `${m.protein * 4 / tot * 100}%` }} /><span className="c" style={{ width: `${m.carbs * 4 / tot * 100}%` }} /><span className="f" style={{ width: `${m.fat * 9 / tot * 100}%` }} /></div>
    <div className="macrolegend"><span><i className="p" />Proteine <b className="num">{m.protein} g</b></span><span><i className="c" />Carboidrati <b className="num">{m.carbs} g</b></span><span><i className="f" />Grassi <b className="num">{m.fat} g</b></span></div>
  </div>;
}

export function Rich({ text }: { text: string }) {
  const bold = (line: string) => line.split(/(\*\*[^*]+\*\*)/g).map((part, i) => part.startsWith('**') && part.endsWith('**') ? <b key={i}>{part.slice(2, -2)}</b> : part.replace(/\*\*/g, ''));
  const blocks: ReactNode[] = [];
  let items: string[] = [];
  const flush = () => { if (items.length) { blocks.push(<ul key={blocks.length}>{items.map((x, i) => <li key={i}>{bold(x)}</li>)}</ul>); items = []; } };
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    const m = line.match(/^(?:[•\-*]|\d+[.)])\s+(.*)$/);
    if (m) { items.push(m[1]); continue; }
    flush();
    if (line) blocks.push(<p key={blocks.length}>{bold(line.replace(/^#+\s*/, ''))}</p>);
  }
  flush();
  return <>{blocks}</>;
}

export function TemperCurve({ meso }: { meso: NonNullable<Plan['blueprint']>['meso'] }) {
  return <div className="curve" role="img" aria-label={`Blocco di ${meso.length} settimane, settimana ${meso.week}`}>
    <div className="bars">{meso.load.map((h, i) => {
      const w = i + 1, deload = i === meso.length - 1;
      return <div key={i} className={`bar ${w < meso.week ? 'done' : ''} ${w === meso.week ? 'now' : ''} ${deload ? 'deload' : ''}`}><div className="fill" style={{ height: `${Math.round(h * 100)}%` }} /><small>{deload ? 'Scarico' : 'S' + w}</small></div>;
    })}</div>
  </div>;
}
