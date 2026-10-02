export type Goal = 'fat-loss' | 'recomp' | 'muscle' | 'strength' | 'health' | 'balanced' | 'running';
export type CardioMode = 'walk' | 'run' | 'bike' | 'elliptical' | 'swim' | 'rower';
export type Allergen = 'lactose' | 'gluten' | 'nuts' | 'eggs' | 'fish';
export type Phase = 'cut' | 'recomp' | 'maintain' | 'gain';
export type Level = 'new' | 'intermediate' | 'experienced';
export type PainArea = 'knee' | 'back' | 'shoulder' | 'achilles' | 'shin' | 'hip';
export type ScreeningFlag = 'heart' | 'chest' | 'dizzy' | 'joint' | 'meds' | 'pregnancy';
export type RaceEvent = 'none' | '5k' | '10k' | 'half' | 'marathon';

export type Profile = {
  name: string; age: number; sex: 'male' | 'female' | 'unspecified'; weight: number | null; height: number | null;
  goal: Goal; strengthLevel: Level;
  runningLevel: 'new' | 'regular' | 'experienced'; days: number[]; minutes: number;
  equipment: 'gym' | 'dumbbells' | 'bodyweight'; recentRunMinutes: number; recentLongest: number;
  activity: 'low' | 'medium' | 'high'; diet: 'omnivore' | 'vegetarian' | 'vegan'; restrictions: string;
  clinical: boolean; pain: boolean; nutritionConsent: boolean;
  strengthDays?: number; recentStrengthSessions?: number; recentStrengthSets?: number; focus?: 'whole' | 'upper' | 'lower';
  exercisePreference?: 'mixed' | 'machines' | 'free'; motivation?: 'health' | 'performance' | 'appearance' | 'enjoyment';
  confidence?: number; stress?: number; barrier?: 'none' | 'time' | 'fatigue' | 'boredom';
  coachStyle?: 'supportive' | 'direct' | 'technical'; goalDetail?: string;
  // v3
  screening?: ScreeningFlag[]; medicalClearance?: boolean; painAreas?: PainArea[]; painCleared?: boolean;
  event?: RaceEvent; eventWeeks?: number; nutritionPhase?: 'auto' | 'cut' | 'maintain' | 'gain';
  sleepHours?: number; longRunMinutes?: number;
  // v4: gym-first coaching, body composition and diet
  goalAuto?: boolean; waist?: number | null; steps?: number; cardio?: CardioMode[];
  mealsPerDay?: number; allergens?: Allergen[]; trainingTime?: 'morning' | 'midday' | 'evening'; dislikes?: string;
};

