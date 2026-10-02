// Food photos with Gemini vision, in two modes.
// meal: the plate is split into its components (hidden fats included), portions are sized against reference objects,
// and each component is matched to the app's food table so the macros come from the table, not from the model
// (the decomposition + database grounding approach of Open-KNEAD and of apps like SnapCalorie). A description or a
// correction from the person is passed back in to refine the estimate.
// label: reads the nutrition table of a package, per 100 g.
import { signedIn, limited, withinDailyQuota } from '../../../lib/server-auth';
import { genericFoods, findGeneric } from '../../../lib/foods';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MODELS = [...new Set([process.env.GEMINI_MODEL || 'gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.5-flash', 'gemini-3.5-flash-lite'])];
const wait = (ms: number) => new Promise(r => setTimeout(r, ms));
const TABLE = genericFoods.map(f => f.name).join('\n');

const MEAL = `Sei un nutrizionista esperto di cucina italiana e stimi porzioni da foto per un diario alimentare.
Procedi così, ragionando con calma prima di rispondere:
1. Riconosci il piatto nel suo insieme (es. "Spaghetti alla carbonara", "Insalata di pollo") e il tipo di cucina.
2. Scomponi il piatto: un piatto italiano classico con un nome preciso (carbonara, lasagne, pizza, risotto…) va tenuto come UNA voce se la tabella ha quella ricetta; altrimenti dividi nei singoli componenti visibili (es. riso, pollo, verdure).
3. Aggiungi i grassi nascosti come voce separata quando la cottura li richiede e la ricetta della tabella non li comprende già: olio di condimento o di cottura, burro, maionese. Stima prudente (5–15 g di olio per una porzione condita).
4. Stima i grammi di ciascuna voce come è nel piatto (peso da cotto se cotto). Usa la scala: piatto piano standard ≈ 26 cm di diametro, piatto fondo ≈ 22 cm, forchetta ≈ 19 cm, cucchiaio ≈ 17 cm, mano adulta ≈ 18 cm, lattina 33 cl ≈ 12 cm d’altezza, bicchiere ≈ 9 cm. Valuta altezza e densità del cibo, non solo l’area. Riferimenti: un piatto di pasta normale pesa 250–330 g da cotta (80–100 g da cruda), una porzione di riso cotto 180–250 g, un petto di pollo 120–180 g, una fetta di pane 30–50 g, una pizza intera 300–350 g.
5. Per ogni voce scegli in TABELLA il nome che corrisponde meglio (stesso alimento e stessa cottura) e scrivilo esatto in "ref"; se nessuno corrisponde davvero lascia "ref" vuoto e stima tu i valori per 100 g.
6. Indica la tua sicurezza per ogni voce: "alta", "media" o "bassa".
7. Se un dettaglio cambia molto le calorie e non si capisce dalla foto (es. condimento, quantità di olio, ripieno, latte intero o scremato), fai UNA domanda breve in "question"; altrimenti lascia "question" vuoto.
Se la foto non mostra cibo, restituisci "items" vuoto. Se è la foto di un’etichetta o di una confezione, riconosci il prodotto e la porzione indicata.
Nomi brevi in italiano.`;

const LABEL = `Questa è la foto di una confezione o della sua tabella nutrizionale. Leggi i valori PER 100 g (o 100 ml).
Se la tabella riporta solo i valori per porzione, convertili per 100 g usando il peso della porzione. Se l’energia è solo in kJ, dividi per 4,184.
"name": nome del prodotto come appare sulla confezione, vuoto se nella foto non si vede; "brand": la marca se visibile.
"serving": grammi della porzione indicata sull’etichetta, 0 se assente.
Se la foto non è leggibile o non contiene valori nutrizionali, metti "readable" a false.`;

