/**
 * Mock backend. Every function here stands in for a REST call to the
 * cafeteria service and enforces the same business rules a server would,
 * so the screens can be pointed at a real API by replacing this module.
 * State is persisted on the device with AsyncStorage.
 */
import {
  AppNotification,
  ChoiceComponent,
  FeedbackKind,
  NotificationKind,
  NotificationPrefs,
  PaymentMethod,
  Reservation,
  Session,
  TransferListing,
  TxType,
  User,
  UserData,
} from '../types';
import {
  BOOKING_CUTOFF_MINUTE,
  CHANGE_CUTOFF_MINUTES,
  CHOICE_LABEL,
  LOCKOUT_MS,
  MAX_LOGIN_ATTEMPTS,
  MEAL_PRICE,
  MEALS_PER_FREE_MEAL,
  SESSION_TTL_MS,
  SLOT_CAPACITY,
  SLOT_COUNT,
  TIME_PREFERENCES,
  TOP_UP_MAX,
  TOP_UP_MIN,
  TimePreference,
  UNIVERSITY_EMAIL,
  slotEnd,
  slotLabel,
  slotStart,
} from '../config';
import { DEMO_ACCOUNTS, seedMarket, seedUserData } from '../data/seed';
import { slotOccupancy } from '../data/menu';
import { addDays, dateKey, longDate, parseDateKey, relativeDay, tl, uid, weekStart } from '../utils/format';
import { readJson, removeKey, secureStore, writeJson } from './storage';
import * as push from './pushNotifications';

export class ApiError extends Error {}

export type Snapshot = { data: UserData; market: TransferListing[] };

const KEYS = {
  session: 'yh.session',
  attempts: 'yh.loginAttempts',
  market: 'yh.market',
  data: (userId: string) => `yh.data.${userId}`,
};

const latency = (ms = 300) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Persistence helpers

async function loadData(userId: string): Promise<UserData> {
  const data = await readJson<UserData>(KEYS.data(userId));
  if (!data) throw new ApiError('Kullanıcı verisi bulunamadı.');
  return data;
}

async function loadMarket(): Promise<TransferListing[]> {
  return (await readJson<TransferListing[]>(KEYS.market)) ?? [];
}

/**
 * Loads the user's data and the transfer market, applies `fn`, settles
 * time-based state and saves everything back.
 */
async function mutate<R = void>(
  userId: string,
  fn: (data: UserData, market: TransferListing[], now: Date) => R | Promise<R>,
): Promise<Snapshot & { result: R }> {
  await latency();
  const now = new Date();
  const data = await loadData(userId);
  let market = await loadMarket();
  const result = await fn(data, market, now);
  market = settle(data, market, now);
  await writeJson(KEYS.data(userId), data);
  await writeJson(KEYS.market, market);
  return { data, market, result };
}

// ---------------------------------------------------------------------------
// Domain helpers

function notify(data: UserData, kind: NotificationKind, title: string, body: string) {
  if (!data.prefs[kind]) return;
  const n: AppNotification = { id: uid(), kind, title, body, createdAt: new Date().toISOString(), read: false };
  data.notifications.unshift(n);
  data.notifications = data.notifications.slice(0, 100);
  void push.showNow(title, body);
}

function addTx(data: UserData, type: TxType, amount: number, description: string) {
  data.balance = Math.round((data.balance + amount) * 100) / 100;
  data.transactions.unshift({
    id: uid(),
    type,
    amount,
    description,
    date: new Date().toISOString(),
    balanceAfter: data.balance,
  });
}

function checkLowBalance(data: UserData) {
  if (data.balance < data.prefs.lowBalanceThreshold) {
    notify(
      data,
      'bakiye',
      'Bakiyeniz azalıyor',
      `Kalan bakiyeniz ${tl(data.balance)}. Randevularınızın aksamaması için bakiye yükleyebilirsiniz.`,
    );
  }
}

