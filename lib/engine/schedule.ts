import type { Session } from '../types';

type Item = Omit<Session, 'day'>;
const legHeavy = (s: Item) => s.type === 'strength' && ['lower', 'legs', 'full'].includes(s.kind ?? '') && !!s.hard;
const hardRun = (s: Item) => s.type === 'run' && !!s.hard;
const sameMuscles = (a: Item, b: Item) => a.type === 'strength' && b.type === 'strength' && (a.kind === b.kind || a.kind === 'full' || b.kind === 'full' || (a.kind === 'legs' && b.kind === 'lower') || (a.kind === 'lower' && b.kind === 'legs'));

/** Cost of placing `b` the day after `a`. */
function pairCost(a: Item, b: Item) {
  let c = 0;
  if (legHeavy(a) && hardRun(b)) c += b.kind === 'long' ? 8 : 6; // keep ~48 h between heavy legs and key runs
  if (hardRun(a) && legHeavy(b)) c += 3;
  if ((a.hard || hardRun(a)) && (b.hard || hardRun(b))) c += 2; // hard day / easy day
  if (sameMuscles(a, b)) c += 4; // same muscles on consecutive days
  if (hardRun(a) && hardRun(b)) c += 4;
  return c;
}

function permutations<T>(items: T[]): T[][] {
  if (items.length <= 1) return [items];
  const out: T[][] = [];
  const seen = new Set<string>();
  items.forEach((x, i) => {
    for (const rest of permutations([...items.slice(0, i), ...items.slice(i + 1)])) {
      const perm = [x, ...rest];
      const key = JSON.stringify(perm.map(p => (p as unknown as Item).title + (p as unknown as Item).kind));
      if (!seen.has(key)) { seen.add(key); out.push(perm); }
    }
  });
  return out;
}

/** Assign one session to each selected day, minimising recovery conflicts. Days are 0 = Monday … 6 = Sunday. */
export function schedule(days: number[], items: Item[]): Session[] {
  const sorted = [...days].sort((a, b) => a - b);
  let best: Item[] = items, bestCost = Infinity;
  const weekend = sorted.filter(d => d >= 5);
  for (const perm of permutations(items)) {
    let cost = 0;
    for (let i = 0; i < sorted.length; i++) {
      for (let j = 0; j < sorted.length; j++) {
        if (i === j) continue;
        const gap = (sorted[j] - sorted[i] + 7) % 7;
        if (gap === 1) cost += pairCost(perm[i], perm[j]);
      }
      if (perm[i].kind === 'long' && weekend.length && sorted[i] < 5) cost += 1;
    }
    // Keep the original order of same-type templates (A before B) as a tie-break.
    cost += perm.reduce((t, s, i) => t + (s.type === 'strength' ? i * 0.001 : 0), 0);
    if (cost < bestCost) { bestCost = cost; best = perm; }
  }
  return best.map((s, i) => ({ ...s, day: sorted[i] }));
}
