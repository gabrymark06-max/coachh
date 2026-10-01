import type { PainArea, Profile } from '../types';

export type Muscle = 'quads' | 'hamstrings' | 'glutes' | 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps' | 'calves' | 'core';
export const muscleNames: Record<Muscle, string> = {
  quads: 'Quadricipiti', hamstrings: 'Femorali', glutes: 'Glutei', chest: 'Petto', back: 'Dorso',
  shoulders: 'Spalle', biceps: 'Bicipiti', triceps: 'Tricipiti', calves: 'Polpacci', core: 'Tronco',
};
export const muscles = Object.keys(muscleNames) as Muscle[];
type Equipment = Profile['equipment'];

/** One exercise with how to perform it. `stretch` = loads the muscle at long lengths (linked to more growth). */
export type ExerciseDef = {
  name: string; eq: Equipment[]; level: 1 | 2 | 3; stable?: boolean; stretch?: boolean; barbell?: boolean;
  setup: string; steps: string[]; mistakes: string[];
};
export type Family = {
  key: string; label: string; muscles: Partial<Record<Muscle, number>>; list: ExerciseDef[];
  /** Replacement names when a cleared pain area is present; empty array = skip the family. */
  pain?: Partial<Record<PainArea, string[]>>; unit?: 'reps' | 'seconds'; cue: string;
};

const G: Equipment[] = ['gym'], GD: Equipment[] = ['gym', 'dumbbells'], ALL: Equipment[] = ['gym', 'dumbbells', 'bodyweight'], DB: Equipment[] = ['dumbbells', 'bodyweight'];

