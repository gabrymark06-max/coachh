# Tempra · il tuo coach di palestra e dieta

Tempra ti fa un questionario e costruisce un piano completo per **dimagrire, fare ricomposizione corporea o mettere massa**:

- **Palestra come base:** serie per muscolo, split in base ai giorni, carichi con doppia progressione, blocchi di 4–5 settimane con scarico.
- **Cardio e passi decisi dal coach:** quanto cardio serve per il tuo obiettivo, nella modalità che preferisci (camminata, corsa, bici, ellittica, nuoto, vogatore), in giorni dedicati o a fine seduta, più un obiettivo di passi che cresce gradualmente.
- **Dieta:**
  - fase consigliata (definizione, ricomposizione, mantenimento, massa) in base all'obiettivo e al grasso corporeo stimato dalla circonferenza vita;
  - calorie e macronutrienti diversi per giorni di allenamento e di riposo;
  - giornata tipo con alimenti e grammi, sostituzioni equivalenti;
  - correzioni settimanali dalla media del peso.
- **Coach in chat** e aggiornamento automatico del piano ogni settimana in base a sedute, sforzo, sonno e fatica.

Le regole del motore si basano su 224 studi scientifici verificati su PubMed (raccolta `coach-brain`), usati internamente: le fonti non sono mostrate nell'interfaccia.

## Dati

Non c'è un account: profilo, piano e diario restano nel browser del dispositivo (`localStorage`). Dal profilo puoi esportarli, importarli su un altro dispositivo o eliminarli.

## Sviluppo

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # migliaia di profili, sicurezza, progressione, dieta, chat
npm run build
```

Next.js 16, React 19, TypeScript. Nessuna variabile d'ambiente e nessun database: su Vercel funziona senza configurazione.

Per adulti. Non sostituisce il parere del medico o del dietista.
