// Branded food lookup through Open Food Facts: by barcode (?code=) or by name (?q=). Values are per 100 g.
import { limited } from '../../../lib/server-auth';
import type { FoodItem } from '../../../lib/foods';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UA = 'Tempra/1.0 (https://coachh-teal.vercel.app; gabrymark06@gmail.com)';
type Off = { code?: string; product_name?: string; product_name_it?: string; brands?: string | string[]; nutriments?: Record<string, number>; serving_quantity?: number | string; serving_size?: string; image_front_small_url?: string };

function toItem(p: Off): FoodItem | null {
  const n = p.nutriments ?? {};
  const kcal = n['energy-kcal_100g'] ?? (n['energy_100g'] ? n['energy_100g'] / 4.184 : undefined);
  const name = (p.product_name_it || p.product_name || '').trim();
  if (!name || kcal === undefined) return null;
  const r = (x: number | undefined) => Math.round((x ?? 0) * 10) / 10;
  const serving = Number(p.serving_quantity);
  return {
    name, brand: (Array.isArray(p.brands) ? p.brands.join(', ') : p.brands ?? '').split(',')[0]?.trim() || undefined,
    kcal: Math.round(kcal), p: r(n['proteins_100g']), c: r(n['carbohydrates_100g']), f: r(n['fat_100g']),
    serving: serving > 0 && serving < 2000 ? serving : undefined, servingLabel: p.serving_size && !/serving|portion/i.test(p.serving_size) ? p.serving_size.replace(/\s*\(.*\)\s*$/, '') || undefined : undefined,
    code: p.code, image: p.image_front_small_url,
  };
}

export async function GET(req: Request) {
  if (limited(req, 'food', 120)) return Response.json({ error: 'Troppe ricerche: riprova tra poco.' }, { status: 429 });
  const url = new URL(req.url);
  const code = url.searchParams.get('code')?.replace(/\D/g, '');
  const q = url.searchParams.get('q')?.trim().slice(0, 80);
  const fields = 'code,product_name,product_name_it,brands,nutriments,serving_quantity,serving_size,image_front_small_url';
  try {
    if (code) {
      const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=${fields}`, { headers: { 'User-Agent': UA }, next: { revalidate: 86400 } });
      const data = await res.json().catch(() => null) as { status?: number; product?: Off } | null;
      const item = data?.product ? toItem({ ...data.product, code }) : null;
      return item ? Response.json({ item }) : Response.json({ error: 'Prodotto non trovato: cercalo per nome o inseriscilo a mano.' }, { status: 404 });
    }
    if (q && q.length >= 2) {
      const res = await fetch(`https://search.openfoodfacts.org/search?q=${encodeURIComponent(q)}&page_size=20&langs=it&fields=${fields}`, { headers: { 'User-Agent': UA }, next: { revalidate: 3600 } });
      const data = await res.json().catch(() => null) as { hits?: Off[] } | null;
      const items = (data?.hits ?? []).map(toItem).filter((x): x is FoodItem => !!x).slice(0, 15);
      return Response.json({ items });
    }
    return Response.json({ error: 'Scrivi almeno due lettere.' }, { status: 400 });
  } catch { return Response.json({ error: 'Database dei prodotti non raggiungibile: riprova.' }, { status: 502 }); }
}