export const families: Record<string, Family> = {
  squat: {
    key: 'squat', label: 'Squat', muscles: { quads: 1, glutes: 0.5 }, cue: 'Scendi sotto il parallelo se riesci a mantenere la schiena neutra: lo squat profondo fa crescere di più glutei e adduttori.',
    pain: { knee: ['Leg press'], back: ['Leg press', 'Hack squat'], hip: ['Leg press'] },
    list: [
      { name: 'Squat con bilanciere', eq: G, level: 3, barbell: true, stretch: true, setup: 'Bilanciere sui trapezi, piedi poco più larghi delle spalle e punte leggermente aperte.', steps: ['Inspira e contrai l’addome', 'Scendi portando indietro le anche e piegando le ginocchia insieme', 'Arriva sotto il parallelo con la schiena neutra', 'Risali spingendo con tutto il piede'], mistakes: ['Ginocchia che cedono verso l’interno', 'Talloni che si alzano', 'Schiena che si arrotonda in fondo'] },
      { name: 'Hack squat', eq: G, level: 2, stable: true, stretch: true, setup: 'Schiena appoggiata allo schienale, piedi a metà pedana alla larghezza delle spalle.', steps: ['Sblocca le sicure', 'Scendi lentamente finché le cosce superano il parallelo', 'Spingi senza bloccare del tutto le ginocchia'], mistakes: ['Discesa corta', 'Bacino che si stacca dallo schienale'] },
      { name: 'Leg press', eq: G, level: 1, stable: true, stretch: true, setup: 'Schiena e bacino ben appoggiati, piedi a metà pedana alla larghezza delle spalle.', steps: ['Sblocca le sicure', 'Porta le ginocchia verso il petto senza staccare il bacino', 'Spingi senza bloccare le ginocchia'], mistakes: ['Bacino che si solleva in fondo', 'Ginocchia bloccate in alto'] },
      { name: 'Squat goblet', eq: GD, level: 1, stretch: true, setup: 'Manubrio verticale stretto al petto, gomiti in basso.', steps: ['Scendi tra le ginocchia con il busto alto', 'Gomiti dentro le ginocchia in fondo', 'Risali spingendo dai talloni'], mistakes: ['Busto che crolla in avanti', 'Talloni che si alzano'] },
      { name: 'Squat bulgaro', eq: ALL, level: 2, stretch: true, setup: 'Piede posteriore su una panca, quello anteriore circa un passo avanti.', steps: ['Scendi in verticale finché il ginocchio posteriore sfiora terra', 'Busto leggermente inclinato in avanti', 'Risali spingendo con il piede anteriore'], mistakes: ['Passo troppo corto', 'Ginocchio anteriore che cede verso l’interno'] },
      { name: 'Squat a corpo libero', eq: DB, level: 1, setup: 'Piedi alla larghezza delle spalle, braccia avanti.', steps: ['Scendi il più in basso possibile con schiena neutra', 'Risali lentamente', 'Quando diventa facile, rallenta la discesa a 3 secondi'], mistakes: ['Discesa a metà', 'Ginocchia verso l’interno'] },
    ],
  },
  hinge: {
    key: 'hinge', label: 'Anca', muscles: { hamstrings: 1, glutes: 1 }, cue: 'Movimento d’anca: il bacino va indietro, la schiena resta neutra, senti l’allungamento dei femorali.',
    pain: { back: ['Hip thrust', 'Ponte glutei'] },
    list: [
      { name: 'Stacco rumeno con bilanciere', eq: G, level: 3, barbell: true, stretch: true, setup: 'In piedi, bilanciere in presa prona davanti alle cosce, ginocchia leggermente piegate.', steps: ['Porta indietro le anche facendo scivolare il bilanciere lungo le cosce', 'Scendi fino a metà tibia o finché la schiena resta neutra', 'Risali spingendo le anche in avanti'], mistakes: ['Schiena arrotondata', 'Bilanciere lontano dalle gambe', 'Piegare troppo le ginocchia'] },
      { name: 'Stacco da terra', eq: G, level: 3, barbell: true, setup: 'Bilanciere sopra metà piede, presa appena fuori dalle gambe, tibie vicine alla sbarra.', steps: ['Inspira, irrigidisci il tronco e tira via la flessione dalla sbarra', 'Spingi il pavimento con le gambe tenendo la sbarra vicina', 'Chiudi le anche in alto senza iperestendere'], mistakes: ['Schiena che si arrotonda allo stacco', 'Anche che salgono prima delle spalle'] },
      { name: 'Hip thrust', eq: G, level: 2, stable: true, setup: 'Parte alta della schiena su una panca, bilanciere o macchina sulle anche, piedi alla larghezza delle anche.', steps: ['Spingi con i talloni sollevando il bacino', 'In alto busto e cosce in linea, pausa di un secondo', 'Scendi controllando'], mistakes: ['Inarcare la zona lombare invece di estendere l’anca', 'Piedi troppo lontani'] },
      { name: 'Stacco rumeno con manubri', eq: GD, level: 2, stretch: true, setup: 'Manubri davanti alle cosce, ginocchia morbide.', steps: ['Anche indietro, manubri lungo le gambe', 'Scendi finché la schiena resta neutra', 'Risali contraendo i glutei'], mistakes: ['Schiena arrotondata', 'Manubri lontani dal corpo'] },
      { name: 'Hip thrust con manubrio', eq: DB, level: 1, setup: 'Schiena su divano o panca, manubrio sulle anche.', steps: ['Solleva il bacino spingendo con i talloni', 'Pausa in alto', 'Scendi lentamente'], mistakes: ['Lombare inarcata'] },
      { name: 'Hip hinge su una gamba', eq: ['bodyweight'], level: 2, stretch: true, setup: 'In piedi su una gamba, l’altra leggermente indietro.', steps: ['Inclina il busto in avanti mentre la gamba libera va indietro', 'Scendi finché senti i femorali', 'Risali spingendo il piede a terra'], mistakes: ['Bacino che ruota', 'Schiena curva'] },
      { name: 'Ponte glutei', eq: ['bodyweight'], level: 1, setup: 'Supino, ginocchia piegate, piedi vicini ai glutei.', steps: ['Solleva il bacino', 'Pausa in alto stringendo i glutei', 'Scendi lentamente'], mistakes: ['Spinta con la schiena invece che con i glutei'] },
    ],
  },
  lunge: {
    key: 'lunge', label: 'Monopodalico', muscles: { quads: 1, glutes: 1 }, cue: 'Busto stabile e ginocchio in linea con il piede; usa un appoggio se serve equilibrio.',
    pain: { knee: ['Step-up basso'], hip: ['Step-up basso'] },
    list: [
      { name: 'Affondi indietro con manubri', eq: GD, level: 2, stretch: true, setup: 'In piedi con un manubrio per mano.', steps: ['Fai un passo lungo all’indietro', 'Scendi finché il ginocchio posteriore sfiora terra', 'Torna su spingendo con la gamba davanti'], mistakes: ['Passo corto', 'Busto che oscilla'] },
      { name: 'Step-up con manubri', eq: GD, level: 1, setup: 'Davanti a una panca o un gradino all’altezza del ginocchio.', steps: ['Appoggia tutto il piede sul gradino', 'Sali spingendo solo con quella gamba', 'Scendi controllando'], mistakes: ['Spinta con la gamba a terra'] },
      { name: 'Affondi indietro', eq: ['bodyweight'], level: 1, setup: 'In piedi, mani sui fianchi.', steps: ['Passo lungo indietro', 'Scendi in verticale', 'Torna su'], mistakes: ['Ginocchio che cede verso l’interno'] },
      { name: 'Step-up basso', eq: ALL, level: 1, setup: 'Gradino basso, a un’altezza che non provoca fastidio.', steps: ['Sali con controllo', 'Scendi lentamente'], mistakes: ['Altezza eccessiva'] },
    ],
  },
  kneeExt: {
    key: 'kneeExt', label: 'Estensione ginocchio', muscles: { quads: 1 }, cue: 'È l’unico esercizio che fa crescere bene il retto femorale: schienale un po’ reclinato, discesa controllata.',
    pain: { knee: ['Leg extension ad ampiezza parziale'] },
    list: [
      { name: 'Leg extension', eq: G, level: 1, stable: true, stretch: true, setup: 'Ginocchia allineate al perno della macchina, rullo sopra le caviglie, schienale leggermente reclinato.', steps: ['Estendi le gambe senza slancio', 'Pausa breve in alto', 'Scendi in 2–3 secondi fino a ginocchio ben piegato'], mistakes: ['Slancio', 'Bacino che si solleva dal sedile'] },
      { name: 'Leg extension ad ampiezza parziale', eq: G, level: 1, stable: true, setup: 'Come la leg extension, limitando l’ampiezza alla parte senza fastidio.', steps: ['Lavora nell’arco tollerato', 'Discesa lenta'], mistakes: ['Forzare la zona dolente'] },
    ],
  },
  kneeFlex: {
    key: 'kneeFlex', label: 'Flessione ginocchio', muscles: { hamstrings: 1 }, cue: 'Il leg curl da seduto fa crescere i femorali più di quello da sdraiato: preferiscilo se c’è.',
    list: [
      { name: 'Leg curl seduto', eq: G, level: 1, stable: true, stretch: true, setup: 'Busto inclinato in avanti, cuscinetto ben stretto sopra le ginocchia, rullo sopra i talloni.', steps: ['Piega le ginocchia portando i talloni sotto il sedile', 'Pausa breve', 'Torna su in 2–3 secondi fino a gamba quasi tesa'], mistakes: ['Bacino che scivola in avanti', 'Ritorno veloce'] },
      { name: 'Leg curl sdraiato', eq: G, level: 1, stable: true, setup: 'Prono, ginocchia appena fuori dal bordo, bacino schiacciato sulla panca.', steps: ['Porta i talloni verso i glutei', 'Scendi lentamente'], mistakes: ['Bacino che si alza'] },
      { name: 'Nordic curl assistito', eq: DB, level: 3, stretch: true, setup: 'In ginocchio su un cuscino, caviglie bloccate sotto un mobile o da un compagno.', steps: ['Scendi in avanti il più lentamente possibile', 'Frena con le mani quando non riesci più', 'Risali aiutandoti con le mani'], mistakes: ['Piegare le anche'] },
      { name: 'Ponte con talloni su panca', eq: DB, level: 1, setup: 'Supino, talloni su una panca o una sedia, gambe quasi tese.', steps: ['Solleva il bacino spingendo con i talloni', 'Pausa', 'Scendi lentamente'], mistakes: ['Gambe troppo piegate'] },
    ],
  },
  calves: {
    key: 'calves', label: 'Polpacci', muscles: { calves: 1 }, cue: 'Scendi bene con il tallone e fai una pausa in basso: la parte in allungamento fa crescere di più il polpaccio.',
    pain: { achilles: ['Calf raise lento a ampiezza tollerata'], shin: ['Calf raise lento a ampiezza tollerata'] },
    list: [
      { name: 'Calf raise in piedi', eq: G, level: 1, stable: true, stretch: true, setup: 'Avampiedi sul bordo della pedana, ginocchia quasi tese.', steps: ['Scendi con il tallone il più in basso possibile', 'Pausa di 1–2 secondi in basso', 'Sali in punta senza rimbalzare'], mistakes: ['Rimbalzo in basso', 'Ampiezza corta'] },
      { name: 'Calf raise alla pressa', eq: G, level: 1, stable: true, stretch: true, setup: 'Avampiedi sul bordo basso della pedana della leg press.', steps: ['Lascia scendere i talloni', 'Pausa in allungamento', 'Spingi in punta'], mistakes: ['Ginocchia che si piegano'] },
      { name: 'Calf raise su gradino', eq: DB, level: 1, stretch: true, setup: 'Avampiede su un gradino, una mano al muro, manubrio nell’altra mano se ce l’hai.', steps: ['Tallone giù al massimo', 'Pausa', 'Sali in punta'], mistakes: ['Movimento veloce'] },
      { name: 'Calf raise lento a ampiezza tollerata', eq: ALL, level: 1, setup: 'Su gradino o pavimento, nell’ampiezza che non dà fastidio.', steps: ['3 secondi su, 3 secondi giù'], mistakes: ['Forzare il dolore'] },
    ],
  },
  hpush: {
    key: 'hpush', label: 'Spinta orizzontale', muscles: { chest: 1, triceps: 0.5, shoulders: 0.5 }, cue: 'Scapole addotte e depresse, gomiti a circa 45° dal busto; alterna panca piana e inclinata nella settimana.',
    pain: { shoulder: ['Chest press', 'Push-up inclinati'] },
    list: [
      { name: 'Panca piana con bilanciere', eq: G, level: 3, barbell: true, stretch: true, setup: 'Occhi sotto il bilanciere, scapole strette, piedi a terra, presa poco più larga delle spalle.', steps: ['Stacca il bilanciere a braccia tese', 'Scendi verso la parte bassa del petto in 2 secondi', 'Spingi in su e leggermente indietro'], mistakes: ['Gomiti a 90° dal busto', 'Rimbalzo sul petto', 'Glutei che si staccano'] },
      { name: 'Panca inclinata con manubri', eq: GD, level: 2, stretch: true, setup: 'Panca a 30°, manubri sopra il petto, scapole strette.', steps: ['Scendi aprendo i gomiti a circa 45°', 'Senti l’allungamento del petto in basso', 'Spingi unendo leggermente i manubri'], mistakes: ['Inclinazione troppo alta', 'Ampiezza corta'] },
      { name: 'Chest press', eq: G, level: 1, stable: true, setup: 'Sedile regolato con le maniglie all’altezza della parte bassa del petto.', steps: ['Spingi senza staccare le scapole', 'Ritorna lentamente fino a sentire l’allungamento'], mistakes: ['Spalle che vanno in avanti'] },
      { name: 'Panca con manubri', eq: GD, level: 2, stretch: true, setup: 'Su panca piana, manubri sopra il petto.', steps: ['Scendi fino a sentire il petto allungato', 'Spingi in su'], mistakes: ['Gomiti troppo aperti'] },
      { name: 'Push-up', eq: ['bodyweight', 'dumbbells'], level: 2, setup: 'Mani poco più larghe delle spalle, corpo in linea dalla testa ai talloni.', steps: ['Scendi con il petto a pochi cm da terra', 'Gomiti a 45°', 'Spingi mantenendo il corpo rigido'], mistakes: ['Bacino che cade', 'Mezza ripetizione'] },
      { name: 'Push-up inclinati', eq: ['bodyweight'], level: 1, setup: 'Mani su un tavolo o una panca, corpo in linea.', steps: ['Scendi con il petto verso il bordo', 'Spingi'], mistakes: ['Bacino che cade'] },
    ],
  },
  fly: {
    key: 'fly', label: 'Croci', muscles: { chest: 1 }, cue: 'Isolamento del petto: braccia leggermente piegate, apri finché senti l’allungamento.',
    pain: { shoulder: [] },
    list: [
      { name: 'Croci ai cavi', eq: G, level: 1, stable: true, stretch: true, setup: 'Cavi all’altezza delle spalle, un passo avanti, gomiti morbidi.', steps: ['Apri le braccia fino a sentire il petto allungato', 'Chiudi davanti al petto come per abbracciare', 'Ritorna lentamente'], mistakes: ['Piegare troppo i gomiti trasformandolo in una spinta'] },
      { name: 'Pec deck', eq: G, level: 1, stable: true, stretch: true, setup: 'Maniglie all’altezza del petto, schiena appoggiata.', steps: ['Chiudi le braccia', 'Ritorna in 2–3 secondi fino all’allungamento'], mistakes: ['Spalle che salgono'] },
      { name: 'Croci con manubri', eq: GD, level: 2, stretch: true, setup: 'Su panca piana o leggermente inclinata, manubri sopra il petto.', steps: ['Apri con gomiti morbidi', 'Fermati quando senti l’allungamento', 'Chiudi senza far toccare i manubri'], mistakes: ['Scendere troppo con carichi alti'] },
    ],
  },
  vpush: {
    key: 'vpush', label: 'Spinta verticale', muscles: { shoulders: 1, triceps: 0.5 }, cue: 'Spingi sopra la testa senza inarcare la schiena; addome contratto.',
    pain: { shoulder: [] },
    list: [
      { name: 'Shoulder press con manubri', eq: GD, level: 2, setup: 'Seduto con schienale verticale, manubri all’altezza delle orecchie.', steps: ['Spingi in alto fino a braccia quasi tese', 'Scendi fino all’altezza del mento'], mistakes: ['Schiena inarcata', 'Gomiti troppo indietro'] },
      { name: 'Shoulder press alla macchina', eq: G, level: 1, stable: true, setup: 'Sedile con le maniglie all’altezza delle spalle.', steps: ['Spingi in alto', 'Ritorna lentamente'], mistakes: ['Spalle alle orecchie'] },
      { name: 'Pike push-up', eq: ['bodyweight'], level: 2, setup: 'Posizione di push-up con il bacino alto, a V rovesciata.', steps: ['Piega i gomiti portando la testa verso terra davanti alle mani', 'Spingi'], mistakes: ['Gomiti troppo aperti'] },
    ],
  },
  hpull: {
    key: 'hpull', label: 'Tirata orizzontale', muscles: { back: 1, biceps: 0.5 }, cue: 'Tira con i gomiti verso i fianchi e lascia allungare la schiena nel ritorno.',
    pain: { back: ['Rematore con supporto al petto', 'Rematore al cavo'] },
    list: [
      { name: 'Rematore con supporto al petto', eq: G, level: 1, stable: true, stretch: true, setup: 'Petto appoggiato al cuscinetto, presa neutra.', steps: ['Tira i gomiti indietro stringendo le scapole', 'Pausa', 'Lascia allungare le braccia in avanti'], mistakes: ['Staccare il petto dal supporto'] },
      { name: 'Rematore al cavo', eq: G, level: 1, stable: true, stretch: true, setup: 'Seduto, piedi sulla pedana, ginocchia morbide, busto dritto.', steps: ['Tira la maniglia verso l’ombelico', 'Ritorna lasciando avanzare le spalle'], mistakes: ['Oscillare con il busto'] },
      { name: 'Rematore con manubrio', eq: GD, level: 2, stretch: true, setup: 'Mano e ginocchio su una panca, schiena piatta.', steps: ['Tira il manubrio verso il fianco', 'Scendi fino a braccio teso'], mistakes: ['Ruotare il busto per tirare'] },
      { name: 'Rematore inverso sotto un tavolo', eq: ['bodyweight'], level: 2, setup: 'Sotto un tavolo robusto, mani sul bordo, corpo rigido.', steps: ['Tira il petto verso il bordo', 'Scendi lentamente'], mistakes: ['Bacino che cade'] },
      { name: 'Prone Y raise', eq: ['bodyweight'], level: 1, setup: 'Prono, braccia avanti a Y, pollici in su.', steps: ['Solleva le braccia stringendo le scapole', 'Scendi lentamente'], mistakes: ['Inarcare la schiena'] },
    ],
  },
  vpull: {
    key: 'vpull', label: 'Tirata verticale', muscles: { back: 1, biceps: 0.5 }, cue: 'Porta i gomiti verso i fianchi e lascia salire le braccia fino in alto per allungare il dorsale.',
    list: [
      { name: 'Lat machine', eq: G, level: 1, stable: true, stretch: true, setup: 'Cosce bloccate, presa poco più larga delle spalle.', steps: ['Tira la barra verso la parte alta del petto', 'Petto in fuori, gomiti verso i fianchi', 'Risali fino a braccia tese'], mistakes: ['Tirare dietro la nuca', 'Oscillare all’indietro'] },
      { name: 'Trazioni assistite', eq: G, level: 2, stretch: true, setup: 'Ginocchia sul supporto della macchina assistita, presa poco più larga delle spalle.', steps: ['Parti da braccia tese', 'Sali fino al mento sopra la sbarra', 'Scendi lentamente'], mistakes: ['Mezze ripetizioni'] },
      { name: 'Trazioni con elastico', eq: DB, level: 2, stretch: true, setup: 'Elastico agganciato alla sbarra sotto un piede o un ginocchio.', steps: ['Parti appeso', 'Sali con il petto verso la sbarra', 'Scendi controllando'], mistakes: ['Slancio con le gambe'] },
      { name: 'Pullover con manubrio', eq: DB, level: 1, stretch: true, setup: 'Schiena sulla panca, manubrio tenuto con due mani sopra il petto.', steps: ['Porta il manubrio dietro la testa a braccia quasi tese', 'Ritorna sopra il petto'], mistakes: ['Piegare troppo i gomiti'] },
    ],
  },
  lateral: {
    key: 'lateral', label: 'Alzate laterali', muscles: { shoulders: 1 }, cue: 'Carico leggero, sali fino all’altezza delle spalle senza slancio: manubri e cavo funzionano allo stesso modo.',
    pain: { shoulder: ['Alzate laterali leggere fino a 60°'] },
    list: [
      { name: 'Alzate laterali con manubri', eq: GD, level: 1, setup: 'In piedi, leggera inclinazione in avanti, gomiti morbidi.', steps: ['Alza le braccia di lato fino all’altezza delle spalle', 'Scendi in 2–3 secondi'], mistakes: ['Slancio con il busto', 'Spalle che salgono verso le orecchie'] },
      { name: 'Alzate laterali al cavo', eq: G, level: 1, stretch: true, setup: 'Cavo basso dietro il corpo, maniglia nella mano opposta.', steps: ['Alza il braccio di lato', 'Ritorna lasciando il braccio passare davanti al corpo'], mistakes: ['Ruotare il busto'] },
      { name: 'Alzate laterali con elastico', eq: ['bodyweight'], level: 1, setup: 'Elastico sotto i piedi.', steps: ['Alza le braccia di lato', 'Scendi lentamente'], mistakes: ['Slancio'] },
      { name: 'Alzate laterali leggere fino a 60°', eq: ALL, level: 1, setup: 'Carico molto leggero.', steps: ['Alza solo fino a 60° circa', 'Scendi lentamente'], mistakes: ['Andare oltre l’arco senza fastidio'] },
    ],
  },
  rearDelt: {
    key: 'rearDelt', label: 'Deltoide posteriore', muscles: { shoulders: 1, back: 0.5 }, cue: 'Muscolo spesso trascurato: equilibra le spinte e aiuta la postura delle spalle.',
    list: [
      { name: 'Face pull al cavo', eq: G, level: 1, stable: true, setup: 'Cavo all’altezza del viso con la corda.', steps: ['Tira la corda verso la fronte aprendo i gomiti', 'Ruota le mani all’indietro alla fine', 'Ritorna lentamente'], mistakes: ['Tirare con la schiena'] },
      { name: 'Reverse fly alla macchina', eq: G, level: 1, stable: true, setup: 'Petto contro lo schienale della pec deck, maniglie davanti.', steps: ['Apri le braccia all’indietro', 'Ritorna lentamente'], mistakes: ['Stringere troppo le scapole usando il trapezio'] },
      { name: 'Alzate posteriori con manubri', eq: DB, level: 1, setup: 'Busto inclinato in avanti, manubri sotto le spalle.', steps: ['Apri le braccia di lato', 'Scendi lentamente'], mistakes: ['Slancio'] },
    ],
  },
  biceps: {
    key: 'biceps', label: 'Bicipiti', muscles: { biceps: 1 }, cue: 'Cura la parte bassa con il gomito quasi esteso: è quella che fa crescere di più.',
    list: [
      { name: 'Curl su panca inclinata', eq: GD, level: 1, stretch: true, setup: 'Panca a 45–60°, braccia lungo il corpo e un po’ indietro.', steps: ['Piega i gomiti senza spostarli in avanti', 'Scendi fino a braccio quasi teso'], mistakes: ['Spostare le spalle in avanti'] },
      { name: 'Curl alla panca Scott', eq: GD, level: 1, stable: true, stretch: true, setup: 'Ascelle sul bordo del cuscino, braccia appoggiate.', steps: ['Piega i gomiti', 'Scendi lentamente fino a braccio quasi teso'], mistakes: ['Lasciar cadere il peso in basso'] },
      { name: 'Curl al cavo', eq: G, level: 1, stable: true, setup: 'Cavo basso, gomiti fermi ai fianchi.', steps: ['Piega i gomiti', 'Ritorna completamente'], mistakes: ['Gomiti che avanzano'] },
      { name: 'Curl con manubri', eq: GD, level: 1, setup: 'In piedi, gomiti ai fianchi.', steps: ['Curl ruotando il palmo verso l’alto', 'Scendi fino in fondo'], mistakes: ['Slancio con la schiena'] },
      { name: 'Curl a martello', eq: GD, level: 1, setup: 'Presa neutra, gomiti ai fianchi.', steps: ['Porta il manubrio verso la spalla', 'Scendi lentamente'], mistakes: ['Slancio'] },
      { name: 'Curl con elastico', eq: ['bodyweight'], level: 1, setup: 'Elastico sotto i piedi.', steps: ['Curl lento', 'Scendi fino in fondo'], mistakes: ['Ampiezza corta'] },
    ],
  },
  triceps: {
    key: 'triceps', label: 'Tricipiti', muscles: { triceps: 1 }, cue: 'Le estensioni sopra la testa fanno crescere il tricipite circa 1,5 volte più dei push-down.',
    pain: { shoulder: ['Push-down al cavo', 'Push-up stretti inclinati'] },
    list: [
      { name: 'Estensioni sopra la testa al cavo', eq: G, level: 1, stable: true, stretch: true, setup: 'Di spalle al cavo con la corda, braccia sopra la testa, gomiti in avanti.', steps: ['Estendi i gomiti in avanti e in alto', 'Ritorna lasciando scendere le mani dietro la testa'], mistakes: ['Gomiti che si aprono', 'Inarcare la schiena'] },
      { name: 'Estensioni con manubrio sopra la testa', eq: GD, level: 1, stretch: true, setup: 'Seduto, un manubrio tenuto con due mani sopra la testa.', steps: ['Scendi dietro la testa piegando i gomiti', 'Estendi le braccia'], mistakes: ['Gomiti troppo larghi'] },
      { name: 'Push-down al cavo', eq: G, level: 1, stable: true, setup: 'Cavo alto, gomiti ai fianchi.', steps: ['Estendi le braccia verso il basso', 'Ritorna fino a 90°'], mistakes: ['Gomiti che si spostano in avanti'] },
      { name: 'French press con manubri', eq: GD, level: 2, stretch: true, setup: 'Supino su panca, manubri sopra il petto.', steps: ['Piega i gomiti portando i manubri ai lati della testa', 'Estendi'], mistakes: ['Gomiti che si aprono'] },
      { name: 'Dip su panca', eq: DB, level: 2, setup: 'Mani sul bordo di una panca dietro di te, gambe avanti.', steps: ['Scendi piegando i gomiti fino a 90°', 'Spingi'], mistakes: ['Scendere troppo con fastidio alle spalle'] },
      { name: 'Push-up stretti inclinati', eq: ['bodyweight'], level: 1, setup: 'Mani strette su un tavolo.', steps: ['Scendi con i gomiti vicini al busto', 'Spingi'], mistakes: ['Gomiti aperti'] },
    ],
  },
  glute: {
    key: 'glute', label: 'Glutei', muscles: { glutes: 1 }, cue: 'Esercizio specifico per i glutei, utile quando sono una priorità.',
    list: [
      { name: 'Hip thrust alla macchina', eq: G, level: 1, stable: true, setup: 'Schiena sul supporto, cintura sulle anche.', steps: ['Spingi con i talloni', 'Pausa in alto', 'Scendi lentamente'], mistakes: ['Inarcare la lombare'] },
      { name: 'Kickback al cavo', eq: G, level: 1, stretch: true, setup: 'Cavigliera al cavo basso, busto inclinato.', steps: ['Spingi la gamba indietro estendendo l’anca', 'Ritorna portando il ginocchio avanti'], mistakes: ['Inarcare la schiena'] },
      { name: 'Ponte glutei su una gamba', eq: DB, level: 1, setup: 'Supino, un piede a terra, l’altra gamba in alto.', steps: ['Solleva il bacino', 'Pausa', 'Scendi'], mistakes: ['Bacino che ruota'] },
    ],
  },
  core: {
    key: 'core', label: 'Tronco', muscles: { core: 1 }, unit: 'seconds', cue: 'Respira mantenendo la posizione; fermati se la schiena perde neutralità.',
    pain: { back: ['Dead bug', 'Bird dog'] },
    list: [
      { name: 'Plank', eq: ALL, level: 1, setup: 'Avambracci a terra sotto le spalle, corpo in linea.', steps: ['Contrai addome e glutei', 'Respira senza perdere la posizione'], mistakes: ['Bacino che cade', 'Glutei troppo alti'] },
      { name: 'Pallof press', eq: G, level: 1, setup: 'Di fianco al cavo all’altezza del petto, maniglia al petto.', steps: ['Spingi le braccia avanti senza ruotare', 'Torna al petto'], mistakes: ['Busto che ruota'] },
      { name: 'Side plank', eq: DB, level: 1, setup: 'Su un avambraccio, corpo di lato in linea.', steps: ['Mantieni il bacino alto'], mistakes: ['Bacino che scende'] },
      { name: 'Dead bug', eq: ALL, level: 1, setup: 'Supino, braccia e ginocchia in alto a 90°.', steps: ['Allunga braccio e gamba opposti tenendo la schiena a terra', 'Alterna'], mistakes: ['Schiena che si stacca'] },
      { name: 'Bird dog', eq: ALL, level: 1, setup: 'A quattro zampe, schiena neutra.', steps: ['Allunga braccio e gamba opposti', 'Pausa e alterna'], mistakes: ['Bacino che ruota'] },
    ],
  },
  plyo: {
    key: 'plyo', label: 'Pliometria', muscles: { calves: 0.5, quads: 0.5 }, cue: 'Contatti rapidi e silenziosi; qualità prima della quantità.',
    pain: { knee: [], achilles: [], shin: [], hip: [], back: [] },
    list: [
      { name: 'Salti a piedi pari sul posto', eq: ALL, level: 1, setup: 'In piedi, piedi alla larghezza delle anche.', steps: ['Salta rimbalzando sugli avampiedi', 'Atterraggi morbidi'], mistakes: ['Atterraggio sui talloni'] },
      { name: 'Box jump basso', eq: G, level: 2, setup: 'Davanti a un box basso e stabile.', steps: ['Salta sul box', 'Scendi camminando'], mistakes: ['Box troppo alto'] },
    ],
  },
};