const num = (description?: string) => ({ type: 'NUMBER', ...(description ? { description } : {}) });
const mealSchema = {
  type: 'OBJECT',
  properties: {
    dish: { type: 'STRING' },
    question: { type: 'STRING' },
    items: { type: 'ARRAY', items: { type: 'OBJECT', properties: {
      name: { type: 'STRING' }, ref: { type: 'STRING', description: 'nome esatto in TABELLA, o vuoto' },
      grams: num('grammi nel piatto'), confidence: { type: 'STRING', enum: ['alta', 'media', 'bassa'] },
      kcal: num('kcal per 100 g'), p: num('proteine g per 100 g'), c: num('carboidrati g per 100 g'), f: num('grassi g per 100 g'),
    }, required: ['name', 'ref', 'grams', 'confidence', 'kcal', 'p', 'c', 'f'], propertyOrdering: ['name', 'ref', 'grams', 'confidence', 'kcal', 'p', 'c', 'f'] } },
  },
  required: ['dish', 'question', 'items'], propertyOrdering: ['dish', 'items', 'question'],
};
const labelSchema = {
  type: 'OBJECT',
  properties: { readable: { type: 'BOOLEAN' }, name: { type: 'STRING' }, brand: { type: 'STRING' }, kcal: num('kcal per 100 g'), p: num('proteine per 100 g'), c: num('carboidrati per 100 g'), f: num('grassi per 100 g'), serving: num('grammi della porzione o 0') },
  required: ['readable', 'name', 'kcal', 'p', 'c', 'f', 'serving'],
};

type Raw = { name: string; ref: string; grams: number; confidence: string; kcal: number; p: number; c: number; f: number };
type Prev = { name: string; grams: number };
const clamp = (x: unknown, max: number) => Math.max(0, Math.min(max, Math.round(Number(x) * 10) / 10 || 0));
/** Per-100 g values: from the food table when the model matched an entry, otherwise the model's own, with kcal kept consistent with the macros. */
function per100(i: Raw) {
  const hit = i.ref ? findGeneric(i.ref) : undefined;
  if (hit) return { kcal: hit.kcal, p: hit.p, c: hit.c, f: hit.f, ref: hit.name };
  const p = clamp(i.p, 100), c = clamp(i.c, 100), f = clamp(i.f, 100);
  const atwater = p * 4 + c * 4 + f * 9;
  let kcal = Math.round(clamp(i.kcal, 900));
  if (atwater > 0 && Math.abs(atwater - kcal) > Math.max(25, kcal * 0.25)) kcal = Math.round(atwater);
  return { kcal, p, c, f, ref: undefined };
}

async function gemini(key: string, parts: unknown[], schema: unknown): Promise<{ ok: true; text: string } | { ok: false; status: number }> {
  for (const [i, model] of [...MODELS, ...MODELS].entries()) {
    if (i === MODELS.length) await wait(1500); // every model busy: one more round after a short pause
    for (const thinking of [true, false]) {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          contents: [{ role: 'user', parts }],
          generationConfig: { temperature: 0.2, responseMimeType: 'application/json', responseSchema: schema, ...(thinking ? { thinkingConfig: { thinkingLevel: 'medium' } } : {}) },
        }),
      }).catch(() => null);
      if (!res) return { ok: false, status: 502 };
      if (res.status === 400 && thinking) continue; // model without thinking options: same model, plain request
      if (res.status === 404 || res.status === 429 || res.status >= 500) break;
      if (!res.ok) return { ok: false, status: 502 };
      const data = await res.json().catch(() => null) as { candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[] } | null;
      return { ok: true, text: (data?.candidates?.[0]?.content?.parts ?? []).filter(p => !p.thought && p.text).map(p => p.text).join('') };
    }
  }
  return { ok: false, status: 503 };
}