/** Gives back whatever paid for a reservation. */
function refund(data: UserData, r: Reservation, type: TxType, description: string) {
  if (r.paidWith === 'bakiye') addTx(data, type, r.price, description);
  else if (r.paidWith === 'ucretsiz') data.freeMeals += 1;
  else if (r.paidWith === 'bilet') {
    const ticket = data.tickets.find((t) => t.id === r.ticketId);
    if (ticket) ticket.status = 'aktif';
  }
}

const reminderId = (r: Reservation) => `reminder-${r.id}`;

function scheduleReminder(r: Reservation) {
  const at = new Date(slotStart(r.date, r.slotIndex).getTime() - 30 * 60_000);
  void push.scheduleAt(
    reminderId(r),
    at,
    'Yemek saatiniz yaklaşıyor',
    `${slotLabel(r.slotIndex)} saat diliminde yemeğinizi alabilirsiniz.`,
  );
}

function assertChangeable(r: Reservation, now: Date, action: string) {
  const cutoff = slotStart(r.date, r.slotIndex).getTime() - CHANGE_CUTOFF_MINUTES * 60_000;
  if (now.getTime() > cutoff) {
    throw new ApiError(`${action} için süre doldu. İşlemler saat diliminizden ${CHANGE_CUTOFF_MINUTES} dakika öncesine kadar yapılabilir.`);
  }
}

const hasReservationOn = (data: UserData, date: string) =>
  data.reservations.some((r) => r.date === date && (r.status === 'aktif' || r.status === 'devirde'));

/**
 * Applies everything that changes with time: finished meals count toward
 * rewards, unclaimed transfers expire, tickets expire, and the weekly menu
 * announcement goes out once per week.
 */
function settle(data: UserData, market: TransferListing[], now: Date): TransferListing[] {
  for (const r of data.reservations) {
    if (slotEnd(r.date, r.slotIndex) > now) continue;
    if (r.status === 'aktif') {
      r.status = 'tamamlandi';
      data.mealsConsumed += 1;
      if (data.mealsConsumed % MEALS_PER_FREE_MEAL === 0) {
        data.freeMeals += 1;
        notify(data, 'bilet', 'Ücretsiz yemek hakkı kazandınız 🎉', `${data.mealsConsumed}. yemeğinizle 1 ücretsiz yemek hakkı kazandınız.`);
      }
    } else if (r.status === 'devirde') {
      r.status = 'kullanilmadi';
    }
  }

  const live = market.filter((l) => slotStart(l.date, l.slotIndex) > now);

  const today = dateKey(now);
  const soon = dateKey(addDays(now, 3));
  for (const t of data.tickets) {
    if (t.status !== 'aktif') continue;
    if (t.validUntil < today) {
      t.status = 'suresi-doldu';
    } else if (t.validUntil <= soon && !data.notifiedTicketIds.includes(t.id)) {
      data.notifiedTicketIds.push(t.id);
      notify(data, 'bilet', 'Biletinizin süresi doluyor', `${t.title} ${longDate(t.validUntil)} tarihine kadar geçerli.`);
    }
  }

  const week = dateKey(weekStart(now));
  if (data.lastMenuWeekNotified !== week) {
    data.lastMenuWeekNotified = week;
    notify(data, 'menu', 'Haftalık menü yayınlandı', 'Bu haftanın yemek menüsünü inceleyip randevunuzu oluşturabilirsiniz.');
  }

  return live;
}

/**
 * Picks the least crowded 15-minute slot in the preferred window, falling
 * back to the nearest window that still has seats.
 */