const byName = new Map<string, ExerciseDef>();
for (const f of Object.values(families)) for (const e of f.list) byName.set(e.name, e);
export const howTo = (name: string) => byName.get(name) ?? null;

/** Ranked options for a family: equipment fit, beginner-friendly stability, stretch emphasis for muscle goals, barbell for strength. */
export function ranked(p: Profile, key: string, role: 'main' | 'secondary' | 'accessory' = 'secondary'): string[] {
  const fam = families[key];
  if (!fam) return [];
  if (p.painCleared && p.painAreas?.length) for (const area of p.painAreas) { const alt = fam.pain?.[area]; if (alt) return alt; }
  const goal = p.goal;
  const hyper = goal !== 'strength';
  const pref = p.exercisePreference ?? 'mixed';
  const score = (e: ExerciseDef, i: number) => {
    let s = -i * 0.4;
    if (p.strengthLevel === 'new') s += (e.level === 1 ? 2 : e.level === 3 ? -3 : 0) + (e.stable ? 1 : 0);
    if (hyper && e.stretch) s += 1.5;
    if (goal === 'strength' && role === 'main') s += e.barbell ? 3 : -1;
    if (goal === 'strength' && role === 'main' && e.name === 'Stacco da terra') s += 2;
    if (goal !== 'strength' && e.name === 'Stacco da terra') s -= 3;
    if (role === 'main' && /Kickback|Croci|Alzate|Face pull|Reverse/.test(e.name)) s -= 4;
    if (pref === 'machines') s += e.stable ? 2 : -1;
    if (pref === 'free') s += e.stable ? -1 : 1.5;
    return s;
  };
  const avoid = /ampiezza parziale|leggere fino|tollerata|Step-up basso/;
  return fam.list
    .map((e, i) => ({ e, s: score(e, i) }))
    .filter(x => x.e.eq.includes(p.equipment) && !avoid.test(x.e.name))
    .sort((a, b) => b.s - a.s)
    .map(x => x.e.name);
}

/** Pick the variant for a slot; `rotation` alternates between the best options across the week. */
export function variantFor(p: Profile, key: string, rotation: number, role: 'main' | 'secondary' | 'accessory' = 'secondary'): string | null {
  const fam = families[key];
  if (p.painCleared && p.painAreas?.length) for (const area of p.painAreas) { const alt = fam.pain?.[area]; if (alt) return alt.length ? alt[rotation % alt.length] : null; }
  const list = ranked(p, key, role);
  if (!list.length) return null;
  // Keep the best option when it has a proven edge (stretch emphasis) that the runner-up lacks; otherwise alternate the top two.
  const best = howTo(list[0]), second = list[1] ? howTo(list[1]) : null;
  if (!second || (best?.stretch && !second.stretch && p.goal !== 'strength')) return list[0];
  return list[rotation % 2];
}

export function alternativesFor(p: Profile, key: string): string[] {
  return ranked(p, key);
}
