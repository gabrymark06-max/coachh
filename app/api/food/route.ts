// Branded food lookup, values per 100 g. By barcode (?code=): products added by Tempra users first, then Open Food Facts
// (also under the EAN-13/UPC-A variants of the code). By name (?q=): Open Food Facts search.
import { limited } from '../../../lib/server-auth';
import type { FoodItem } from '../../../lib/foods';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UA = 'Tempra/1.0 (https://coachh-teal.vercel.app; gabrymark06@gmail.com)';
const FIELDS = 'code,product_name,product_name_it,generic_name_it,generic_name,abbreviated_product_name,brands,quantity,nutriments,serving_quantity,serving_size,image_front_small_url';
type Off = { code?: string; product_name?: string; product_name_it?: string; generic_name_it?: string; generic_name?: string; abbreviated_product_name?: string; brands?: string | string[]; quantity?: string; nutriments?: Record<string, number>; serving_quantity?: number | string; serving_size?: string; image_front_small_url?: string };

const r1 = (x: number) => Math.round(x * 10) / 10;
/** Per-100 g value of a nutrient: the 100 g field, else the "prepared" one, else the per-serving value scaled by the serving weight. */
function per100(n: Record<string, number>, key: string, serving: number) {
  for (const k of [`${key}_100g`, `${key}_prepared_100g`]) if (Number.isFinite(n[k])) return n[k];
  if (serving > 0) for (const k of [`${key}_serving`, `${key}_prepared_serving`]) if (Number.isFinite(n[k])) return n[k] * 100 / serving;
  return undefined;
}

function toItem(p: Off): { item: FoodItem | null; name: string } {
  const n = p.nutriments ?? {};
  const serving = Number(p.serving_quantity);
  const brand = (Array.isArray(p.brands) ? p.brands.join(', ') : p.brands ?? '').split(',')[0]?.trim() || undefined;
  const name = (p.product_name_it || p.product_name || p.generic_name_it || p.generic_name || p.abbreviated_product_name || '').trim();
  const prot = per100(n, 'proteins', serving), carb = per100(n, 'carbohydrates', serving), fat = per100(n, 'fat', serving);
  const kj = per100(n, 'energy-kj', serving) ?? per100(n, 'energy', serving);
  let kcal = per100(n, 'energy-kcal', serving) ?? (kj !== undefined ? kj / 4.184 : undefined);
  if (kcal === undefined && prot !== undefined && carb !== undefined && fat !== undefined) kcal = prot * 4 + carb * 4 + fat * 9;
  if (!name || kcal === undefined || kcal > 950) return { item: null, name: [name, brand].filter(Boolean).join(' · ') };
  return {
    name,
    item: {
      name, brand,
      kcal: Math.round(kcal), p: r1(prot ?? 0), c: r1(carb ?? 0), f: r1(fat ?? 0),
      serving: serving > 0 && serving < 2000 ? serving : undefined, servingLabel: p.serving_size && !/serving|portion/i.test(p.serving_size) ? p.serving_size.replace(/\s*\(.*\)\s*$/, '') || undefined : undefined,
      code: p.code, image: p.image_front_small_url,
    },
  };
}

/** The same product can be stored as EAN-13 with a leading 0 (UPC-A) or without it. */
const variants = (code: string) => [...new Set([code, code.length === 12 ? '0' + code : '', code.length === 13 && code.startsWith('0') ? code.slice(1) : '', code.length < 13 ? code.padStart(13, '0') : ''].filter(Boolean))];

type Shared = { code: string; name: string; brand: string | null; kcal: number; p: number; c: number; f: number; serving: number | null };
async function shared(codes: string[]): Promise<FoodItem | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  const res = await fetch(`${url}/rest/v1/products?select=code,name,brand,kcal,p,c,f,serving&code=in.(${codes.join(',')})&limit=1`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: 'no-store' }).catch(() => null);
  const row = res?.ok ? (await res.json().catch(() => []) as Shared[])[0] : undefined;
  return row ? { name: row.name, brand: row.brand ?? undefined, kcal: Number(row.kcal), p: Number(row.p), c: Number(row.c), f: Number(row.f), serving: row.serving ? Number(row.serving) : undefined, code: row.code } : null;
}

async function off(code: string) {
  const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=${FIELDS}`, { headers: { 'User-Agent': UA }, next: { revalidate: 86400 } });
  const data = await res.json().catch(() => null) as { status?: number; product?: Off } | null;
  return data?.product ? toItem({ ...data.product, code }) : null;
}

export async function GET(req: Request) {
  if (limited(req, 'food', 150)) return Response.json({ error: 'Troppe ricerche: riprova tra poco.' }, { status: 429 });
  const url = new URL(req.url);
  const code = url.searchParams.get('code')?.replace(/\D/g, '');
  const q = url.searchParams.get('q')?.trim().slice(0, 80);
  try {
    if (code) {
      const codes = variants(code);
      const mine = await shared(codes);
      if (mine) return Response.json({ item: { ...mine, code } });
      let partial = '';
      for (const c of codes) {
        const found = await off(c);
        if (found?.item) return Response.json({ item: { ...found.item, code } });
        if (found?.name) partial ||= found.name;
      }
      return Response.json({ error: partial ? `Ho trovato «${partial}» ma senza valori nutrizionali.` : 'Prodotto non ancora nel database.', name: partial || undefined }, { status: 404 });
    }
    if (q && q.length >= 2) {
      const res = await fetch(`https://search.openfoodfacts.org/search?q=${encodeURIComponent(q)}&page_size=24&langs=it&fields=${FIELDS}`, { headers: { 'User-Agent': UA }, next: { revalidate: 3600 } });
      const data = await res.json().catch(() => null) as { hits?: Off[] } | null;
      const items = (data?.hits ?? []).map(h => toItem(h).item).filter((x): x is FoodItem => !!x).slice(0, 15);
      return Response.json({ items });
    }
    return Response.json({ error: 'Scrivi almeno due lettere.' }, { status: 400 });
  } catch { return Response.json({ error: 'Database dei prodotti non raggiungibile: riprova.' }, { status: 502 }); }
}
