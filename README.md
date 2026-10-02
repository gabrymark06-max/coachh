# Tempra · il tuo coach di palestra e dieta

Tempra ti fa un questionario e costruisce un piano completo per **dimagrire, fare ricomposizione corporea o mettere massa**:

- **Palestra come base:**
  - serie per muscolo e split in base ai giorni;
  - oltre 130 esercizi con la tecnica: pesi liberi, multipower, macchine, cavi, corpo libero;
  - blocchi di 4–5 settimane con scarico; dal secondo blocco gli esercizi accessori cambiano, quelli principali restano per confrontare i progressi.
- **Il tuo piano, se preferisci:** scegli tu giorni, esercizi, serie, ripetizioni, RIR e recupero, partendo da zero o dal piano del coach. Il coach non cambia la struttura: suggerisce il carico di ogni esercizio dalla volta prima e il riscaldamento. Si torna al piano del coach con un tocco.
- **Libreria di circa 1.000 esercizi** in italiano, con muscoli, attrezzo, istruzioni e foto: i 132 di Tempra più [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (Unlicense), tradotto con `scripts/build-catalog.mjs` in `public/catalog.json`. Si possono creare esercizi propri.
- **Riscaldamento specifico per ogni seduta:** cardio leggero, esercizi di mobilità per le articolazioni del giorno e serie di avvicinamento calcolate sul carico di lavoro.
- **Carico consigliato per ogni esercizio**, calcolato su quello che hai fatto l'ultima volta (doppia progressione regolata dal RIR):
  - completi il range → sale il peso;
  - resti sotto il range → scende;
  - cambia il range di ripetizioni → conversione tramite il massimale stimato.
- **Adattamento settimanale:** serie per muscolo regolate da completamento, sforzo, check-in e andamento della forza stimata di ogni muscolo.
- **Timer di recupero** che parte quando spunti una serie, e segnale «Record» quando una serie supera il tuo massimale stimato.
- **Cardio e passi decisi dal coach** in base all'obiettivo.
- **Progressi:**
  - peso, vita, petto, braccio, coscia e fianchi con grafici;
  - grasso stimato;
  - forza stimata per esercizio, con il record personale (carico, ripetizioni, data);
  - foto (fronte, lato, dietro) con confronto prima/dopo, affiancato o a scorrimento.
- **Dieta:** fase, calorie, macronutrienti e giornata tipo calibrata sugli obiettivi. Con «Personalizza» imposti tu calorie e macro (allenamento e riposo) e componi la tua giornata tipo.
- **Mantenimento misurato:** con almeno 10 giorni registrati (due pasti o più) e 4 pesate in 4 settimane, il mantenimento si ricalcola dalle calorie mangiate e dall'andamento del peso, ogni due settimane, e sostituisce in gran parte la stima della formula.
- **Diario alimentare:**
  - codice a barre con la fotocamera: prodotti aggiunti dagli utenti, poi Open Food Facts; se manca, si fotografa l'etichetta e il prodotto resta salvato per tutti (`supabase/products.sql`);
  - ricerca tra 350 alimenti comuni (anche piatti pronti italiani e fast food) e i prodotti di marca;
  - foto del piatto con Gemini: scompone il piatto, stima le porzioni con oggetti di riferimento, prende i valori dalla tabella degli alimenti quando c'è la voce giusta, accetta una descrizione e le correzioni;
  - lettura della tabella nutrizionale da foto;
  - «Scrivi o detta»: descrivi il pasto a parole (anche a voce) e calcolo alimenti e grammi;
  - pasti salvati, «Copia la giornata di ieri» e «Come ieri» per il singolo pasto;
  - pesato crudo o cotto: passa alla voce giusta della tabella;
  - quantità in grammi e totali del giorno confrontati con gli obiettivi.
  - Il coach in chat e la revisione settimanale usano quello che registri.
- **Coach in chat con Gemini (Google AI):** risponde usando il tuo piano, i carichi, il diario, le misure e gli studi più pertinenti.
- **La settimana in breve** nella schermata Oggi: allenamenti e record, media delle calorie, andamento del peso.
- **Promemoria del mattino** (notifiche push): la seduta del giorno o pesata e pasti nei giorni di riposo.
- **Funziona offline** una volta aperta: l'app si installa sulla schermata Home.

Le regole del motore si basano su 268 studi scientifici verificati su PubMed (raccolta `coach-brain`). Le fonti sono usate internamente e non compaiono nell'interfaccia.

## Chat AI: chiave Gemini

La chat chiama `POST /api/coach`, che inoltra la domanda a Gemini lato server: la chiave resta sul server.

1. Crea una chiave su <https://aistudio.google.com/apikey>.
2. Su Vercel apri il progetto, poi *Settings → Environment Variables* e aggiungi `GEMINI_API_KEY`.
3. Fai un nuovo deploy.

Variabili facoltative:

- `GEMINI_MODEL`: modello da usare. Il predefinito è `gemini-3.8-flash`; se è sovraccarico la chat passa da sola a `gemini-flash-latest`, `gemini-3.5-flash` e `gemini-3.5-flash-lite`.

Senza chiave la chat risponde con le regole locali e lo segnala sotto ogni risposta.

## Account e dati (Supabase)

Con Supabase configurato, all'avvio compare la pagina di accesso: Google oppure email e password.

- Piano, diario e misure vengono salvati nella tabella `app_state`, una riga per utente.
- Le foto vanno nel bucket privato `photos`.
- Le regole di sicurezza permettono a ogni utente di vedere solo i propri dati.
- Il telefono tiene una copia locale per essere veloce. Le copie di più dispositivi vengono unite (per id, con le eliminazioni ricordate), non sovrascritte.
- Con il login attivo, la chat accetta solo utenti autenticati.

Configurazione:

1. Esegui `supabase/schema.sql` nell'editor SQL di Supabase.
2. Su Vercel aggiungi `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` (la chiave pubblica, *publishable* o *anon*).
3. In Supabase, *Authentication → URL Configuration*, imposta l'URL del sito come *Site URL* e come *Redirect URL*.
4. Attiva i provider in *Authentication → Providers*: Email è attivo di default; Google richiede un client OAuth di Google Cloud.

5. Esegui `supabase/products.sql` (prodotti condivisi) e `supabase/v3.sql` (limite giornaliero di Gemini per account e promemoria).

Promemoria: variabili `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` (genera con `npx web-push generate-vapid-keys`) e `CRON_SECRET`; il job `/api/cron/remind` parte ogni mattina da `vercel.json`. Gli errori dei browser finiscono nei log di Vercel con l'etichetta `client-error`.

Senza queste variabili l'app funziona senza account e i dati restano nel browser (`localStorage` e IndexedDB).

## Sviluppo

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # migliaia di profili, carichi, riscaldamento, adattamento, misure, dieta, chat, sincronizzazione
npm run test:ui    # percorso completo su un telefono simulato (Chrome headless), screenshot in .ui-shots/
npm run build
```

Next.js 16, React 19, TypeScript.

Per adulti. Non sostituisce il parere del medico o del dietista.
