// Meal photo → foods and estimated grams, with Gemini vision. The person checks and corrects every item before saving.
import { signedIn, limited } from '../../../lib/server-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MODELS = [...new Set([process.env.GEMINI_MODEL || 'gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.5-flash', 'gemini-3.5-flash-lite'])];
const wait = (ms: number) => new Promise(r => setTimeout(r, ms));
const PROMPT = `Sei un nutrizionista. Guarda la foto del pasto e individua ogni alimento visibile.
Per ciascuno stima il peso in grammi della porzione nel piatto (peso da cotto se è cotto) e i valori nutrizionali per 100 g di quell'alimento così come è nel piatto.
Nomi brevi in italiano (es. "Pasta al pomodoro", "Petto di pollo alla griglia", "Olio d'oliva").
Includi i condimenti probabili (olio, sughi) come voce separata con una stima prudente.
Se la foto non mostra cibo, restituisci una lista vuota.`;

const schema = {
  type: 'OBJECT',
  properties: {
    items: { type: 'ARRAY', items: { type: 'OBJECT', properties: {
      name: { type: 'STRING' }, grams: { type: 'NUMBER' },
      kcal: { type: 'NUMBER', description: 'kcal per 100 g' }, p: { type: 'NUMBER', description: 'proteine g per 100 g' },
      c: { type: 'NUMBER', description: 'carboidrati g per 100 g' }, f: { type: 'NUMBER', description: 'grassi g per 100 g' },
    }, required: ['name', 'grams', 'kcal', 'p', 'c', 'f'] } },
  },
  required: ['items'],
};

export async function POST(req: Request) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return Response.json({ error: 'Il riconoscimento delle foto non è attivo.' }, { status: 503 });
  if (!(await signedIn(req))) return Response.json({ error: 'Accedi di nuovo per usare la foto del piatto.' }, { status: 401 });
  if (limited(req, 'photo', 20)) return Response.json({ error: 'Troppe foto in poco tempo: riprova tra qualche minuto.' }, { status: 429 });
  const body = await req.json().catch(() => null) as { image?: string } | null;
  const image = body?.image?.replace(/^data:image\/\w+;base64,/, '');
  if (!image || image.length > 4_000_000) return Response.json({ error: 'Foto non valida.' }, { status: 400 });
  for (const [i, model] of [...MODELS, ...MODELS].entries()) {
    if (i === MODELS.length) await wait(1500); // every model busy: one more round after a short pause
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ inlineData: { mimeType: 'image/jpeg', data: image } }, { text: PROMPT }] }],
        generationConfig: { temperature: 0.2, responseMimeType: 'application/json', responseSchema: schema },
      }),
    }).catch(() => null);
    if (!res) return Response.json({ error: 'Servizio non raggiungibile.' }, { status: 502 });
    if (res.status === 404 || res.status === 429 || res.status >= 500) continue;
    const data = await res.json().catch(() => null) as { candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[] } | null;
    if (!res.ok) return Response.json({ error: 'Non sono riuscito ad analizzare la foto.' }, { status: 502 });
    const text = (data?.candidates?.[0]?.content?.parts ?? []).filter(p => !p.thought && p.text).map(p => p.text).join('');
    try {
      const parsed = JSON.parse(text) as { items: { name: string; grams: number; kcal: number; p: number; c: number; f: number }[] };
      const n = (x: number, max: number) => Math.max(0, Math.min(max, Math.round(Number(x) * 10) / 10 || 0));
      const items = parsed.items.slice(0, 12).map(i => ({ name: String(i.name).slice(0, 80), grams: Math.round(n(i.grams, 2000)), kcal: Math.round(n(i.kcal, 900)), p: n(i.p, 100), c: n(i.c, 100), f: n(i.f, 100) })).filter(i => i.name && i.grams > 0);
      return Response.json({ items });
    } catch { return Response.json({ error: 'Non sono riuscito a leggere il piatto: riprova con una foto più vicina.' }, { status: 502 }); }
  }
  return Response.json({ error: 'Servizio molto richiesto: riprova tra un minuto.' }, { status: 502 });
}