function assignSlot(date: string, preference: TimePreference): number {
  const load = slotOccupancy(date);
  const preferred = TIME_PREFERENCES.find((p) => p.key === preference)!.slots;
  const center = preferred[Math.floor(preferred.length / 2)];
  const others = Array.from({ length: SLOT_COUNT }, (_, i) => i)
    .filter((i) => !preferred.includes(i))
    .sort((a, b) => Math.abs(a - center) - Math.abs(b - center));

  const pick = (slots: number[]) =>
    slots.filter((i) => load[i] < SLOT_CAPACITY).sort((a, b) => load[a] - load[b])[0];

  const slot = pick(preferred) ?? others.find((i) => load[i] < SLOT_CAPACITY);
  if (slot === undefined) throw new ApiError('Bu gün için tüm saat dilimleri dolu.');
  return slot;
}

export function isBookable(date: string, now = new Date()): boolean {
  const d = parseDateKey(date);
  if (d.getDay() === 0 || d.getDay() === 6) return false;
  const today = dateKey(now);
  if (date < today) return false;
  if (date === today) return now.getHours() * 60 + now.getMinutes() < BOOKING_CUTOFF_MINUTE;
  return date <= dateKey(addDays(now, 13));
}

// ---------------------------------------------------------------------------
// Auth

type Attempts = { count: number; lockedUntil?: number };

export async function restoreSession(): Promise<User | null> {
  const raw = await secureStore.get(KEYS.session);
  if (!raw) return null;
  const session = JSON.parse(raw) as Session;
  if (session.expiresAt < Date.now()) {
    await secureStore.remove(KEYS.session);
    return null;
  }
  return DEMO_ACCOUNTS.find((a) => a.user.id === session.userId)?.user ?? null;
}

export async function login(emailInput: string, password: string): Promise<User> {
  await latency(600);
  const email = emailInput.trim().toLowerCase();
  if (!UNIVERSITY_EMAIL.test(email)) {
    throw new ApiError('Lütfen üniversite e-posta adresinizi (…edu.tr) girin.');
  }
  if (!password) throw new ApiError('Şifrenizi girin.');

  const attempts = (await readJson<Attempts>(KEYS.attempts)) ?? { count: 0 };
  if (attempts.lockedUntil && attempts.lockedUntil > Date.now()) {
    const min = Math.ceil((attempts.lockedUntil - Date.now()) / 60_000);
    throw new ApiError(`Çok fazla hatalı deneme. Lütfen ${min} dakika sonra tekrar deneyin.`);
  }

  const account = DEMO_ACCOUNTS.find((a) => a.user.email === email && a.password === password);
  if (!account) {
    const count = attempts.count + 1;
    const locked = count >= MAX_LOGIN_ATTEMPTS;
    await writeJson(KEYS.attempts, locked ? { count: 0, lockedUntil: Date.now() + LOCKOUT_MS } : { count });
    throw new ApiError(
      locked
        ? 'Çok fazla hatalı deneme. Hesabınız 5 dakika süreyle kilitlendi.'
        : `E-posta veya şifre hatalı. Kalan deneme hakkı: ${MAX_LOGIN_ATTEMPTS - count}`,
    );
  }

  await writeJson(KEYS.attempts, { count: 0 });
  const session: Session = { token: uid() + uid(), userId: account.user.id, expiresAt: Date.now() + SESSION_TTL_MS };
  await secureStore.set(KEYS.session, JSON.stringify(session));

  const now = new Date();
  if (!(await readJson(KEYS.data(account.user.id)))) await writeJson(KEYS.data(account.user.id), seedUserData(now));
  if (!(await readJson(KEYS.market))) await writeJson(KEYS.market, seedMarket(now));
  return account.user;
}

export async function logout(): Promise<void> {
  await secureStore.remove(KEYS.session);
}

/** Demo only: wipes this device's data so the next login starts from the seed state. */
export async function resetDemo(userId: string): Promise<void> {
  await Promise.all([removeKey(KEYS.data(userId)), removeKey(KEYS.market), removeKey(KEYS.attempts)]);
  await logout();
}

// ---------------------------------------------------------------------------
// Data

export const fetchSnapshot = (userId: string) => mutate(userId, () => undefined);

