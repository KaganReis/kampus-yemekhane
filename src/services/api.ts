/**
 * Backend on Firebase: Firebase Auth for accounts, Firestore for data.
 *
 * - users/{uid}   one document per student (profile, balance, history,
 *                 reservations, tickets, notifications); only its owner can
 *                 read or write it.
 * - market/{id}   transfer listings, readable by every signed-in student. The
 *                 id is the listed reservation's id.
 * - feedback/{id} complaints and suggestions for the cafeteria staff.
 *
 * Every change runs in a Firestore transaction. A buyer cannot write the
 * seller's document, so taking a listing only marks it 'devralindi'; the
 * seller's app settles its own side (status, refund, notification) the next
 * time it syncs. See firestore.rules for the access rules.
 */
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  User as AuthUser,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  setDoc,
  Transaction,
  where,
} from 'firebase/firestore';
import { FirebaseError } from 'firebase/app';
import {
  AppNotification,
  FeedbackKind,
  NotificationKind,
  NotificationPrefs,
  PaymentMethod,
  Reservation,
  TransferListing,
  TraySelection,
  TxType,
  User,
  UserData,
} from '../types';
import {
  BOOKING_CUTOFF_MINUTE,
  CHANGE_CUTOFF_MINUTES,
  MEAL_PRICE,
  MEALS_PER_FREE_MEAL,
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
import { newUserData } from '../data/seed';
import { menuFor, slotOccupancy, trayNames } from '../data/menu';
import { addDays, dateKey, longDate, parseDateKey, relativeDay, tl, uid, weekStart } from '../utils/format';
import { auth, db } from './firebase';
import * as push from './pushNotifications';

export class ApiError extends Error {}

const MAX_HISTORY = 200;

const userRef = (id: string) => doc(db, 'users', id);
const listingRef = (id: string) => doc(db, 'market', id);
const marketCol = collection(db, 'market');

function currentUid(): string {
  const id = auth.currentUser?.uid;
  if (!id) throw new ApiError('Oturum açmanız gerekiyor.');
  return id;
}

/** Turns Firebase error codes into messages a student can act on. */
export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof FirebaseError) {
    switch (e.code) {
      case 'auth/invalid-credential':
      case 'auth/invalid-login-credentials':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return 'E-posta veya şifre hatalı.';
      case 'auth/email-already-in-use':
        return 'Bu e-posta adresiyle kayıtlı bir hesap var. Giriş yapın.';
      case 'auth/weak-password':
        return 'Şifre en az 8 karakter olmalı.';
      case 'auth/invalid-email':
        return 'E-posta adresi geçersiz.';
      case 'auth/too-many-requests':
        return 'Çok fazla hatalı deneme yapıldı. Lütfen birkaç dakika sonra tekrar deneyin.';
      case 'auth/network-request-failed':
      case 'unavailable':
        return 'Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.';
      case 'permission-denied':
        return 'Bu işlem için yetkiniz yok. Çıkış yapıp tekrar giriş yapmayı deneyin.';
    }
    return `İşlem tamamlanamadı (${e.code}).`;
  }
  return e instanceof Error ? e.message : 'Beklenmeyen bir hata oluştu.';
}

// ---------------------------------------------------------------------------
// Transactions

type Ctx = {
  tx: Transaction;
  data: UserData;
  now: Date;
  uid: string;
  /** Device side effects (push notifications, reminders) run once, after commit. */
  after: (effect: () => void) => void;
};

/**
 * Reads the student's document, applies `fn`, settles time-based state and
 * writes it back atomically. `fn` must do all of its own `tx.get` calls
 * before any `tx` write.
 */
async function mutate<R = void>(fn: (ctx: Ctx) => R | Promise<R>): Promise<R> {
  const id = currentUid();
  let effects: (() => void)[] = [];
  const result = await runTransaction(db, async (tx) => {
    effects = [];
    const snap = await tx.get(userRef(id));
    if (!snap.exists()) throw new ApiError('Hesap verisi bulunamadı. Çıkış yapıp tekrar giriş yapın.');
    const ctx: Ctx = { tx, data: snap.data() as UserData, now: new Date(), uid: id, after: (e) => effects.push(e) };
    const r = await fn(ctx);
    settle(ctx);
    ctx.data.transactions = ctx.data.transactions.slice(0, MAX_HISTORY);
    ctx.data.reservations = ctx.data.reservations.slice(0, MAX_HISTORY);
    tx.set(userRef(id), ctx.data);
    return r;
  });
  effects.forEach((e) => e());
  return result;
}