export async function POST(req: Request) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return Response.json({ error: 'Il riconoscimento delle foto non è attivo.' }, { status: 503 });
  const user = await signedIn(req);
  if (!user) return Response.json({ error: 'Accedi di nuovo per usare le foto.' }, { status: 401 });
  if (!(await withinDailyQuota(user, 'photo', 80))) return Response.json({ error: 'Hai usato molte analisi oggi: riprova domani oppure usa il codice a barre e la ricerca.' }, { status: 429 });
  if (limited(req, 'photo', 30)) return Response.json({ error: 'Troppe foto in poco tempo: riprova tra qualche minuto.' }, { status: 429 });
  const body = await req.json().catch(() => null) as { image?: string; text?: string; mode?: string; note?: string; previous?: Prev[] } | null;
  const image = body?.image?.replace(/^data:image\/\w+;base64,/, '');
  const described = body?.mode === 'text' ? body.text?.trim().slice(0, 800) : undefined;
  if (body?.mode === 'text' ? !described : !image || image.length > 6_000_000) return Response.json({ error: body?.mode === 'text' ? 'Scrivi cosa hai mangiato.' : 'Foto non valida.' }, { status: 400 });
  const photo = image ? { inlineData: { mimeType: 'image/jpeg', data: image } } : null;

  if (body?.mode === 'label' && photo) {
    const out = await gemini(key, [photo, { text: LABEL }], labelSchema);
    if (!out.ok) return Response.json({ error: out.status === 503 ? 'Servizio molto richiesto: riprova tra un minuto.' : 'Non sono riuscito a leggere l’etichetta.' }, { status: 502 });
    try {
      const l = JSON.parse(out.text) as { readable: boolean; name: string; brand?: string; kcal: number; p: number; c: number; f: number; serving: number };
      if (!l.readable || !(Number(l.kcal) > 0)) return Response.json({ error: 'Non riesco a leggere i valori: avvicinati alla tabella nutrizionale, con buona luce e senza riflessi.' }, { status: 422 });
      const v = per100({ ...l, ref: '', grams: 0, confidence: 'alta' });
      const serving = clamp(l.serving, 2000);
      return Response.json({ item: { name: String(l.name ?? '').trim().slice(0, 80), brand: l.brand?.slice(0, 60) || undefined, kcal: v.kcal, p: v.p, c: v.c, f: v.f, serving: serving > 0 ? serving : undefined } });
    } catch { return Response.json({ error: 'Non sono riuscito a leggere l’etichetta: riprova con una foto più vicina.' }, { status: 502 }); }
  }

  const note = body?.note?.trim().slice(0, 500);
  const previous = (body?.previous ?? []).slice(0, 15).map(p => `${String(p.name).slice(0, 80)} ${clamp(p.grams, 3000)} g`).join('; ');
  const extra = [
    note && `INDICAZIONI DELLA PERSONA (hanno la precedenza su quello che vedi): «${note}»`,
    previous && `STIMA PRECEDENTE, da correggere secondo le indicazioni: ${previous}`,
  ].filter(Boolean).join('\n');
  // A written or dictated meal goes through the same decomposition and table grounding, with typical portions when grams are missing.
  const intro = photo ? MEAL : `${MEAL.replace('stimi porzioni da foto', 'ricavi alimenti e porzioni da una descrizione scritta')}\nNon c’è una foto: usa la DESCRIZIONE. Se mancano i grammi usa porzioni tipiche italiane e metti la sicurezza a "media".\nDESCRIZIONE DEL PASTO: «${described}»`;
  const prompt = `${intro}\n${extra ? `\n${extra}\n` : ''}\nTABELLA (un alimento per riga, valori per 100 g):\n${TABLE}`;
  const out = await gemini(key, photo ? [photo, { text: prompt }] : [{ text: prompt }], mealSchema);
  if (!out.ok) return Response.json({ error: out.status === 503 ? 'Servizio molto richiesto: riprova tra un minuto.' : 'Non sono riuscito ad analizzare la foto.' }, { status: 502 });
  try {
    const parsed = JSON.parse(out.text) as { dish?: string; question?: string; items: Raw[] };
    const items = parsed.items.slice(0, 15).map(i => {
      const v = per100(i);
      return { name: String(i.name).slice(0, 80), grams: Math.round(clamp(i.grams, 3000)), confidence: ['alta', 'media', 'bassa'].includes(i.confidence) ? i.confidence : 'media', ...v };
    }).filter(i => i.name && i.grams > 0);
    return Response.json({ dish: parsed.dish?.slice(0, 80) || '', question: parsed.question?.slice(0, 200) || '', items });
  } catch { return Response.json({ error: 'Non sono riuscito a leggere il piatto: riprova con una foto più vicina.' }, { status: 502 }); }
}
