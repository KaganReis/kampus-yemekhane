const DAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
const SHORT_DAYS = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
const MONTHS = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

const pad = (n: number) => String(n).padStart(2, '0');

/** Formats an amount as Turkish lira, e.g. 1.250,50 ₺ */
export function tl(amount: number): string {
  const sign = amount < 0 ? '-' : '';
  const [int, dec] = Math.abs(amount).toFixed(2).split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${sign}${grouped},${dec} ₺`;
}

/** Local calendar date as YYYY-MM-DD. */
export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

/** Monday of the week containing `d`, shifted by `weekOffset` weeks. */
export function weekStart(d: Date, weekOffset = 0): Date {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = (r.getDay() + 6) % 7;
  return addDays(r, -diff + weekOffset * 7);
}

/** Monday–Friday date keys of a week. */
export function weekdays(d: Date, weekOffset = 0): string[] {
  const start = weekStart(d, weekOffset);
  return [0, 1, 2, 3, 4].map((i) => dateKey(addDays(start, i)));
}

export const dayName = (key: string) => DAYS[parseDateKey(key).getDay()];
export const shortDayName = (key: string) => SHORT_DAYS[parseDateKey(key).getDay()];

/** e.g. "23 Ekim Perşembe" */
export function longDate(key: string): string {
  const d = parseDateKey(key);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${DAYS[d.getDay()]}`;
}

export function shortDate(key: string): string {
  const d = parseDateKey(key);
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;
}

/** e.g. "21 Eki 14:05" */
export function dateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function relativeDay(key: string, now = new Date()): string {
  const today = dateKey(now);
  if (key === today) return 'Bugün';
  if (key === dateKey(addDays(now, 1))) return 'Yarın';
  return longDate(key);
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
