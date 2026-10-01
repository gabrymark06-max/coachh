// Generic foods for the food diary, per 100 g (approximate values from Italian food composition tables).
// Branded products come from Open Food Facts through /api/food.
export type FoodItem = { name: string; brand?: string; kcal: number; p: number; c: number; f: number; serving?: number; servingLabel?: string; code?: string; image?: string };

const g = (name: string, kcal: number, p: number, c: number, f: number, serving?: number, servingLabel?: string): FoodItem => ({ name, kcal, p, c, f, serving, servingLabel });

export const genericFoods: FoodItem[] = [
  // Cereali e derivati
  g('Pasta di semola (cruda)', 355, 12, 72, 1.5, 80, 'porzione'),
  g('Pasta di semola (cotta)', 155, 5.3, 31, 0.7, 200, 'piatto'),
  g('Pasta integrale (cruda)', 340, 13, 66, 2.5, 80, 'porzione'),
  g('Riso bianco (crudo)', 355, 7, 80, 0.6, 80, 'porzione'),
  g('Riso bianco (cotto)', 130, 2.7, 28, 0.3, 180, 'piatto'),
  g('Riso basmati (crudo)', 355, 7.5, 79, 0.6, 80, 'porzione'),
  g('Farro (crudo)', 335, 15, 67, 2.5, 80, 'porzione'),
  g('Quinoa (cruda)', 365, 14, 64, 6, 70, 'porzione'),
  g('Cous cous (crudo)', 360, 12.5, 73, 0.6, 80, 'porzione'),
  g('Gnocchi di patate', 150, 4, 33, 0.4, 200, 'porzione'),
  g('Pane bianco', 270, 8.5, 54, 1.5, 50, 'fetta grande'),
  g('Pane integrale', 240, 9, 45, 2.5, 50, 'fetta grande'),
  g('Fette biscottate', 410, 11, 75, 6, 10, '1 fetta'),
  g('Gallette di riso', 380, 8, 81, 3, 8, '1 galletta'),
  g('Crackers', 430, 9.5, 70, 11, 25, '1 pacchetto'),
  g('Grissini', 410, 12, 68, 9, 5, '1 grissino'),
  g('Fiocchi d’avena', 370, 13, 60, 7, 40, 'porzione'),
  g('Corn flakes', 375, 7, 84, 1, 30, 'porzione'),
  g('Muesli', 370, 9, 62, 8, 40, 'porzione'),
  g('Biscotti secchi', 420, 7, 73, 11, 8, '1 biscotto'),
  g('Cornetto semplice', 410, 7, 45, 22, 50, '1 cornetto'),
  g('Pizza margherita', 260, 11, 33, 9, 300, '1 pizza intera ≈ 300 g'),
  g('Piadina', 330, 8, 50, 10, 100, '1 piadina'),
  g('Patate (crude)', 77, 2, 17, 0.1, 200, 'porzione'),
  g('Patate al forno', 140, 2.5, 20, 6, 200, 'porzione'),
  g('Patatine fritte', 310, 3.5, 38, 15, 120, 'porzione'),
  // Carne, pesce, uova
  g('Petto di pollo (crudo)', 110, 23, 0, 1.5, 150, 'porzione'),
  g('Petto di pollo (cotto)', 165, 31, 0, 3.6, 120, 'porzione'),
  g('Fesa di tacchino (cruda)', 107, 24, 0, 1, 150, 'porzione'),
  g('Manzo magro (crudo)', 130, 21, 0, 5, 150, 'porzione'),
  g('Macinato di manzo 10% grassi', 175, 20, 0, 10, 150, 'porzione'),
  g('Bistecca di maiale (cruda)', 145, 21, 0, 7, 150, 'porzione'),
  g('Hamburger di manzo', 230, 18, 1, 17, 120, '1 hamburger'),
  g('Prosciutto crudo', 225, 26, 0, 13, 50, '4 fette'),
  g('Prosciutto cotto', 135, 19, 1, 6, 50, '3 fette'),
  g('Bresaola', 150, 32, 0.5, 2, 50, 'porzione'),
  g('Salame', 400, 26, 1, 33, 30, 'porzione'),
  g('Würstel', 270, 13, 2, 23, 50, '1 würstel'),
  g('Merluzzo (crudo)', 80, 17, 0, 0.7, 200, 'porzione'),
  g('Salmone (crudo)', 200, 20, 0, 13, 150, 'porzione'),
  g('Salmone affumicato', 180, 25, 0, 9, 50, 'porzione'),
  g('Tonno al naturale sgocciolato', 110, 25, 0, 1, 80, '1 scatoletta'),
  g('Tonno sott’olio sgocciolato', 190, 25, 0, 10, 80, '1 scatoletta'),
  g('Gamberi', 85, 18, 0.5, 1, 150, 'porzione'),
  g('Uova intere', 140, 12.5, 0.5, 10, 60, '1 uovo'),
  g('Albume', 50, 11, 0.7, 0.2, 33, '1 albume'),
  // Latticini e alternative
  g('Latte parzialmente scremato', 46, 3.3, 5, 1.6, 200, '1 bicchiere'),
  g('Latte intero', 64, 3.3, 4.9, 3.6, 200, '1 bicchiere'),
  g('Bevanda di soia', 40, 3.3, 1, 2, 200, '1 bicchiere'),
  g('Yogurt greco 0%', 57, 10, 4, 0.2, 170, '1 vasetto'),
  g('Yogurt bianco intero', 66, 3.8, 4.3, 3.9, 125, '1 vasetto'),
  g('Skyr', 63, 11, 4, 0.2, 150, '1 vasetto'),
  g('Fiocchi di latte', 98, 12, 3, 4, 150, '1 confezione'),
  g('Ricotta', 145, 9, 3.5, 11, 100, 'porzione'),
  g('Mozzarella', 250, 18, 1, 19, 125, '1 mozzarella'),
  g('Mozzarella light', 160, 20, 1, 9, 125, '1 mozzarella'),
  g('Parmigiano Reggiano', 390, 33, 0, 28, 10, '1 cucchiaio'),
  g('Proteine del siero in polvere', 380, 80, 6, 5, 30, '1 misurino'),
  g('Proteine vegetali in polvere', 370, 80, 5, 6, 30, '1 misurino'),
  g('Tofu', 120, 13, 2, 7, 100, 'porzione'),
  g('Tempeh', 190, 19, 9, 11, 100, 'porzione'),
  g('Seitan', 120, 24, 4, 1.5, 100, 'porzione'),
  // Legumi
  g('Ceci in scatola sgocciolati', 120, 7, 16, 2.5, 120, 'porzione'),
  g('Lenticchie cotte', 115, 9, 18, 0.5, 150, 'porzione'),
  g('Fagioli borlotti cotti', 110, 7, 17, 0.5, 150, 'porzione'),
  g('Piselli', 80, 5.5, 12, 0.4, 150, 'porzione'),
  g('Edamame', 120, 11, 9, 5, 100, 'porzione'),
  // Verdura e frutta
  g('Verdure miste', 25, 2, 3.5, 0.3, 200, 'porzione'),
  g('Insalata', 15, 1.4, 2, 0.2, 80, 'porzione'),
  g('Pomodori', 18, 0.9, 3.5, 0.2, 150, 'porzione'),
  g('Zucchine', 17, 1.2, 3, 0.3, 200, 'porzione'),
  g('Broccoli', 34, 2.8, 4, 0.4, 200, 'porzione'),
  g('Spinaci', 23, 2.9, 1.4, 0.4, 200, 'porzione'),
  g('Carote', 41, 0.9, 9.6, 0.2, 100, '1 carota'),
  g('Mela', 52, 0.3, 13, 0.2, 180, '1 mela'),
  g('Banana', 90, 1, 21, 0.3, 120, '1 banana'),
  g('Arancia', 47, 0.9, 11.5, 0.1, 200, '1 arancia'),
  g('Kiwi', 61, 1.1, 14.5, 0.5, 80, '1 kiwi'),
  g('Pera', 57, 0.4, 15, 0.1, 180, '1 pera'),
  g('Uva', 69, 0.7, 18, 0.2, 150, 'porzione'),
  g('Fragole', 32, 0.7, 7.7, 0.3, 150, 'porzione'),
  g('Frutti di bosco', 45, 1, 10, 0.3, 125, 'porzione'),
  g('Avocado', 160, 2, 2, 15, 100, '½ avocado'),
  // Grassi, frutta secca, condimenti
  g('Olio extravergine d’oliva', 900, 0, 0, 100, 10, '1 cucchiaio'),
  g('Burro', 740, 0.9, 0.1, 82, 10, '1 noce'),
  g('Mandorle', 600, 21, 7, 52, 30, 'manciata'),
  g('Noci', 650, 15, 7, 65, 30, 'manciata'),
  g('Burro di arachidi', 600, 25, 15, 50, 15, '1 cucchiaio'),
  g('Semi di chia', 490, 17, 8, 31, 15, '1 cucchiaio'),
  g('Cioccolato fondente 70%', 580, 8, 33, 43, 20, '2 quadretti'),
  g('Miele', 305, 0.3, 82, 0, 10, '1 cucchiaino'),
  g('Marmellata', 250, 0.4, 62, 0.1, 20, '1 cucchiaio'),
  g('Zucchero', 400, 0, 100, 0, 5, '1 cucchiaino'),
  g('Sugo di pomodoro', 35, 1.3, 6, 0.4, 100, 'porzione'),
  g('Pesto alla genovese', 520, 5, 6, 52, 30, 'porzione'),
  g('Maionese', 680, 1, 1, 75, 15, '1 cucchiaio'),
  // Bevande
  g('Caffè espresso (senza zucchero)', 2, 0.1, 0.3, 0, 30, '1 tazzina'),
  g('Cappuccino', 45, 2.5, 4, 2, 150, '1 tazza'),
  g('Succo di frutta', 50, 0.3, 12, 0, 200, '1 bicchiere'),
  g('Birra', 43, 0.4, 3.5, 0, 330, '1 bottiglia'),
  g('Vino rosso', 85, 0.1, 2.6, 0, 125, '1 calice'),
  g('Bibita zuccherata', 42, 0, 10.6, 0, 330, '1 lattina'),
];

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/’/g, "'");

/** Generic foods matching every word of the query (prefix match), best matches first. */
export function searchGeneric(q: string, limit = 8): FoodItem[] {
  const words = norm(q).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return genericFoods
    .map(f => { const n = norm(f.name); const tokens = n.split(/[^a-z0-9']+/); return { f, ok: words.every(w => tokens.some(t => t.startsWith(w)) || n.includes(w)), first: n.startsWith(words[0]) }; })
    .filter(x => x.ok)
    .sort((a, b) => Number(b.first) - Number(a.first) || a.f.name.length - b.f.name.length)
    .slice(0, limit)
    .map(x => x.f);
}

/** Macros for a quantity in grams. */
export const forGrams = (f: Pick<FoodItem, 'kcal' | 'p' | 'c' | 'f'>, grams: number) => ({
  kcal: Math.round(f.kcal * grams / 100), p: Math.round(f.p * grams / 10) / 10, c: Math.round(f.c * grams / 10) / 10, f: Math.round(f.f * grams / 10) / 10,
});
