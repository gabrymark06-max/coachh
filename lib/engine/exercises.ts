import type { PainArea, Profile } from '../types';

export type Muscle = 'quads' | 'hamstrings' | 'glutes' | 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps' | 'calves' | 'core';
export const muscleNames: Record<Muscle, string> = {
  quads: 'Quadricipiti', hamstrings: 'Femorali', glutes: 'Glutei', chest: 'Petto', back: 'Dorso',
  shoulders: 'Spalle', biceps: 'Bicipiti', triceps: 'Tricipiti', calves: 'Polpacci', core: 'Tronco',
};
export const muscles = Object.keys(muscleNames) as Muscle[];

type Equipment = Profile['equipment'];
export type Family = {
  key: string;
  label: string;
  muscles: Partial<Record<Muscle, number>>; // 1 = primary, 0.5 = indirect (fractional set counting)
  variants: Record<Equipment, string[]>;
  /** Replacement variants when a cleared pain area is present; empty array = skip the family. */
  pain?: Partial<Record<PainArea, string[]>>;
  unit?: 'reps' | 'seconds';
  cue: string;
};

export const families: Record<string, Family> = {
  squat: {
    key: 'squat', label: 'Squat', muscles: { quads: 1, glutes: 0.5 },
    variants: { gym: ['Squat con bilanciere', 'Leg press', 'Hack squat'], dumbbells: ['Squat goblet', 'Squat bulgaro con manubri'], bodyweight: ['Squat a corpo libero', 'Squat bulgaro'] },
    pain: { knee: ['Leg press a ampiezza confortevole', 'Box squat a ampiezza confortevole'], back: ['Leg press', 'Squat goblet'], hip: ['Leg press a ampiezza confortevole'] },
    cue: 'Scendi con controllo fino all’ampiezza che mantieni stabile; spingi con tutto il piede.',
  },
  hinge: {
    key: 'hinge', label: 'Anca', muscles: { hamstrings: 1, glutes: 1 },
    variants: { gym: ['Stacco rumeno con bilanciere', 'Hip thrust', 'Stacco rumeno con manubri'], dumbbells: ['Stacco rumeno con manubri', 'Hip thrust con manubrio'], bodyweight: ['Hip hinge su una gamba', 'Ponte glutei su una gamba'] },
    pain: { back: ['Hip thrust', 'Ponte glutei'] },
    cue: 'Porta indietro le anche con la schiena neutra; fermati quando senti tensione nei femorali.',
  },
  lunge: {
    key: 'lunge', label: 'Monopodalico', muscles: { quads: 1, glutes: 1 },
    variants: { gym: ['Affondi indietro con manubri', 'Step-up con manubri'], dumbbells: ['Affondi indietro con manubri', 'Step-up con manubri'], bodyweight: ['Affondi indietro', 'Step-up su gradino'] },
    pain: { knee: ['Step-up basso'], hip: ['Step-up basso'] },
    cue: 'Busto stabile, ginocchio in linea con il piede; usa un appoggio se serve equilibrio.',
  },
  kneeExt: {
    key: 'kneeExt', label: 'Estensione ginocchio', muscles: { quads: 1 },
    variants: { gym: ['Leg extension'], dumbbells: [], bodyweight: [] },
    pain: { knee: ['Leg extension ad ampiezza parziale'] },
    cue: 'Estendi senza slancio; controlla la discesa.',
  },
  kneeFlex: {
    key: 'kneeFlex', label: 'Flessione ginocchio', muscles: { hamstrings: 1 },
    variants: { gym: ['Leg curl seduto', 'Leg curl sdraiato'], dumbbells: ['Nordic curl assistito', 'Hamstring walkout'], bodyweight: ['Hamstring walkout', 'Ponte con talloni su panca'] },
    cue: 'Movimento lento e completo; il seduto lavora i femorali in allungamento.',
  },
  calves: {
    key: 'calves', label: 'Polpacci', muscles: { calves: 1 },
    variants: { gym: ['Calf raise in piedi', 'Calf raise seduto'], dumbbells: ['Calf raise su gradino con manubrio', 'Calf raise su una gamba'], bodyweight: ['Calf raise su una gamba', 'Calf raise su gradino'] },
    pain: { achilles: ['Calf raise lento a ampiezza tollerata'], shin: ['Calf raise lento'] },
    cue: 'Pausa in alto e in basso; il tendine lavora meglio con ripetizioni lente e controllate.',
  },
  hpush: {
    key: 'hpush', label: 'Spinta orizzontale', muscles: { chest: 1, triceps: 0.5, shoulders: 0.5 },
    variants: { gym: ['Panca piana con bilanciere', 'Chest press', 'Panca inclinata con manubri'], dumbbells: ['Panca con manubri', 'Push-up'], bodyweight: ['Push-up', 'Push-up inclinati'] },
    pain: { shoulder: ['Chest press a presa neutra', 'Push-up inclinati'] },
    cue: 'Scapole stabili, gomiti a circa 45°; fermati prima che la spalla perda posizione.',
  },
  vpush: {
    key: 'vpush', label: 'Spinta verticale', muscles: { shoulders: 1, triceps: 0.5 },
    variants: { gym: ['Shoulder press con manubri', 'Shoulder press alla macchina'], dumbbells: ['Shoulder press con manubri', 'Landmine press con manubrio'], bodyweight: ['Pike push-up', 'Pike push-up inclinati'] },
    pain: { shoulder: [] },
    cue: 'Spingi sopra la testa senza inarcare la schiena.',
  },
  hpull: {
    key: 'hpull', label: 'Tirata orizzontale', muscles: { back: 1, biceps: 0.5 },
    variants: { gym: ['Rematore al cavo', 'Rematore con supporto al petto', 'Rematore con manubrio'], dumbbells: ['Rematore con manubrio', 'Rematore con due manubri'], bodyweight: ['Rematore inverso sotto un tavolo', 'Prone Y raise'] },
    pain: { back: ['Rematore con supporto al petto', 'Rematore al cavo'] },
    cue: 'Tira con i gomiti verso i fianchi e controlla il ritorno.',
  },
  vpull: {
    key: 'vpull', label: 'Tirata verticale', muscles: { back: 1, biceps: 0.5 },
    variants: { gym: ['Lat machine', 'Trazioni assistite'], dumbbells: ['Pullover con manubrio', 'Trazioni con elastico'], bodyweight: ['Trazioni con elastico', 'Scapular wall slide'] },
    cue: 'Porta i gomiti verso il basso e il petto verso la sbarra.',
  },
  lateral: {
    key: 'lateral', label: 'Alzate laterali', muscles: { shoulders: 1 },
    variants: { gym: ['Alzate laterali al cavo', 'Alzate laterali con manubri'], dumbbells: ['Alzate laterali con manubri'], bodyweight: ['Alzate laterali con elastico'] },
    pain: { shoulder: ['Alzate laterali leggere fino a 60°'] },
    cue: 'Carico leggero, sali fino all’altezza delle spalle senza slancio.',
  },
  biceps: {
    key: 'biceps', label: 'Bicipiti', muscles: { biceps: 1 },
    variants: { gym: ['Curl al cavo', 'Curl con manubri su panca inclinata'], dumbbells: ['Curl con manubri', 'Curl a martello'], bodyweight: ['Curl con elastico', 'Curl con zaino'] },
    cue: 'Gomiti fermi, discesa controllata.',
  },
  triceps: {
    key: 'triceps', label: 'Tricipiti', muscles: { triceps: 1 },
    variants: { gym: ['Estensioni sopra la testa al cavo', 'Push-down al cavo'], dumbbells: ['Estensioni con manubrio sopra la testa', 'French press con manubri'], bodyweight: ['Push-up stretti inclinati', 'Dip su panca'] },
    pain: { shoulder: ['Push-down al cavo', 'Push-up stretti inclinati'] },
    cue: 'Le estensioni sopra la testa allungano il capo lungo: controlla la fase bassa.',
  },
  core: {
    key: 'core', label: 'Tronco', muscles: { core: 1 }, unit: 'seconds',
    variants: { gym: ['Plank', 'Pallof press'], dumbbells: ['Plank', 'Side plank'], bodyweight: ['Plank', 'Side plank'] },
    pain: { back: ['Dead bug', 'Bird dog'] },
    cue: 'Respira mantenendo la posizione; fermati se la schiena perde neutralità.',
  },
  plyo: {
    key: 'plyo', label: 'Pliometria', muscles: { calves: 0.5, quads: 0.5 },
    variants: { gym: ['Salti a piedi pari sul posto', 'Box jump basso'], dumbbells: ['Salti a piedi pari sul posto', 'Saltelli con la corda'], bodyweight: ['Salti a piedi pari sul posto', 'Saltelli con la corda'] },
    pain: { knee: [], achilles: [], shin: [], hip: [], back: [] },
    cue: 'Contatti rapidi e silenziosi; qualità prima della quantità. Riposo completo tra le serie.',
  },
};

/** Pick the variant name for a family: pain substitutions win, then preference, then A/B rotation. */
export function variantFor(p: Profile, key: string, rotation: number): string | null {
  const fam = families[key];
  if (p.painCleared && p.painAreas?.length) {
    for (const area of p.painAreas) {
      const alt = fam.pain?.[area];
      if (alt) return alt.length ? alt[rotation % alt.length] : null;
    }
  }
  const list = fam.variants[p.equipment];
  if (!list.length) return null;
  if (p.equipment === 'gym' && p.exercisePreference === 'machines') {
    const machine = list.find(x => /macchina|press$|Leg press|cavo|Lat machine|Leg curl|extension|Chest press|seduto/i.test(x));
    if (machine) return machine;
  }
  if (p.equipment === 'gym' && p.exercisePreference === 'free') {
    const free = list.find(x => /bilanciere|manubri|manubrio|Trazioni/i.test(x));
    if (free) return free;
  }
  return list[rotation % list.length];
}

export function alternativesFor(p: Profile, key: string): string[] {
  const fam = families[key];
  if (!fam) return [];
  if (p.painCleared && p.painAreas?.length) for (const area of p.painAreas) if (fam.pain?.[area]) return fam.pain[area]!;
  return fam.variants[p.equipment];
}
