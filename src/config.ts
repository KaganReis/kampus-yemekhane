import { parseDateKey } from './utils/format';

/** Student price of one meal tray. */
export const MEAL_PRICE = 60;

/** Every N consumed meals earns one free meal right. */
export const MEALS_PER_FREE_MEAL = 10;

export const TOP_UP_MIN = 20;
export const TOP_UP_MAX = 2000;

/** Lunch service runs in 15-minute slots from 11:30 to 13:30. */
export const SLOT_MINUTES = 15;
export const FIRST_SLOT_MINUTE = 11 * 60 + 30;
export const SLOT_COUNT = 8;
export const SLOT_CAPACITY = 40;

/** Same-day reservations close at 10:00. */
export const BOOKING_CUTOFF_MINUTE = 10 * 60;
/** Cancellations and transfer listings close 30 minutes before the slot. */
export const CHANGE_CUTOFF_MINUTES = 30;

/** Accepts university addresses such as ad.soyad@ogr.universite.edu.tr */
export const UNIVERSITY_EMAIL = /^[a-z0-9._%+-]+@([a-z0-9-]+\.)+edu\.tr$/i;

export type TimePreference = 'erken' | 'orta' | 'gec';

export const TIME_PREFERENCES: { key: TimePreference; label: string; range: string; slots: number[] }[] = [
  { key: 'erken', label: 'Erken', range: '11:30 – 12:15', slots: [0, 1, 2] },
  { key: 'orta', label: 'Öğle', range: '12:15 – 13:00', slots: [3, 4, 5] },
  { key: 'gec', label: 'Geç', range: '13:00 – 13:30', slots: [6, 7] },
];

const hhmm = (minute: number) =>
  `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;

export function slotLabel(index: number): string {
  const start = FIRST_SLOT_MINUTE + index * SLOT_MINUTES;
  return `${hhmm(start)} – ${hhmm(start + SLOT_MINUTES)}`;
}

export function slotStart(date: string, index: number): Date {
  const d = parseDateKey(date);
  d.setMinutes(FIRST_SLOT_MINUTE + index * SLOT_MINUTES);
  return d;
}

export function slotEnd(date: string, index: number): Date {
  return new Date(slotStart(date, index).getTime() + SLOT_MINUTES * 60_000);
}

export const EXTRA_LABEL = { icecek: 'İçecek', tatli: 'Tatlı' } as const;

/** Short tray description for badges, e.g. "Çorba + Pilav + Tatlı". */
export function trayLabel(t: { soup: boolean; side: boolean; extra: keyof typeof EXTRA_LABEL }): string {
  return ['Ana yemek', t.side && 'Pilav', t.soup && 'Çorba', EXTRA_LABEL[t.extra]].filter(Boolean).join(' + ');
}

export const PAYMENT_LABEL = {
  bakiye: 'Bakiye',
  ucretsiz: 'Ücretsiz yemek hakkı',
  bilet: 'Dijital bilet',
} as const;

export const FEEDBACK_CATEGORIES = [
  'Yemek kalitesi',
  'Porsiyon',
  'Hijyen',
  'Personel ve hizmet',
  'Randevu sistemi',
  'Mobil uygulama',
  'Diğer',
];
