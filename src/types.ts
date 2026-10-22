export type User = {
  id: string;
  name: string;
  email: string;
  studentNo: string;
  faculty: string;
};

export type TxType = 'yukleme' | 'harcama' | 'iade' | 'devir-alim' | 'devir-iade';

export type Transaction = {
  id: string;
  type: TxType;
  /** Signed amount: positive adds to balance, negative spends. */
  amount: number;
  description: string;
  date: string;
  balanceAfter: number;
};

/** Drink or dessert: one of the two is a required part of every tray. */
export type ExtraChoice = 'icecek' | 'tatli';

/**
 * What the student takes. The main dish is always included; soup and the
 * second dish (pilav) are optional; exactly one of drink or dessert.
 */
export type TraySelection = { soup: boolean; side: boolean; extra: ExtraChoice };

export type MenuItem = { name: string; kcal: number };

export type MenuDay = {
  date: string;
  soup: MenuItem;
  main: MenuItem;
  side: MenuItem;
  drink: MenuItem;
  dessert: MenuItem;
};

export type PaymentMethod = 'bakiye' | 'ucretsiz' | 'bilet';

export type ReservationStatus =
  | 'aktif'
  | 'devirde'
  | 'devredildi'
  | 'iptal'
  | 'tamamlandi'
  | 'kullanilmadi';

export type Reservation = {
  id: string;
  date: string;
  tray: TraySelection;
  slotIndex: number;
  status: ReservationStatus;
  paidWith: PaymentMethod;
  price: number;
  ticketId?: string;
  source: 'normal' | 'devir';
  createdAt: string;
};

/**
 * A reservation offered for transfer. The buyer flips it to 'devralindi';
 * the seller's app then settles its side (refund, notification) and deletes it.
 */
export type TransferListing = {
  id: string;
  ownerId: string;
  ownerName: string;
  reservationId: string;
  date: string;
  slotIndex: number;
  tray: TraySelection;
  price: number;
  createdAt: string;
  status: 'acik' | 'devralindi';
  takenBy?: string;
  takenAt?: string;
};

export type TicketStatus = 'aktif' | 'kullanildi' | 'suresi-doldu';

export type Ticket = {
  id: string;
  title: string;
  description: string;
  code: string;
  validUntil: string;
  status: TicketStatus;
};

export type FeedbackKind = 'sikayet' | 'oneri';

export type Feedback = {
  id: string;
  kind: FeedbackKind;
  category: string;
  message: string;
  anonymous: boolean;
  createdAt: string;
  status: 'alindi' | 'inceleniyor' | 'yanitlandi';
  reply?: string;
};

export type NotificationKind = 'randevu' | 'bakiye' | 'menu' | 'bilet';

export type AppNotification = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
};

export type NotificationPrefs = Record<NotificationKind, boolean> & {
  lowBalanceThreshold: number;
};

export type UserData = {
  profile: User;
  balance: number;
  transactions: Transaction[];
  reservations: Reservation[];
  tickets: Ticket[];
  freeMeals: number;
  mealsConsumed: number;
  feedback: Feedback[];
  notifications: AppNotification[];
  prefs: NotificationPrefs;
  lastMenuWeekNotified?: string;
  notifiedTicketIds: string[];
};