export type Exercise = {
  id: string; name: string; family: string; sets: number; low: number; high: number; rir: number; rest: number;
  load: number | null; increment: number; cue: string; muscles?: string[]; unit?: 'reps' | 'seconds'; role?: 'main' | 'secondary' | 'accessory';
};
export type RunKind = 'runwalk' | 'easy' | 'long' | 'tempo' | 'intervals' | 'hills' | 'strides' | 'race-pace';
export type Session = {
  id: string; day: number; type: 'strength' | 'run'; title: string; duration: number; rationale: string; sources: string[];
  exercises: Exercise[]; phases: { label: string; minutes: number; effort: string }[];
  targetRpe?: number; runMinutes?: number; coaching?: string; adaptation?: string;
  kind?: RunKind | 'full' | 'upper' | 'lower' | 'push' | 'pull' | 'legs'; hard?: boolean; modality?: CardioMode;
};
export type Reason = { title: string; detail: string; sources: string[] };
export type Zone = { name: string; talk: string; rpe: string; hr: string | null; use: string };
export type Blueprint = {
  summary: string;
  habits?: { label: string; value: string; detail: string }[];
  cardioPlan?: string;
  pillars: Reason[];
  weekly: { label: string; value: string; sources: string[] }[];
  zones: Zone[];
  muscleSets: Record<string, number>;
  safety: string[];
  meso: { length: number; week: number; deload: boolean; label: string; load: number[] };
};
export type Progress = {
  mesoWeek: number; mesoLength: number; mesoCount: number; setBonus: number; runMinutes: number; longRun: number;
  eventWeeks: number | null; runWalkStep: number; steps?: number; cardioMinutes?: number;
  /** Extra weekly sets per muscle decided from performance trends (can be negative). */
  muscleBonus?: Record<string, number>;
};
export type Plan = {
  id: string; createdAt: string; version: number; week: number; sessions: Session[]; notes: string[]; blocked: boolean;
  engineVersion?: number; blueprint?: Blueprint; progress?: Progress;
};
export type SetResult = { exerciseId: string; set: number; weight: number | null; reps: number; rir: number | null; name?: string };
export type WorkoutLog = { id: string; sessionId: string; title: string; type: 'strength' | 'run'; date: string; duration: number; rpe: number; pain: boolean; distance: number | null; results: SetResult[]; note: string; week: number; completed?: boolean; enjoyment?: number | null; confidence?: number | null; barrier?: 'none' | 'time' | 'fatigue' | 'boredom'; actualRunMinutes?: number | null; readiness?: number; plannedDuration?: number; plannedRpe?: number; plannedRunMinutes?: number; feedback?: Decision[] };
export type CheckIn = { id: string; date: string; sleep: number; fatigue: number; soreness: number; pain: boolean; note: string; weight: number | null };
export type Decision = { id: string; date: string; title: string; reason: string; sources: string[]; rule: string };
export type Message = { id: string; role: 'user' | 'assistant'; text: string; sources: string[]; date: string; mode?: string };
export type Pose = 'front' | 'side' | 'back';
/** Body measurements in cm (weight in kg); photos are keys of images kept in this browser's IndexedDB. */
export type Measurement = {
  id: string; date: string; weight: number | null; waist: number | null; chest: number | null; arm: number | null; thigh: number | null; hips: number | null;
  note: string; photos: Partial<Record<Pose, string>>;
};
export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';
/** One food eaten: nutrition per 100 g plus the grams eaten. */
export type FoodEntry = {
  id: string; date: string; meal: MealSlot; name: string; brand?: string; grams: number;
  kcal: number; p: number; c: number; f: number; code?: string; source: 'barcode' | 'search' | 'generic' | 'photo' | 'label' | 'manual' | 'recent';
};
/** A meal saved to log again with one tap: foods with their grams. */
export type SavedMeal = { id: string; name: string; items: Omit<FoodEntry, 'id' | 'date' | 'meal'>[] };
/** Maintenance calories measured from logged intake and the weight trend (instead of the formula estimate). */
export type MeasuredTdee = { kcal: number; date: string; days: number; intake: number; weeklyChange: number };
export type AppState = {
  profile: Profile | null; plan: Plan | null; logs: WorkoutLog[]; checkins: CheckIn[]; decisions: Decision[]; messages: Message[]; measurements: Measurement[]; foods: FoodEntry[]; revision: number;
  meals?: SavedMeal[]; tdee?: MeasuredTdee | null;
  /** When this copy last changed, and ids removed on purpose: two devices' copies are merged with these. */
  updatedAt?: string; deleted?: Record<string, string>;
};
export type Paper = { id: string; title: string; authors: string; year: number; doi: string; pmid: string; url: string; topics: string[]; study_type: string; population: string; finding: string; limitations: string; coach_use: string; access_level: string; oa_full_text_url: string; collections: string[] };
export const dayNames = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
export const goalNames: Record<Goal, string> = { 'fat-loss': 'Dimagrire', recomp: 'Ricomposizione corporea', muscle: 'Mettere massa', strength: 'Diventare più forte', health: 'Stare in forma', balanced: 'Ricomposizione corporea', running: 'Stare in forma' };
export const cardioNames: Record<CardioMode, string> = { walk: 'Camminata veloce', run: 'Corsa', bike: 'Bici o cyclette', elliptical: 'Ellittica', swim: 'Nuoto', rower: 'Vogatore' };
export const phaseNames: Record<Phase, string> = { cut: 'Definizione', recomp: 'Ricomposizione', maintain: 'Mantenimento', gain: 'Massa' };
export const allergenNames: Record<Allergen, string> = { lactose: 'Lattosio', gluten: 'Glutine', nuts: 'Frutta secca', eggs: 'Uova', fish: 'Pesce' };
export const eventNames: Record<RaceEvent, string> = { none: 'Nessuna gara', '5k': '5 km', '10k': '10 km', half: 'Mezza maratona', marathon: 'Maratona' };
export const painNames: Record<PainArea, string> = { knee: 'Ginocchio', back: 'Schiena', shoulder: 'Spalla', achilles: 'Tendine d’Achille', shin: 'Tibia', hip: 'Anca' };
export const screeningNames: Record<ScreeningFlag, string> = {
  heart: 'Un medico mi ha indicato una condizione cardiaca o la pressione alta',
  chest: 'Ho dolore al petto a riposo o durante l’attività',
  dizzy: 'Perdo l’equilibrio per capogiri o ho perso conoscenza nell’ultimo anno',
  joint: 'Ho un problema osseo o articolare che peggiora con l’attività',
  meds: 'Assumo farmaci per una condizione cronica',
  pregnancy: 'Sono in gravidanza o nel post-parto',
};
export const emptyState = (): AppState => ({ profile: null, plan: null, logs: [], checkins: [], decisions: [], messages: [], measurements: [], foods: [], revision: 0 });
export const mealNames: Record<MealSlot, string> = { breakfast: 'Colazione', lunch: 'Pranzo', dinner: 'Cena', snack: 'Spuntini' };
export const poseNames: Record<Pose, string> = { front: 'Fronte', side: 'Lato', back: 'Dietro' };