// ---------------------------------------------------------------------------
// Domain helpers

function notify(ctx: Ctx, kind: NotificationKind, title: string, body: string) {
  if (!ctx.data.prefs[kind]) return;
  const n: AppNotification = { id: uid(), kind, title, body, createdAt: ctx.now.toISOString(), read: false };
  ctx.data.notifications = [n, ...ctx.data.notifications].slice(0, 100);
  ctx.after(() => void push.showNow(title, body));
}

function addTx(ctx: Ctx, type: TxType, amount: number, description: string) {
  const data = ctx.data;
  data.balance = Math.round((data.balance + amount) * 100) / 100;
  data.transactions.unshift({
    id: uid(),
    type,
    amount,
    description,
    date: ctx.now.toISOString(),
    balanceAfter: data.balance,
  });
}

function checkLowBalance(ctx: Ctx) {
  if (ctx.data.balance < ctx.data.prefs.lowBalanceThreshold) {
    notify(
      ctx,
      'bakiye',
      'Bakiyeniz azalıyor',
      `Kalan bakiyeniz ${tl(ctx.data.balance)}. Randevularınızın aksamaması için bakiye yükleyebilirsiniz.`,
    );
  }
}

/** Gives back whatever paid for a reservation. */
function refund(ctx: Ctx, r: Reservation, type: TxType, description: string) {
  if (r.paidWith === 'bakiye') addTx(ctx, type, r.price, description);
  else if (r.paidWith === 'ucretsiz') ctx.data.freeMeals += 1;
  else if (r.paidWith === 'bilet') {
    const ticket = ctx.data.tickets.find((t) => t.id === r.ticketId);
    if (ticket) ticket.status = 'aktif';
  }
}

const reminderId = (r: Reservation) => `reminder-${r.id}`;

function scheduleReminder(ctx: Ctx, r: Reservation) {
  const at = new Date(slotStart(r.date, r.slotIndex).getTime() - 30 * 60_000);
  ctx.after(
    () =>
      void push.scheduleAt(
        reminderId(r),
        at,
        'Yemek saatiniz yaklaşıyor',
        `${slotLabel(r.slotIndex)} saat diliminde yemeğinizi alabilirsiniz.`,
      ),
  );
}

function assertChangeable(r: Pick<Reservation, 'date' | 'slotIndex'>, now: Date, action: string) {
  const cutoff = slotStart(r.date, r.slotIndex).getTime() - CHANGE_CUTOFF_MINUTES * 60_000;
  if (now.getTime() > cutoff) {
    throw new ApiError(`${action} için süre doldu. İşlemler saat diliminizden ${CHANGE_CUTOFF_MINUTES} dakika öncesine kadar yapılabilir.`);
  }
}

const hasReservationOn = (data: UserData, date: string) =>
  data.reservations.some((r) => r.date === date && (r.status === 'aktif' || r.status === 'devirde'));

function findReservation(data: UserData, id: string): Reservation {
  const r = data.reservations.find((x) => x.id === id);
  if (!r) throw new ApiError('Randevu bulunamadı.');
  return r;
}

/** "Elif Yılmaz" → "Elif Y." for public transfer listings. */
function shortName(name: string): string {
  const [first, ...rest] = name.trim().split(/\s+/);
  const last = rest.at(-1);
  return last ? `${first} ${last[0]}.` : first;
}

/**
 * Applies everything that changes with time: finished meals count toward
 * rewards, unclaimed transfers expire, tickets expire, and the weekly menu
 * announcement goes out once per week.
 */
