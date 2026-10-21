import { TransferListing, User, UserData } from '../types';
import { addDays, dateKey } from '../utils/format';
import { MEAL_PRICE } from '../config';

/**
 * Demo account for the mock backend. Real deployments authenticate
 * against the university's identity provider; no password is stored
 * in the app.
 */
export const DEMO_ACCOUNTS: { user: User; password: string }[] = [
  {
    user: {
      id: 'u-1001',
      name: 'Elif Yılmaz',
      email: 'demo@ogr.universite.edu.tr',
      studentNo: '2023104512',
      faculty: 'Mühendislik Fakültesi',
    },
    password: 'Yemek2026!',
  },
];

/** Upcoming weekdays starting tomorrow, used to place seed records. */
function nextWeekdays(now: Date, count: number): string[] {
  const out: string[] = [];
  for (let d = addDays(now, 1); out.length < count; d = addDays(d, 1)) {
    if (d.getDay() !== 0 && d.getDay() !== 6) out.push(dateKey(d));
  }
  return out;
}

export function seedUserData(now: Date): UserData {
  const iso = (daysAgo: number, hour = 12) => {
    const d = addDays(now, -daysAgo);
    d.setHours(hour, 10, 0, 0);
    return d.toISOString();
  };
  const [tomorrow] = nextWeekdays(now, 1);

  return {
    balance: 185,
    freeMeals: 1,
    mealsConsumed: 18,
    transactions: [
      { id: 't5', type: 'harcama', amount: -MEAL_PRICE, description: 'Öğle yemeği randevusu', date: iso(1, 9), balanceAfter: 185 },
      { id: 't4', type: 'harcama', amount: -MEAL_PRICE, description: 'Öğle yemeği randevusu', date: iso(2, 9), balanceAfter: 245 },
      { id: 't3', type: 'yukleme', amount: 200, description: 'Bakiye yükleme', date: iso(3, 18), balanceAfter: 305 },
      { id: 't2', type: 'harcama', amount: -MEAL_PRICE, description: 'Öğle yemeği randevusu', date: iso(6, 9), balanceAfter: 105 },
      { id: 't1', type: 'yukleme', amount: 150, description: 'Bakiye yükleme', date: iso(9, 20), balanceAfter: 165 },
    ],
    reservations: [
      {
        id: 'r-seed-1',
        date: tomorrow,
        choice: 'corba',
        slotIndex: 4,
        status: 'aktif',
        paidWith: 'bakiye',
        price: MEAL_PRICE,
        source: 'normal',
        createdAt: iso(1, 9),
      },
    ],
    tickets: [
      {
        id: 'k-1',
        title: 'Final Haftası Destek Bileti',
        description: 'Final haftası boyunca bir öğle yemeği için geçerlidir.',
        code: 'YMK-7Q4K-2291',
        validUntil: dateKey(addDays(now, 2)),
        status: 'aktif',
      },
      {
        id: 'k-2',
        title: 'Burs Kapsamında Yemek Bileti',
        description: 'SKS beslenme bursu kapsamında tanımlandı.',
        code: 'YMK-B8RT-0417',
        validUntil: dateKey(addDays(now, 30)),
        status: 'aktif',
      },
      {
        id: 'k-3',
        title: 'Bahar Şenliği Bileti',
        description: 'Şenlik günü özel menüsü.',
        code: 'YMK-SN25-8810',
        validUntil: dateKey(addDays(now, -40)),
        status: 'kullanildi',
      },
    ],
    feedback: [
      {
        id: 'f-1',
        kind: 'oneri',
        category: 'Yemek kalitesi',
        message: 'Haftada en az bir gün vegan ana yemek seçeneği eklenebilir mi?',
        anonymous: false,
        createdAt: iso(12, 14),
        status: 'yanitlandi',
        reply: 'Öneriniz menü komisyonuna iletildi; Kasım ayından itibaren Çarşamba günleri vegan seçenek sunulacak.',
      },
    ],
    notifications: [
      {
        id: 'n-1',
        kind: 'randevu',
        title: 'Randevunuz oluşturuldu',
        body: 'Yarın 12:30 – 12:45 saat diliminde yemeğinizi alabilirsiniz.',
        createdAt: iso(1, 9),
        read: false,
      },
      {
        id: 'n-2',
        kind: 'bilet',
        title: 'Yeni dijital bilet tanımlandı',
        body: 'Final Haftası Destek Bileti hesabınıza eklendi.',
        createdAt: iso(2, 11),
        read: true,
      },
    ],
    prefs: { randevu: true, bakiye: true, menu: true, bilet: true, lowBalanceThreshold: 120 },
    notifiedTicketIds: [],
  };
}

const OTHER_STUDENTS = ['Mert K.', 'Zeynep A.', 'Burak T.', 'Ayşe D.', 'Can Ö.', 'Deniz S.'];

/** Transfer listings opened by other students. */
export function seedMarket(now: Date): TransferListing[] {
  const days = nextWeekdays(now, 4);
  const plan: [number, number, 'corba' | 'salata'][] = [
    [0, 2, 'salata'],
    [0, 7, 'corba'],
    [1, 4, 'corba'],
    [2, 1, 'salata'],
    [2, 8, 'corba'],
    [3, 5, 'salata'],
  ];
  return plan.map(([day, slot, choice], i) => ({
    id: `l-seed-${i}`,
    ownerId: `u-other-${i}`,
    ownerName: OTHER_STUDENTS[i],
    date: days[day],
    slotIndex: slot,
    choice,
    price: MEAL_PRICE,
    createdAt: new Date(now.getTime() - (i + 1) * 47 * 60_000).toISOString(),
  }));
}
