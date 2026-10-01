// Public entry point of the coaching engine (v3). The implementation lives in lib/engine/.
export { generatePlan, nextWeek, progressAfterLog, alternatives, sessionTime, nutrition, gate, split, resolveGoal, activityFrom, id, now, ENGINE_VERSION, muscleLabel } from './engine/program';
export { R, cite } from './engine/refs';
export { muscleNames, howTo } from './engine/exercises';
export { bodyFat, bandOf, recommendPhase, type NutritionPlan } from './engine/nutrition';
export { coreGoal } from './engine/cardio';
