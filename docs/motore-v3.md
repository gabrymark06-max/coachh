# Tempra · motore v3

Data: 1° ottobre 2026. Il motore genera un programma di forza, corsa e nutrizione per qualunque adulto a partire dal profilo, lo adatta settimana per settimana e motiva ogni scelta con le schede di `lib/evidence.json` (217 studi sincronizzati da `../coach-brain`).

## Come lavorano i sistemi di riferimento

- **Ipertrofia a volume crescente (Renaissance Periodization, app simili):** volume in serie per muscolo a settimana che parte da un minimo efficace (circa 6–8 serie) e sale verso 12–20 nel corso di un mesociclo di 4–6 settimane, chiuso da uno scarico. [APEC](https://apeccourses.com/understanding-volume-landmarks-mev-mrv-and-mav/), [MaxFit](https://maxfit.ee/en/blog/training-volume-landmarks), [Lift Vault](https://liftvault.com/programs/bodybuilding/mike-israetel-5-week-hypertrophy-workout-spreadsheet/).
- **Piani di corsa adattivi (Runna):** piani scritti da allenatori, poi un algoritmo adatta ritmi e sedute; il volume settimanale cresce con un tetto all'aumento proporzionale al volume attuale. L'algoritmo non è pubblico. [the5krunner](https://the5krunner.com/2026/09/28/is-runna-ai/), [supporto Runna](https://support.runna.com/en/articles/15231838-how-does-runna-build-your-training-plan-around-your-current-fitness).
- **Allenamento ibrido:** sedute dure raggruppate, circa 48 ore tra gambe pesanti e uscita lunga, pesi prima della corsa se nello stesso giorno. [Runlovers](https://runlovers.it/en/2026/hybrid-training-program-running-strength/), [Find Your Edge](https://www.findyouredge.app/news/running-lifting-same-day-complete-guide).

Queste pratiche sono state accettate solo dove le sostengono le schede della biblioteca; i numeri pratici restano scelte del motore, dichiarate come tali.

## Architettura

| File | Responsabilità | Fonti principali (chiavi in `refs.ts`) |
|---|---|---|
| `lib/engine/refs.ts` | Mappa regola → studi; 137 ID verificati dai test | — |
| `lib/engine/program.ts` | Controllo di sicurezza, mesociclo, costruzione della settimana, motivazioni, feedback, revisione settimanale | `screening`, `deload`, `progression`, `load` |
| `lib/engine/strength.ts` | Target di serie per muscolo, split, ripetizioni, RIR, recuperi, scarico, adattamento al tempo | `prescription`, `volume`, `frequency`, `effort`, `rest` |
| `lib/engine/exercises.ts` | 15 famiglie di movimento, varianti per attrezzatura, sostituzioni per zona dolente | `exerciseChoice`, `painLoad` |
| `lib/engine/running.ts` | Corsa/cammino in 11 fasi, volume, uscita lunga, sedute di qualità, gara e scarico pre-gara | `runProgression`, `intensityDistribution`, `intervals`, `taper` |
| `lib/engine/schedule.ts` | Assegna le sedute ai giorni minimizzando i conflitti di recupero | `concurrent`, `order` |
| `lib/engine/nutrition.ts` | Fase, calorie con incertezza, proteine, carboidrati, rifornimento, integratori | `energyEstimate`, `protein`, `carbs`, `fueling`, `supplements`, `reds` |
| `lib/coach.ts` | Risposte del coach e ricerca lessicale nei 217 studi | tutte |

## Regole principali

1. **Sicurezza (ACSM, PAR-Q+).** Sintomi (dolore al petto, capogiri) o condizioni cliniche → nessun programma senza autorizzazione medica. Condizioni note senza autorizzazione → solo intensità moderata. Dolore → programma solo con via libera del professionista, sostituendo gli esercizi per la zona.
2. **Volume di forza.** Serie a settimana per muscolo secondo obiettivo e livello (es. massa: 8/10/12 di partenza, tetto 12/16/20). Conteggio frazionale: le serie indirette dei multiarticolari valgono 0,5 e vengono sottratte ai target di spalle e braccia.
3. **Split.** Corpo intero fino a 3 giorni (sempre per i principianti), poi parte superiore/inferiore e spinta/tirata/gambe: ogni muscolo almeno due volte a settimana.
4. **Sforzo.** RIR 3 per chi inizia, 1–2 per chi è allenato; +1 nella settimana di calibrazione, −1 nell'ultima di crescita, +2 nello scarico.
5. **Mesociclo.** 4 settimane per chi inizia, 5 per gli altri; ultima settimana di scarico con metà serie per esercizio, stessa frequenza.
6. **Corsa.** Chi inizia: corsa/cammino, fase successiva solo dopo una settimana facile e senza dolore. Chi corre: volume iniziale pari a quello recente; +8% a settimana (5–25 minuti) se la settimana è facile; uscita lunga +10% al massimo; 0–2 sedute di qualità per livello, giorni e obiettivo; ultime 2 settimane prima della gara al 40–60% del volume.
7. **Calendario ibrido.** Penalità per gambe pesanti il giorno prima di un'uscita lunga o di qualità, per due sedute dure consecutive e per gli stessi muscoli in giorni consecutivi; uscita lunga nel weekend quando possibile.
8. **Nutrizione.** Mifflin-St Jeor ± 10%, definizione −20%, massa +10%; proteine 1,6–2,2 g/kg (1,8–2,4 in definizione); carboidrati 3–8 g/kg secondo i minuti di corsa; correzione di 100–200 kcal dalla media settimanale del peso.
9. **Feedback.** Doppia progressione dei carichi, sospensione con dolore, meno pressione dopo sedute troppo dure, gradimento, fiducia e tempo come segnali.

## Verifica

`node tests/coach.mjs` genera 3.840 profili (6 obiettivi × 3 livelli × 3 attrezzature × 6 calendari × 5 durate, tutte le combinazioni di giorni) e controlla tempi, giorni, dose di corsa recente, fonti esistenti, sicurezza, progressione per 6 settimane con scarico, nutrizione e chat. Nei programmi generati compaiono 118 studi distinti. Con `TEST_BASE=http://127.0.0.1:5173` verifica anche l'API sul server locale.

## Limiti

Regole esplicite, non un modello addestrato. Le soglie numeriche sono inferenze dalle schede (per lo più abstract) e non sono state validate su utenti reali: l'efficacia di Tempra va misurata con il diario.
