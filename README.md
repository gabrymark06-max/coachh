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

## Dati

Non c'è un account.

- Profilo, piano, diario e misure restano nel browser (`localStorage`).
- Le foto restano nel browser (IndexedDB), compresse.
- Dal profilo puoi esportare i dati (foto escluse), importarli o eliminarli.
- Alla chat vengono inviati solo il riepilogo dei dati e la conversazione, mai le foto.

## Sviluppo

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # migliaia di profili, carichi, riscaldamento, adattamento, misure, dieta, chat
npm run build
```

Next.js 16, React 19, TypeScript.

Per adulti. Non sostituisce il parere del medico o del dietista.
