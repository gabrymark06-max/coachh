import type { Metadata } from 'next';
import Link from 'next/link';
import { Legal, CONTACT } from '../legal';

export const metadata: Metadata = { title: 'Termini di servizio · Tempra', description: 'Le condizioni per usare Tempra.' };

export default function Terms() {
  return <Legal title="Termini di servizio">
    <p>Usando Tempra accetti queste condizioni.</p>
    <h2>Il servizio</h2>
    <p>Tempra genera piani di allenamento, indicazioni di cardio e dieta e risposte in chat basate sulle informazioni che inserisci e su studi scientifici. Il servizio è gratuito e fornito «così com’è»: può cambiare, avere interruzioni o errori.</p>
    <h2>Non è un consiglio medico</h2>
    <p>Le indicazioni sono generali e non sostituiscono il parere di un medico, di un fisioterapista o di un dietista. Prima di iniziare, specialmente in presenza di malattie, gravidanza, farmaci o dolore, consulta un professionista. Interrompi l’attività e chiedi assistenza in caso di dolore al petto, svenimento, affanno anomalo o dolore che peggiora. Ti alleni sotto la tua responsabilità.</p>
    <h2>Il tuo account</h2>
    <ul>
      <li>Devi avere almeno 18 anni.</li>
      <li>Sei responsabile della sicurezza del tuo accesso e dell’esattezza dei dati che inserisci.</li>
      <li>Non usare il servizio per scopi illeciti né per caricare contenuti di altre persone senza il loro consenso.</li>
    </ul>
    <h2>Chat con intelligenza artificiale</h2>
    <p>Le risposte del coach in chat sono generate automaticamente e possono contenere errori: verifica le indicazioni importanti.</p>
    <h2>Responsabilità</h2>
    <p>Nei limiti consentiti dalla legge, il titolare non risponde di danni derivanti dall’uso del servizio o dalle indicazioni fornite.</p>
    <h2>Privacy</h2>
    <p>Il trattamento dei dati è descritto nell’<Link href="/privacy">informativa sulla privacy</Link>.</p>
    <h2>Contatti</h2>
    <p><a href={`mailto:${CONTACT}`}>{CONTACT}</a></p>
  </Legal>;
}
