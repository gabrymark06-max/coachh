# Tempra · il tuo coach di palestra e dieta

Tempra ti fa un questionario e costruisce un piano completo per **dimagrire, fare ricomposizione corporea o mettere massa**:

- **Palestra come base:**
  - serie per muscolo e split in base ai giorni;
  - oltre 130 esercizi con la tecnica: pesi liberi, multipower, macchine, cavi, corpo libero;
  - blocchi di 4–5 settimane con scarico; dal secondo blocco gli esercizi accessori cambiano, quelli principali restano per confrontare i progressi.
- **Riscaldamento specifico per ogni seduta:** cardio leggero, esercizi di mobilità per le articolazioni del giorno e serie di avvicinamento calcolate sul carico di lavoro.
- **Carico consigliato per ogni esercizio**, calcolato su quello che hai fatto l'ultima volta (doppia progressione regolata dal RIR):
  - completi il range → sale il peso;
  - resti sotto il range → scende;
  - cambia il range di ripetizioni → conversione tramite il massimale stimato.
- **Adattamento settimanale:** serie per muscolo regolate da completamento, sforzo, check-in e andamento della forza stimata di ogni muscolo.
- **Timer di recupero** che parte quando spunti una serie.
- **Cardio e passi decisi dal coach** in base all'obiettivo.
- **Progressi:**
  - peso, vita, petto, braccio, coscia e fianchi con grafici;
  - grasso stimato;
  - forza stimata per esercizio;
  - foto (fronte, lato, dietro) con confronto prima/dopo, affiancato o a scorrimento.
- **Dieta:** fase, calorie, macronutrienti, giornata tipo e correzioni dalla media del peso.
- **Coach in chat con Gemini (Google AI):** risponde usando il tuo piano, i carichi, il diario, le misure e gli studi più pertinenti.

Le regole del motore si basano su 257 studi scientifici verificati su PubMed (raccolta `coach-brain`). Le fonti sono usate internamente e non compaiono nell'interfaccia.

## Chat AI: chiave Gemini

La chat chiama `POST /api/coach`, che inoltra la domanda a Gemini lato server: la chiave resta sul server.

1. Crea una chiave su <https://aistudio.google.com/apikey>.
2. Su Vercel apri il progetto, poi *Settings → Environment Variables* e aggiungi `GEMINI_API_KEY`.
3. Fai un nuovo deploy.

Variabili facoltative:

- `GEMINI_MODEL`: modello da usare. Il predefinito è `gemini-flash-latest`, l'ultimo modello Flash.

Senza chiave la chat risponde con le regole locali e lo segnala sotto ogni risposta.

## Account e dati (Supabase)

Con Supabase configurato, all'avvio compare la pagina di accesso: Google, Apple oppure email e password.

- Piano, diario e misure vengono salvati nella tabella `app_state`, una riga per utente.
- Le foto vanno nel bucket privato `photos`.
- Le regole di sicurezza permettono a ogni utente di vedere solo i propri dati.
- Il telefono tiene una copia locale per essere veloce.
- Con il login attivo, la chat accetta solo utenti autenticati.

Configurazione:

1. Esegui `supabase/schema.sql` nell'editor SQL di Supabase.
2. Su Vercel aggiungi `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` (la chiave pubblica, *publishable* o *anon*).
3. In Supabase, *Authentication → URL Configuration*, imposta l'URL del sito come *Site URL* e come *Redirect URL*.
4. Attiva i provider in *Authentication → Providers*: Email è attivo di default; Google richiede un client OAuth di Google Cloud; Apple richiede l'Apple Developer Program.

Senza queste variabili l'app funziona senza account e i dati restano nel browser (`localStorage` e IndexedDB).

## Sviluppo

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # migliaia di profili, carichi, riscaldamento, adattamento, misure, dieta, chat
npm run build
```

Next.js 16, React 19, TypeScript.

Per adulti. Non sostituisce il parere del medico o del dietista.
