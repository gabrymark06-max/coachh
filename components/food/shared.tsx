'use client';
// Helpers shared by the food diary screens.
import type { FoodEntry, MealSlot } from '../../lib/types';
import { mealNames } from '../../lib/types';
import { forGrams } from '../../lib/foods';
import { accessToken } from '../../lib/supabase';

export type Add = (e: Omit<FoodEntry, 'id'> & { id?: string }) => boolean;
export type AddMany = (e: (Omit<FoodEntry, 'id'> & { id?: string })[]) => boolean;
export const SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack'];
export const iso = (d: Date) => d.toLocaleDateString('sv-SE', { timeZone: 'Europe/Rome' });
export const shift = (date: string, days: number) => { const d = new Date(date + 'T12:00:00'); d.setDate(d.getDate() + days); return iso(d); };
export const fmt = (x: number) => Math.round(x).toLocaleString('it-IT');
export const sum = (list: FoodEntry[]) => list.reduce((t, e) => { const m = forGrams(e, e.grams); return { kcal: t.kcal + m.kcal, p: t.p + m.p, c: t.c + m.c, f: t.f + m.f }; }, { kcal: 0, p: 0, c: 0, f: 0 });
/** Meal slot that fits the current hour. */
export const slotNow = (): MealSlot => { const h = Number(new Date().toLocaleString('en-GB', { hour: '2-digit', hour12: false, timeZone: 'Europe/Rome' })); return h < 11 ? 'breakfast' : h < 15 ? 'lunch' : h < 18 ? 'snack' : 'dinner'; };

/** Photo shrunk to a JPEG data URL: big enough for the model to see portions and small print, small enough to upload quickly. */
export async function shrink(file: File, max: number, quality: number) {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality);
}
export async function postPhoto<T>(body: object): Promise<T> {
  const token = await accessToken();
  const res = await fetch('/api/food-photo', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
  const d = await res.json().catch(() => ({})) as T & { error?: string };
  if (!res.ok) throw Error(d.error ?? 'Analisi non riuscita.');
  return d;
}

export function MealSelect({ meal, setMeal }: { meal: MealSlot; setMeal: (m: MealSlot) => void }) {
  return <div className="segmented full mealpick">{SLOTS.map(s => <button key={s} type="button" aria-pressed={meal === s} onClick={() => setMeal(s)}>{mealNames[s]}</button>)}</div>;
}
