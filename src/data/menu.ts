import { MenuDay, MenuItem } from '../types';
import { parseDateKey, weekdays } from '../utils/format';
import { SLOT_CAPACITY, SLOT_COUNT } from '../config';

const SOUPS: MenuItem[] = [
  { name: 'Mercimek Çorbası', kcal: 160 },
  { name: 'Ezogelin Çorbası', kcal: 170 },
  { name: 'Tarhana Çorbası', kcal: 140 },
  { name: 'Yayla Çorbası', kcal: 150 },
  { name: 'Domates Çorbası', kcal: 120 },
  { name: 'Sebze Çorbası', kcal: 110 },
  { name: 'Şehriye Çorbası', kcal: 130 },
];

const MAINS: MenuItem[] = [
  { name: 'Etli Kuru Fasulye', kcal: 380 },
  { name: 'Tavuk Sote', kcal: 340 },
  { name: 'Fırında Köfte', kcal: 420 },
  { name: 'Etli Nohut', kcal: 360 },
  { name: 'Izgara Tavuk But', kcal: 390 },
  { name: 'Karnıyarık', kcal: 350 },
  { name: 'Orman Kebabı', kcal: 410 },
  { name: 'Mantarlı Tavuk', kcal: 330 },
  { name: 'Zeytinyağlı Taze Fasulye', kcal: 210 },
];

const SIDES: MenuItem[] = [
  { name: 'Pirinç Pilavı', kcal: 250 },
  { name: 'Bulgur Pilavı', kcal: 220 },
  { name: 'Salçalı Makarna', kcal: 280 },
  { name: 'Şehriyeli Pilav', kcal: 260 },
  { name: 'Fırın Patates', kcal: 200 },
];

const SALADS: MenuItem[] = [
  { name: 'Çoban Salata', kcal: 90 },
  { name: 'Mevsim Salata', kcal: 70 },
  { name: 'Gavurdağı Salata', kcal: 130 },
  { name: 'Havuç Tarator', kcal: 140 },
  { name: 'Yeşil Salata', kcal: 60 },
  { name: 'Rus Salatası', kcal: 210 },
];

const DESSERTS: MenuItem[] = [
  { name: 'Sütlaç', kcal: 230 },
  { name: 'Mevsim Meyvesi', kcal: 80 },
  { name: 'Revani', kcal: 290 },
  { name: 'Ayran', kcal: 70 },
  { name: 'Şekerpare', kcal: 310 },
  { name: 'Yoğurt', kcal: 90 },
  { name: 'Komposto', kcal: 120 },
];

const dayNumber = (key: string) => Math.round(parseDateKey(key).getTime() / 86_400_000);

/**
 * Deterministic menu for a date. In production this comes from the
 * cafeteria's menu service; here it rotates through fixed lists so the
 * same date always shows the same menu.
 */
export function menuFor(date: string): MenuDay {
  const n = dayNumber(date);
  return {
    date,
    soup: SOUPS[n % SOUPS.length],
    main: MAINS[(n * 2) % MAINS.length],
    side: SIDES[(n * 3) % SIDES.length],
    salad: SALADS[(n * 5) % SALADS.length],
    dessert: DESSERTS[(n * 4) % DESSERTS.length],
  };
}

export const weekMenu = (now: Date, weekOffset: number) => weekdays(now, weekOffset).map(menuFor);

/** Base calories of the fixed tray (main + side + dessert). */
export const baseKcal = (m: MenuDay) => m.main.kcal + m.side.kcal + m.dessert.kcal;

/**
 * Simulated number of seats already taken in each slot of a day, so slot
 * assignment has realistic load to balance against.
 */
export function slotOccupancy(date: string): number[] {
  const n = dayNumber(date);
  return Array.from({ length: SLOT_COUNT }, (_, i) => {
    const peak = i >= 3 && i <= 5 ? 0.85 : 0.45;
    const noise = ((n * 7919 + i * 104729) % 23) / 100;
    return Math.min(SLOT_CAPACITY, Math.round(SLOT_CAPACITY * (peak + noise - 0.1)));
  });
}
