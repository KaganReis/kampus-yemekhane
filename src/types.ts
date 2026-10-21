export type User = {
  id: string;
  name: string;
  email: string;
  studentNo: string;
  faculty: string;
};

export type Session = {
  token: string;
  userId: string;
  expiresAt: number;
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

/** The selectable component of the tray: soup or salad. */
export type ChoiceComponent = 'corba' | 'salata';

export type MenuItem = { name: string; kcal: number };

export type MenuDay = {
  date: string;
  soup: MenuItem;
  main: MenuItem;
  side: MenuItem;
  salad: MenuItem;
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
  choice: ChoiceComponent;
  slotIndex: number;
  status: ReservationStatus;
  paidWith: PaymentMethod;
  price: number;
  ticketId?: string;
  source: 'normal' | 'devir';
  createdAt: string;
};

export type TransferListing = {
  id: string;
  ownerId: string;
  ownerName: string;
  reservationId?: string;
  date: string;
  slotIndex: number;
  choice: ChoiceComponent;
  price: number;
  createdAt: string;
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
