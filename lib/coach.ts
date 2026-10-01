import type { AppState, Paper } from './types';
import { dayNames } from './types';
import { nutrition, cite, activityFrom } from './planner';
import { phaseNames } from './types';
import evidence from './evidence.json';

const papers = evidence as unknown as Paper[];
const STOP = new Set('il lo la i gli le un uno una di a da in con su per tra fra e o ma se che chi cosa come quando quanto quanta quanti quante perché perche non mi ti si ci vi è sono ho hai ha devo posso fare faccio del della dei delle degli al alla ai alle nel nella nei sul sulla più meno molto poco mio mia miei mie tuo tua questo questa quello quella oggi sempre ancora già solo anche ogni'.split(' '));
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Lexical retrieval over the evidence library: question words against title, topics, finding and coach use. */
export function retrieve(question: string, k = 3) {
  const words = norm(question).split(/[^a-z0-9]+/).filter(w => w.length > 2 && !STOP.has(w));
  if (!words.length) return [];
  return papers
    .map(p => {
      const topics = norm(p.topics.join(' ')), body = norm(`${p.title} ${p.finding} ${p.coach_use}`);
      const score = words.reduce((t, w) => t + (topics.includes(w.slice(0, 6)) ? 3 : 0) + (body.includes(w.slice(0, 6)) ? 1 : 0), 0);
      return { p, score: score + (p.study_type.includes('meta') || p.study_type.includes('umbrella') ? 0.5 : 0) };
    })
    .filter(x => x.score >= 3)
    .sort((a, b) => b.score - a.score || b.p.year - a.p.year)
    .slice(0, k)
    .map(x => x.p);
}