export const topUp = (userId: string, amount: number) =>
  mutate(userId, (data) => {
    if (!Number.isFinite(amount) || amount < TOP_UP_MIN || amount > TOP_UP_MAX) {
      throw new ApiError(`Yükleme tutarı ${tl(TOP_UP_MIN)} ile ${tl(TOP_UP_MAX)} arasında olmalıdır.`);
    }
    addTx(data, 'yukleme', amount, 'Bakiye yükleme');
    notify(data, 'bakiye', 'Bakiye yüklendi', `${tl(amount)} yüklendi. Güncel bakiyeniz ${tl(data.balance)}.`);
  });

export type ReserveInput = {
  date: string;
  choice: ChoiceComponent;
  preference: TimePreference;
  paidWith: PaymentMethod;
  ticketId?: string;
};

export const reserve = (userId: string, input: ReserveInput) =>
  mutate(userId, (data, _market, now) => {
    if (!isBookable(input.date, now)) throw new ApiError('Bu tarih için randevu alınamaz.');
    if (hasReservationOn(data, input.date)) throw new ApiError('Bu gün için zaten bir randevunuz var.');

    const r: Reservation = {
      id: uid(),
      date: input.date,
      choice: input.choice,
      slotIndex: assignSlot(input.date, input.preference),
      status: 'aktif',
      paidWith: input.paidWith,
      price: input.paidWith === 'bakiye' ? MEAL_PRICE : 0,
      source: 'normal',
      createdAt: now.toISOString(),
    };

    if (input.paidWith === 'bakiye') {
      if (data.balance < MEAL_PRICE) throw new ApiError(`Yetersiz bakiye. Gerekli tutar: ${tl(MEAL_PRICE)}`);
      addTx(data, 'harcama', -MEAL_PRICE, `Öğle yemeği · ${longDate(input.date)}`);
    } else if (input.paidWith === 'ucretsiz') {
      if (data.freeMeals < 1) throw new ApiError('Kullanılabilir ücretsiz yemek hakkınız yok.');
      data.freeMeals -= 1;
    } else {
      const ticket = data.tickets.find((t) => t.id === input.ticketId);
      if (!ticket || ticket.status !== 'aktif' || ticket.validUntil < input.date) {
        throw new ApiError('Seçilen bilet bu tarih için geçerli değil.');
      }
      ticket.status = 'kullanildi';
      r.ticketId = ticket.id;
    }

    data.reservations.unshift(r);
    notify(
      data,
      'randevu',
      'Randevunuz oluşturuldu',
      `${relativeDay(r.date, now)} ${slotLabel(r.slotIndex)} saat diliminde ${CHOICE_LABEL[r.choice].toLowerCase()}lı menünüzü alabilirsiniz.`,
    );
    scheduleReminder(r);
    checkLowBalance(data);
    return r;
  });

function findReservation(data: UserData, id: string): Reservation {
  const r = data.reservations.find((x) => x.id === id);
  if (!r) throw new ApiError('Randevu bulunamadı.');
  return r;
}

export const cancelReservation = (userId: string, id: string) =>
  mutate(userId, (data, _market, now) => {
    const r = findReservation(data, id);
    if (r.status !== 'aktif') throw new ApiError('Yalnızca aktif randevular iptal edilebilir.');
    assertChangeable(r, now, 'İptal');
    r.status = 'iptal';
    refund(data, r, 'iade', `Randevu iptali · ${longDate(r.date)}`);
    void push.cancelScheduled(reminderId(r));
    notify(data, 'randevu', 'Randevunuz iptal edildi', `${longDate(r.date)} tarihli randevunuz iptal edildi ve ücret iade edildi.`);
  });