function settle(ctx: Ctx) {
  const { data, now } = ctx;
  for (const r of data.reservations) {
    if (slotEnd(r.date, r.slotIndex) > now) continue;
    if (r.status === 'aktif') {
      r.status = 'tamamlandi';
      data.mealsConsumed += 1;
      if (data.mealsConsumed % MEALS_PER_FREE_MEAL === 0) {
        data.freeMeals += 1;
        notify(ctx, 'bilet', 'Ücretsiz yemek hakkı kazandınız 🎉', `${data.mealsConsumed}. yemeğinizle 1 ücretsiz yemek hakkı kazandınız.`);
      }
    } else if (r.status === 'devirde') {
      r.status = 'kullanilmadi';
    }
  }

  const today = dateKey(now);
  const soon = dateKey(addDays(now, 3));
  for (const t of data.tickets) {
    if (t.status !== 'aktif') continue;
    if (t.validUntil < today) {
      t.status = 'suresi-doldu';
    } else if (t.validUntil <= soon && !data.notifiedTicketIds.includes(t.id)) {
      data.notifiedTicketIds.push(t.id);
      notify(ctx, 'bilet', 'Biletinizin süresi doluyor', `${t.title} ${longDate(t.validUntil)} tarihine kadar geçerli.`);
    }
  }

  const week = dateKey(weekStart(now));
  if (data.lastMenuWeekNotified !== week) {
    data.lastMenuWeekNotified = week;
    notify(ctx, 'menu', 'Haftalık menü yayınlandı', 'Bu haftanın yemek menüsünü inceleyip randevunuzu oluşturabilirsiniz.');
  }
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

export type RegisterInput = { name: string; studentNo: string; faculty: string; email: string; password: string };

function normalizeEmail(input: string): string {
  const email = input.trim().toLowerCase();
  if (!UNIVERSITY_EMAIL.test(email)) throw new ApiError('Lütfen üniversite e-posta adresinizi (…edu.tr) girin.');
  return email;
}

export async function register(input: RegisterInput): Promise<void> {
  const email = normalizeEmail(input.email);
  const name = input.name.trim().replace(/\s+/g, ' ');
  const studentNo = input.studentNo.trim();
  if (name.split(' ').length < 2) throw new ApiError('Lütfen adınızı ve soyadınızı girin.');
  if (!/^\d{6,12}$/.test(studentNo)) throw new ApiError('Öğrenci numarası 6–12 haneli olmalıdır.');
  if (input.password.length < 8) throw new ApiError('Şifre en az 8 karakter olmalı.');

  const cred = await createUserWithEmailAndPassword(auth, email, input.password);
  await updateProfile(cred.user, { displayName: name });
  const profile: User = { id: cred.user.uid, name, email, studentNo, faculty: input.faculty.trim() };
  await setDoc(userRef(cred.user.uid), newUserData(profile, new Date()));
}

export async function login(emailInput: string, password: string): Promise<void> {
  const email = normalizeEmail(emailInput);
  if (!password) throw new ApiError('Şifrenizi girin.');
  await signInWithEmailAndPassword(auth, email, password);
}

export const logout = () => signOut(auth);

export const onAuthChange = (cb: (user: AuthUser | null) => void) => onAuthStateChanged(auth, cb);

/**
 * Creates the student's document if sign-up was interrupted before it was
 * written. Create-only and transactional, so it never overwrites the profile
 * that register() is writing at the same moment.
 */
export async function ensureUserDoc(user: AuthUser): Promise<void> {
  if ((await getDoc(userRef(user.uid))).exists()) return;
  await runTransaction(db, async (tx) => {
    if ((await tx.get(userRef(user.uid))).exists()) return;
    const profile: User = {
      id: user.uid,
      name: user.displayName ?? user.email?.split('@')[0] ?? 'Öğrenci',
      email: user.email ?? '',
      studentNo: '',
      faculty: '',
    };
    tx.set(userRef(user.uid), newUserData(profile, new Date()));
  });
}

// ---------------------------------------------------------------------------
// Live data

export const watchUserData = (id: string, cb: (data: UserData | null) => void, onError: (e: unknown) => void) =>
  onSnapshot(userRef(id), (s) => cb(s.exists() ? (s.data() as UserData) : null), onError);

export const watchMarket = (cb: (listings: TransferListing[]) => void, onError: (e: unknown) => void) =>
  onSnapshot(
    marketCol,
    (s) => cb(s.docs.map((d) => ({ ...(d.data() as TransferListing), id: d.id }))),
    onError,
  );

/**
 * Settles time-based state and this student's own listings: a listing that
 * another student took is closed out here (reservation marked transferred,
 * refund, notification) and deleted; an expired one is deleted.
 */
export async function sync(): Promise<void> {
  const id = currentUid();
  const mine = await getDocs(query(marketCol, where('ownerId', '==', id)));
  const ids = mine.docs.map((d) => d.id);
  await mutate(async (ctx) => {
    const listings = await Promise.all(ids.map((lid) => ctx.tx.get(listingRef(lid))));
    for (const snap of listings) {
      if (!snap.exists()) continue;
      const l = snap.data() as TransferListing;
      if (l.status === 'devralindi') {
        const r = ctx.data.reservations.find((x) => x.id === l.reservationId);
        if (r && r.status === 'devirde') {
          r.status = 'devredildi';
          refund(ctx, r, 'devir-iade', `Devredilen randevu · ${longDate(r.date)}`);
          const reservation = r;
          ctx.after(() => void push.cancelScheduled(reminderId(reservation)));
          notify(ctx, 'randevu', 'İlanınız devralındı', `${longDate(r.date)} tarihli randevunuz devredildi; ücret iade edildi.`);
        }
        ctx.tx.delete(snap.ref);
      } else if (slotStart(l.date, l.slotIndex) <= ctx.now) {
        ctx.tx.delete(snap.ref);
      }
    }
  });
}

// ---------------------------------------------------------------------------
// Actions

export const topUp = (amount: number) =>
  mutate((ctx) => {
    if (!Number.isFinite(amount) || amount < TOP_UP_MIN || amount > TOP_UP_MAX) {
      throw new ApiError(`Yükleme tutarı ${tl(TOP_UP_MIN)} ile ${tl(TOP_UP_MAX)} arasında olmalıdır.`);
    }
    addTx(ctx, 'yukleme', amount, 'Bakiye yükleme');
    notify(ctx, 'bakiye', 'Bakiye yüklendi', `${tl(amount)} yüklendi. Güncel bakiyeniz ${tl(ctx.data.balance)}.`);
  });

export type ReserveInput = {
  date: string;
  tray: TraySelection;
  preference: TimePreference;
  paidWith: PaymentMethod;
  ticketId?: string;
};

export const reserve = (input: ReserveInput) =>
  mutate((ctx) => {
    const { data, now } = ctx;
    if (!isBookable(input.date, now)) throw new ApiError('Bu tarih için randevu alınamaz.');
    if (hasReservationOn(data, input.date)) throw new ApiError('Bu gün için zaten bir randevunuz var.');

    const r: Reservation = {
      id: uid(),
      date: input.date,
      tray: input.tray,
      slotIndex: assignSlot(input.date, input.preference),
      status: 'aktif',
      paidWith: input.paidWith,
      price: input.paidWith === 'bakiye' ? MEAL_PRICE : 0,
      source: 'normal',
      createdAt: now.toISOString(),
    };

    if (input.paidWith === 'bakiye') {
      if (data.balance < MEAL_PRICE) throw new ApiError(`Yetersiz bakiye. Gerekli tutar: ${tl(MEAL_PRICE)}`);
      addTx(ctx, 'harcama', -MEAL_PRICE, `Öğle yemeği · ${longDate(input.date)}`);
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
      ctx,
      'randevu',
      'Randevunuz oluşturuldu',
      `${relativeDay(r.date, now)} ${slotLabel(r.slotIndex)} saat diliminde yemeğinizi alabilirsiniz: ${trayNames(menuFor(r.date), r.tray)}.`,
    );
    scheduleReminder(ctx, r);
    checkLowBalance(ctx);
    return r;
  });

export const cancelReservation = (id: string) =>
  mutate((ctx) => {
    const r = findReservation(ctx.data, id);
    if (r.status !== 'aktif') throw new ApiError('Yalnızca aktif randevular iptal edilebilir.');
    assertChangeable(r, ctx.now, 'İptal');
    r.status = 'iptal';
    refund(ctx, r, 'iade', `Randevu iptali · ${longDate(r.date)}`);
    ctx.after(() => void push.cancelScheduled(reminderId(r)));
    notify(ctx, 'randevu', 'Randevunuz iptal edildi', `${longDate(r.date)} tarihli randevunuz iptal edildi ve ücret iade edildi.`);
  });

export const listForTransfer = (id: string) =>
  mutate((ctx) => {
    const r = findReservation(ctx.data, id);
    if (r.status !== 'aktif') throw new ApiError('Yalnızca aktif randevular devredilebilir.');
    assertChangeable(r, ctx.now, 'Devir ilanı');
    r.status = 'devirde';
    const listing: Omit<TransferListing, 'id'> = {
      ownerId: ctx.uid,
      ownerName: shortName(ctx.data.profile.name),
      reservationId: r.id,
      date: r.date,
      slotIndex: r.slotIndex,
      tray: r.tray,
      price: MEAL_PRICE,
      createdAt: ctx.now.toISOString(),
      status: 'acik',
    };
    ctx.tx.set(listingRef(r.id), listing);
    notify(ctx, 'randevu', 'Devir ilanınız yayında', `${longDate(r.date)} tarihli randevunuz devir ilanlarında listeleniyor.`);
  });

export const withdrawListing = (reservationId: string) =>
  mutate(async (ctx) => {
    const snap = await ctx.tx.get(listingRef(reservationId));
    const r = findReservation(ctx.data, reservationId);
    if (r.status !== 'devirde') throw new ApiError('Bu randevu için açık bir ilan yok.');
    if (snap.exists() && (snap.data() as TransferListing).status === 'devralindi') {
      throw new ApiError('İlanınız az önce başka bir öğrenci tarafından devralındı; ücret iadeniz birazdan bakiyenize yansıyacak.');
    }
    r.status = 'aktif';
    if (snap.exists()) ctx.tx.delete(snap.ref);
  });

export const takeTransfer = (listingId: string) =>
  mutate(async (ctx) => {
    const snap = await ctx.tx.get(listingRef(listingId));
    if (!snap.exists() || (snap.data() as TransferListing).status !== 'acik') {
      throw new ApiError('İlan artık geçerli değil; başka bir öğrenci tarafından devralınmış olabilir.');
    }
    const listing = snap.data() as TransferListing;
    const { data, now } = ctx;
    if (listing.ownerId === ctx.uid) throw new ApiError('Kendi ilanınızı devralamazsınız.');
    if (hasReservationOn(data, listing.date)) throw new ApiError('Bu gün için zaten bir randevunuz var.');
    if (data.balance < listing.price) throw new ApiError(`Yetersiz bakiye. Gerekli tutar: ${tl(listing.price)}`);
    assertChangeable(listing, now, 'Devralma');

    const r: Reservation = {
      id: uid(),
      date: listing.date,
      tray: listing.tray,
      slotIndex: listing.slotIndex,
      status: 'aktif',
      paidWith: 'bakiye',
      price: listing.price,
      source: 'devir',
      createdAt: now.toISOString(),
    };
    ctx.tx.update(snap.ref, { status: 'devralindi', takenBy: ctx.uid, takenAt: now.toISOString() });
    addTx(ctx, 'devir-alim', -listing.price, `Devralınan randevu · ${longDate(listing.date)}`);
    data.reservations.unshift(r);
    notify(ctx, 'randevu', 'Randevu devralındı', `${relativeDay(r.date, now)} ${slotLabel(r.slotIndex)} saat dilimindeki randevu artık sizin.`);
    scheduleReminder(ctx, r);
    checkLowBalance(ctx);
    return r;
  });

export const submitFeedback = (input: { kind: FeedbackKind; category: string; message: string; anonymous: boolean }) =>
  mutate((ctx) => {
    const message = input.message.trim();
    if (message.length < 20) throw new ApiError('Lütfen en az 20 karakterlik bir açıklama yazın.');
    if (message.length > 1000) throw new ApiError('Açıklama en fazla 1000 karakter olabilir.');
    const createdAt = ctx.now.toISOString();
    const id = uid();
    ctx.data.feedback.unshift({ id, ...input, message, createdAt, status: 'alindi' });
    // Copy for the cafeteria staff; anonymous submissions carry no identity.
    ctx.tx.set(doc(db, 'feedback', id), {
      kind: input.kind,
      category: input.category,
      message,
      createdAt,
      ...(input.anonymous
        ? {}
        : { uid: ctx.uid, name: ctx.data.profile.name, studentNo: ctx.data.profile.studentNo, email: ctx.data.profile.email }),
    });
  });

export const markNotificationsRead = () =>
  mutate((ctx) => {
    ctx.data.notifications.forEach((n) => (n.read = true));
  });

export const updatePrefs = (prefs: NotificationPrefs) =>
  mutate((ctx) => {
    ctx.data.prefs = prefs;
  });
