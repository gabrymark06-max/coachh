// Coach chat backed by the Gemini API. The browser sends the conversation, a compact summary of the person's
// plan, diary and measurements, and the most relevant evidence cards; the key stays on the server.
import { signedIn, limited } from '../../../lib/server-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Turn = { role: 'user' | 'assistant'; text: string };
type Card = { title: string; year: number; finding: string; coach_use: string };

// Tried in order: an overloaded or missing model hands over to the next one.
const MODELS = [...new Set([process.env.GEMINI_MODEL || 'gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.5-flash', 'gemini-3.5-flash-lite'])];

const SYSTEM = `Sei Tempra, il coach personale dell'utente: un preparatore esperto di palestra, ricomposizione corporea, aumento della massa muscolare e dimagrimento. La palestra è la base; cardio e passi li decidi tu in base all'obiettivo.

Come rispondi:
- In italiano, dando del tu, come un coach che conosce la persona: diretto, concreto, motivante senza retorica.
- Usa i DATI DELLA PERSONA qui sotto (profilo, piano, carichi, diario, misure, check-in). Cita numeri reali: kg, ripetizioni, serie, date, misure. Se un dato manca, dillo e spiega cosa registrare.
- Per carichi e progressioni ragiona come il piano: doppia progressione regolata dal RIR (completa il range con le ripetizioni in riserva previste, poi aumenta il carico; sotto il range riduci).
- Basa le affermazioni scientifiche sulle PROVE fornite e sulle conoscenze consolidate; non inventare studi, non citare codici, ID o nomi di database. Puoi dire "gli studi mostrano" quando le prove lo supportano.
- Risposte brevi: di solito 3–8 frasi o un elenco puntato con "•". Niente titoli markdown, niente tabelle. Grassetto con **solo** per il dato chiave.
- Se l'utente vuole cambiare qualcosa del piano, spiega cosa cambieresti e come farlo nell'app (cambiare variante dell'esercizio, aggiornare le risposte del profilo, segnare il check-in).

Sicurezza:
- Dolore al petto, svenimenti, affanno anomalo: interrompere e chiedere assistenza medica. Dolore articolare: fermare il movimento che lo provoca e farlo valutare; non fare diagnosi.
- Niente dosaggi di farmaci, steroidi anabolizzanti o sostanze dopanti; niente diete sotto 1200 kcal o digiuni estremi. Con segnali di disturbi alimentari rispondi con delicatezza e suggerisci un professionista.`;

export async function POST(req: Request) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return Response.json({ error: 'not-configured' }, { status: 503 });
  if (!(await signedIn(req))) return Response.json({ error: 'Accedi di nuovo per parlare con il coach.' }, { status: 401 });
  if (limited(req, 'coach', 40)) return Response.json({ error: 'Troppe domande in poco tempo: riprova tra qualche minuto.' }, { status: 429 });
  let body: { messages?: Turn[]; context?: string; evidence?: Card[] };
  try { body = await req.json(); } catch { return Response.json({ error: 'Richiesta non valida.' }, { status: 400 }); }
  const messages = (body.messages ?? []).filter(m => (m.role === 'user' || m.role === 'assistant') && typeof m.text === 'string').slice(-16).map(m => ({ ...m, text: m.text.slice(0, 4000) }));
  if (!messages.length || messages.at(-1)!.role !== 'user') return Response.json({ error: 'Scrivi una domanda.' }, { status: 400 });
  const context = String(body.context ?? '').slice(0, 16000);
  const evidence = (body.evidence ?? []).slice(0, 8).map(c => `• ${String(c.title).slice(0, 200)} (${Number(c.year) || ''}): ${String(c.finding).slice(0, 600)} Applicazione: ${String(c.coach_use).slice(0, 400)}`).join('\n');
  const system = `${SYSTEM}\n\nOGGI: ${new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Rome' })}\n\nDATI DELLA PERSONA\n${context || 'Nessun profilo ancora.'}\n\nPROVE PERTINENTI\n${evidence || 'Nessuna scheda specifica: usa le conoscenze consolidate.'}`;
  // Gemini requires alternating turns starting with the user: merge consecutive turns of the same role.
  const contents: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];
  for (const m of messages) {
    const role = m.role === 'user' ? 'user' : 'model';
    const prev = contents.at(-1);
    if (prev?.role === role) prev.parts[0].text += '\n\n' + m.text;
    else if (contents.length || role === 'user') contents.push({ role, parts: [{ text: m.text }] });
  }
  for (const model of MODELS) {
    for (const thinking of [true, false]) {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents,
          generationConfig: { temperature: 0.6, maxOutputTokens: 4096, ...(thinking ? { thinkingConfig: { thinkingLevel: 'low' } } : {}) },
        }),
      }).catch(() => null);
      if (!res) return Response.json({ error: 'Il coach non è raggiungibile: controlla la connessione.' }, { status: 502 });
      if (res.status === 400 && thinking) continue; // model without thinking levels: retry plainly
      if (res.status === 404 || res.status === 429 || res.status >= 500) break; // unknown or overloaded model: try the next one
      const data = await res.json().catch(() => null) as { candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[]; error?: { message?: string } } | null;
      // No credit or a disabled key: answer like an unconfigured coach, so the app falls back to its local rules.
      if (res.status === 402 || res.status === 401 || res.status === 403) return Response.json({ error: 'not-configured', detail: data?.error?.message }, { status: 503 });
      if (!res.ok) return Response.json({ error: res.status === 429 ? 'Limite di richieste raggiunto per oggi: riprova più tardi.' : 'Il coach non ha risposto. Riprova.', detail: data?.error?.message }, { status: 502 });
      const text = (data?.candidates?.[0]?.content?.parts ?? []).filter(p => !p.thought && p.text).map(p => p.text).join('').trim();
      if (!text) return Response.json({ error: 'Risposta vuota: riformula la domanda.' }, { status: 502 });
      return Response.json({ text, model });
    }
  }
  return Response.json({ error: 'Il coach è molto richiesto in questo momento: riprova tra un minuto.' }, { status: 502 });
}
