import { User, UserData } from '../types';
import { addDays, dateKey, uid } from '../utils/format';

/** Starting state of a newly registered student. */
export function newUserData(profile: User, now: Date): UserData {
  const created = now.toISOString();
  return {
    profile,
    balance: 0,
    freeMeals: 0,
    mealsConsumed: 0,
    transactions: [],
    reservations: [],
    tickets: [
      {
        id: uid(),
        title: 'Hoş Geldin Bileti',
        description: 'Yeni kayıt olan öğrencilere bir öğle yemeği hediye.',
        code: `YMK-${uid().slice(0, 4).toUpperCase()}-${String(Math.floor(1000 + Math.random() * 9000))}`,
        validUntil: dateKey(addDays(now, 30)),
        status: 'aktif',
      },
    ],
    feedback: [],
    notifications: [
      {
        id: uid(),
        kind: 'bilet',
        title: 'Hoş geldiniz!',
        body: 'Hesabınıza bir Hoş Geldin Bileti tanımlandı. İlk randevunuzda ödeme yöntemi olarak seçebilirsiniz.',
        createdAt: created,
        read: false,
      },
    ],
    prefs: { randevu: true, bakiye: true, menu: true, bilet: true, lowBalanceThreshold: 120 },
    notifiedTicketIds: [],
  };
}