export function answer(text: string, s: AppState): { text: string; sources: string[] } {
  const q = norm(text);
  const p = s.profile, plan = s.plan;
  if (/dolor|infortun|sven|petto|malessere|capogir/.test(q)) return { text: 'Se avverti dolore, interrompi il movimento che lo provoca. Non posso valutarne la causa né prescrivere una riabilitazione. Registralo nel check-in e confrontati con un professionista; per dolore al petto, svenimento o affanno anomalo chiedi assistenza urgente. Quando il professionista ti autorizza, indica zona e conferma nel profilo: adatto esercizi e corsa.', sources: cite('screening', 'painLoad') };
  if (!p || !plan) {
    const hits = retrieve(text);
    return hits.length ? { text: 'Compila il profilo per una risposta personale. Intanto, cosa dicono gli studi della biblioteca:\n\n' + hits.map(h => `• ${h.finding}\n  ${h.coach_use}`).join('\n\n'), sources: hits.map(h => h.id) } : { text: 'Compila il profilo: obiettivo, esperienza, giorni disponibili e attività recente mi servono per costruire la prima settimana.', sources: [] };
  }
  if (plan.blocked) return { text: plan.notes.join('\n\n'), sources: cite('screening') };
  const bp = plan.blueprint;
  if (/ultima|feedback|bilancio|com.?e andata/.test(q)) {
    const l = s.logs.filter(x => plan.sessions.some(y => y.id === x.sessionId)).at(-1);
    return l ? { text: `${p.name}, ultima seduta: ${l.title}.\n\n${l.feedback?.map(d => d.title + ': ' + d.reason).join('\n\n') || 'Nessun riscontro salvato per questa seduta.'}`, sources: [...new Set(l.feedback?.flatMap(d => d.sources) || [])] } : { text: 'Non hai ancora registrato sedute in questo blocco. Dopo ogni allenamento ricevi un riscontro basato sui dati reali.', sources: cite('load') };
  }
  if (/motiv|voglia|noia|ansia|stress|fiduci|ostacol|costanz|abitudin/.test(q)) return { text: `${p.name}, la costanza nasce da sedute semplici, stesso orario e progressi visibili: nelle prime settimane conta presentarsi più dello sforzo. ${p.goalDetail ? `Il tuo obiettivo: «${p.goalDetail}». ` : ''}Se una seduta non ti piace, scegli una variante equivalente; se manca tempo, fai la versione corta e registrala come parziale. Una giornata storta non cancella il percorso.`, sources: cite('habit', 'enjoyment') };
  if (/zon|ritmo|passo|frequenza cardiaca|battit|bpm|soglia/.test(q) && bp) return { text: 'Le tue zone, senza test di laboratorio:\n\n' + bp.zones.map(z => `${z.name}: ${z.talk} · ${z.rpe}${z.hr ? ` · circa ${z.hr}` : ''}. ${z.use}.`).join('\n') + '\n\nLa frequenza cardiaca deriva dalla formula 208 − 0,7 × età e ha un errore di circa ±10 battiti: il test del parlato è più affidabile.', sources: cite('zones') };
  if (/ricompos|massa|bulk|definiz|dimagr|cut|fase|grasso corporeo|vita|circonferenza/.test(q)) {
    const n = nutrition(p, activityFrom(p, plan));
    if (n.blocked) return { text: n.reason, sources: n.sources };
    return { text: `Fase consigliata: ${n.phaseLabel}${n.weeklyChange ? ` · ${n.weeklyChange.toLowerCase()}` : ''}.${n.bodyFat !== null ? ` Grasso corporeo stimato dalla vita: circa ${n.bodyFat.toLocaleString('it-IT')}%.` : ''}

${n.phaseReason}

${n.average ? `Ogni giorno: circa ${n.average.kcal} kcal, ${n.average.protein} g di proteine, ${n.average.carbs} g di carboidrati e ${n.average.fat} g di grassi (più carboidrati nei giorni di allenamento).` : ''}`, sources: n.sources };
  }
  if (/cardio|corr|camminat|passi|bici|ellittic|nuot|vogator/.test(q) && bp) return { text: `${bp.cardioPlan ?? ''}

Nel tuo caso la palestra è la base. Il cardio serve a ${p.goal === 'fat-loss' ? 'aumentare il dispendio e mantenere il peso perso, senza sostituire il deficit della dieta' : p.goal === 'muscle' || p.goal === 'strength' ? 'salute e recupero: dosi moderate non frenano la crescita muscolare' : 'capacità aerobica e salute'}. Fallo a ritmo di conversazione e lontano dalle gambe pesanti; i passi quotidiani contano quanto il cardio.`, sources: cite('cardioFatLoss', 'steps', 'concurrent') };
  if (/protein|calori|dieta|nutriz|mang|carbo|grass|peso|integrat|creatin|caffe|pasto|pasti/.test(q)) {
    const n = nutrition(p, activityFrom(p, plan));
    if (n.blocked) return { text: n.reason, sources: n.sources };
    const tip = /integrat|creatin|caffe/.test(q) ? n.tips.find(t => t.title.startsWith('Integratori')) : /carbo/.test(q) ? n.tips.find(t => t.title.startsWith('Carboidrati')) : /peso/.test(q) ? n.tips.find(t => t.title.startsWith('Come capire')) : n.tips.find(t => t.title.startsWith('Proteine'));
    return { text: `Fase: ${phaseNames[n.phase ?? 'maintain']}. ${n.average ? `Circa ${n.average.kcal} kcal al giorno (${n.training?.kcal} nei giorni di allenamento, ${n.rest?.kcal} in quelli di riposo). ` : ''}${n.protein ? `Proteine ${n.protein.join('–')} g. ` : ''}

${tip ? tip.text : n.reason}

Nella pagina Dieta trovi la giornata tipo con alimenti e grammi.`, sources: [...new Set([...(tip?.sources ?? []), ...n.sources])] };
  }
  if (/stanc|recuper|dorm|sonno|fatic|indolenz/.test(q)) return { text: 'Registra il check-in: sonno, fatica, indolenzimento e dolore. Dopo una notte sotto le 6 ore abbassa l’obiettivo della seduta di qualità o anticipala al mattino. Se due check-in su tre segnalano fatica alta, la revisione settimanale toglie volume. Foam roller e capi compressivi sono facoltativi: aiutano poco.', sources: cite('sleep', 'load', 'overtraining') };
  if (/caric|aument|progress|cediment|rir|serie|ripetiz/.test(q)) return { text: 'RIR significa ripetizioni ancora possibili con tecnica corretta. Registra carico, ripetizioni e RIR per ogni serie. Quando tutte le serie arrivano al limite alto del range con il RIR previsto, propongo un piccolo aumento e riparti dal basso del range. A fine settimana, se le sedute sono complete allo sforzo previsto, aggiungo 1 serie per muscolo; l’ultima settimana del blocco è di scarico.', sources: cite('effort', 'progression', 'volume', 'deload') };
  if (/perch|scienz|studi|font|interferen|piano|programma/.test(q) && bp) return { text: `${bp.summary}\n\n` + bp.pillars.slice(0, 6).map(x => `${x.title}: ${x.detail}`).join('\n\n'), sources: [...new Set(bp.pillars.slice(0, 6).flatMap(x => x.sources))].slice(0, 12) };
  if (/oggi|fare|allen|seduta|corsa|palestra/.test(q)) {
    const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'Europe/Rome' }).format(new Date());
    const day = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(weekday);
    const done = s.logs.filter(x => x.week === plan.week && x.completed !== false).map(x => x.sessionId);
    const session = plan.sessions.filter(x => !done.includes(x.id)).sort((a, b) => ((a.day - day + 7) % 7) - ((b.day - day + 7) % 7))[0];
    if (!session) return { text: 'Hai registrato tutte le sedute della settimana. Apri la revisione settimanale per passare alla prossima.', sources: cite('load') };
    const detail = session.type === 'strength' ? session.exercises.map(e => `${e.name}: ${e.sets} × ${e.low}–${e.high}${e.unit === 'seconds' ? ' s' : ''}${e.family === 'plyo' ? '' : `, RIR ${e.rir}`}, recupero ${e.rest} s${e.load !== null ? `, ${e.load} kg` : ''}`).join('\n') : session.phases.map(x => `${x.minutes} min · ${x.label} — ${x.effort}`).join('\n');
    return { text: `${p.name}, ${session.day === day ? 'oggi hai' : `la prossima è ${dayNames[session.day].toLowerCase()}:`} ${session.title}, circa ${session.duration} minuti.\n\n${session.rationale}${session.adaptation ? '\n\n' + session.adaptation : ''}\n\n${detail}`, sources: session.sources };
  }
  const hits = retrieve(text);
  if (hits.length) return { text: 'Non ho una regola personale per questa domanda, ma ecco cosa dicono gli studi più pertinenti della biblioteca:\n\n' + hits.map(h => `• ${h.finding}\n  Applicazione: ${h.coach_use.replace(/^Inferenza:\s*/i, '')}`).join('\n\n') + '\n\nSono sintesi di studi di gruppo: vanno adattate a te.', sources: hits.map(h => h.id) };
  return { text: 'Posso spiegarti la seduta di oggi, il perché del programma, la fase della dieta, calorie e proteine, cardio e passi, carichi, scarico e recupero. Per altri temi prova parole chiave come «stretching», «creatina», «sonno» o «fame».', sources: [] };
}
