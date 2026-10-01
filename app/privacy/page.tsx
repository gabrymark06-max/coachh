import type { Metadata } from 'next';
import { Legal, CONTACT } from '../legal';

export const metadata: Metadata = { title: 'Privacy · Tempra', description: 'Come Tempra tratta i tuoi dati.' };

export default function Privacy() {
  return <Legal title="Informativa sulla privacy">
    <p>Tempra è un’app personale di allenamento, dieta e monitoraggio dei progressi. Questa pagina spiega quali dati raccoglie, perché e come puoi cancellarli.</p>
    <h2>Dati che raccogliamo</h2>
    <ul>
      <li><b>Account:</b> email e, se accedi con Google, nome e immagine del profilo forniti da Google. Non riceviamo la tua password di Google.</li>
      <li><b>Dati che inserisci:</b> risposte al questionario (età, sesso, peso, altezza, circonferenza vita, obiettivi, disponibilità, eventuali zone di dolore), piano di allenamento, diario delle sedute con carichi e ripetizioni, check-in, misure corporee, messaggi alla chat del coach.</li>
      <li><b>Foto di progresso:</b> solo quelle che carichi tu, in un archivio privato accessibile solo al tuo account.</li>
    </ul>
    <h2>Perché li usiamo</h2>
    <p>Solo per far funzionare il coach: costruire e adattare il piano, calcolare i carichi, mostrarti i progressi e rispondere in chat. Non vendiamo i dati, non li usiamo per pubblicità e non li condividiamo con altri, salvo i fornitori tecnici qui sotto.</p>
    <h2>Dove sono conservati</h2>
    <ul>
      <li><b>Supabase</b> (database e archivio foto, server nell’Unione europea, Francoforte): account, dati dell’app e foto. Ogni utente può leggere e modificare solo i propri dati.</li>
      <li><b>Vercel</b>: ospita il sito.</li>
      <li><b>Google Gemini API</b>: quando scrivi al coach in chat, la domanda, la conversazione e un riepilogo del tuo piano, diario e misure vengono inviati a Google per generare la risposta. Le foto non vengono mai inviate.</li>
      <li>Il tuo dispositivo conserva una copia locale per far funzionare l’app più velocemente; viene cancellata quando esci dall’account.</li>
    </ul>
    <h2>Dati sulla salute</h2>
    <p>Peso, misure, dolore e informazioni mediche che scegli di inserire sono dati sensibili: li tratti tu, su base volontaria, solo per ricevere un piano adatto a te. Tempra non è un dispositivo medico e non sostituisce il parere di un medico o di un dietista.</p>
    <h2>Cancellazione e diritti</h2>
    <p>Dal profilo, con «Elimina tutto», cancelli profilo, piano, diario, misure e foto dal tuo account. Puoi anche esportare i dati. Per cancellare l’account, accedere ai dati o esercitare gli altri diritti previsti dal GDPR (rettifica, limitazione, portabilità, opposizione, reclamo al Garante) scrivi a <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.</p>
    <h2>Età</h2>
    <p>Tempra è riservata agli adulti (18 anni o più).</p>
    <h2>Contatti</h2>
    <p>Titolare: Gabriele Marchesini · <a href={`mailto:${CONTACT}`}>{CONTACT}</a></p>
  </Legal>;
}