export const listForTransfer = (userId: string, ownerName: string, id: string) =>
  mutate(userId, (data, market, now) => {
    const r = findReservation(data, id);
    if (r.status !== 'aktif') throw new ApiError('Yalnızca aktif randevular devredilebilir.');
    assertChangeable(r, now, 'Devir ilanı');
    r.status = 'devirde';
    market.unshift({
      id: uid(),
      ownerId: userId,
      ownerName,
      reservationId: r.id,
      date: r.date,
      slotIndex: r.slotIndex,
      choice: r.choice,
      price: MEAL_PRICE,
      createdAt: now.toISOString(),
    });
    notify(data, 'randevu', 'Devir ilanınız yayında', `${longDate(r.date)} tarihli randevunuz devir ilanlarında listeleniyor.`);
  });

export const withdrawListing = (userId: string, reservationId: string) =>
  mutate(userId, (data, market) => {
    const r = findReservation(data, reservationId);
    if (r.status !== 'devirde') throw new ApiError('Bu randevu için açık bir ilan yok.');
    r.status = 'aktif';
    const i = market.findIndex((l) => l.reservationId === reservationId);
    if (i >= 0) market.splice(i, 1);
  });

export const takeTransfer = (userId: string, listingId: string) =>
  mutate(userId, async (data, market, now) => {
    const i = market.findIndex((l) => l.id === listingId);
    if (i < 0) throw new ApiError('İlan artık geçerli değil; başka bir öğrenci tarafından devralınmış olabilir.');
    const listing = market[i];
    if (listing.ownerId === userId) throw new ApiError('Kendi ilanınızı devralamazsınız.');
    if (hasReservationOn(data, listing.date)) throw new ApiError('Bu gün için zaten bir randevunuz var.');
    if (data.balance < listing.price) throw new ApiError(`Yetersiz bakiye. Gerekli tutar: ${tl(listing.price)}`);

    const r: Reservation = {
      id: uid(),
      date: listing.date,
      choice: listing.choice,
      slotIndex: listing.slotIndex,
      status: 'aktif',
      paidWith: 'bakiye',
      price: listing.price,
      source: 'devir',
      createdAt: now.toISOString(),
    };
    assertChangeable(r, now, 'Devralma');

    addTx(data, 'devir-alim', -listing.price, `Devralınan randevu · ${longDate(listing.date)}`);
    data.reservations.unshift(r);
    market.splice(i, 1);
    notify(data, 'randevu', 'Randevu devralındı', `${relativeDay(r.date, now)} ${slotLabel(r.slotIndex)} saat dilimindeki randevu artık sizin.`);
    scheduleReminder(r);
    checkLowBalance(data);

    // Settle the seller's side if they are a user of this device.
    const seller = await readJson<UserData>(KEYS.data(listing.ownerId));
    const sold = seller?.reservations.find((x) => x.id === listing.reservationId);
    if (seller && sold) {
      sold.status = 'devredildi';
      refund(seller, sold, 'devir-iade', `Devredilen randevu · ${longDate(sold.date)}`);
      notify(seller, 'randevu', 'İlanınız devralındı', `${longDate(sold.date)} tarihli randevunuz devredildi; ücret iade edildi.`);
      await writeJson(KEYS.data(listing.ownerId), seller);
    }
    return r;
  });

export const submitFeedback = (
  userId: string,
  input: { kind: FeedbackKind; category: string; message: string; anonymous: boolean },
) =>
  mutate(userId, (data) => {
    const message = input.message.trim();
    if (message.length < 20) throw new ApiError('Lütfen en az 20 karakterlik bir açıklama yazın.');
    if (message.length > 1000) throw new ApiError('Açıklama en fazla 1000 karakter olabilir.');
    data.feedback.unshift({ id: uid(), ...input, message, createdAt: new Date().toISOString(), status: 'alindi' });
  });

export const markNotificationsRead = (userId: string) =>
  mutate(userId, (data) => {
    data.notifications.forEach((n) => (n.read = true));
  });

export const updatePrefs = (userId: string, prefs: NotificationPrefs) =>
  mutate(userId, (data) => {
    data.prefs = prefs;
  });
