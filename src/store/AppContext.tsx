import { createContext, ReactNode, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as api from '../services/api';
import { slotStart } from '../config';
import { FeedbackKind, NotificationPrefs, Reservation, TransferListing, User, UserData } from '../types';

type AppContextValue = {
  ready: boolean;
  /** Drives the auth guard. `user`/`data` stay set after logout so screens can unmount cleanly. */
  signedIn: boolean;
  user: User | null;
  data: UserData | null;
  /** Open, not yet started transfer listings (everyone's, including the student's own). */
  market: TransferListing[];
  login(email: string, password: string): Promise<void>;
  register(input: api.RegisterInput): Promise<void>;
  logout(): Promise<void>;
  topUp(amount: number): Promise<void>;
  reserve(input: api.ReserveInput): Promise<Reservation>;
  cancelReservation(id: string): Promise<void>;
  listForTransfer(reservationId: string): Promise<void>;
  withdrawListing(reservationId: string): Promise<void>;
  takeTransfer(listingId: string): Promise<Reservation>;
  submitFeedback(input: { kind: FeedbackKind; category: string; message: string; anonymous: boolean }): Promise<void>;
  markNotificationsRead(): Promise<void>;
  updatePrefs(prefs: NotificationPrefs): Promise<void>;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [uid, setUid] = useState<string | null>(null);
  const [data, setData] = useState<UserData | null>(null);
  const [allListings, setAllListings] = useState<TransferListing[]>([]);
  const syncing = useRef(false);

  const sync = () => {
    if (syncing.current) return;
    syncing.current = true;
    api
      .sync()
      .catch(() => {})
      .finally(() => (syncing.current = false));
  };

  // Firebase restores the session on start; until it answers, show the splash.
  useEffect(
    () =>
      api.onAuthChange(async (authUser) => {
        if (authUser) {
          await api.ensureUserDoc(authUser).catch(() => {});
          setUid(authUser.uid);
        } else {
          setUid(null);
          setReady(true);
        }
      }),
    [],
  );

  // Live copies of the student's document and the transfer market.
  useEffect(() => {
    if (!uid) return;
    const unsubUser = api.watchUserData(
      uid,
      (d) => {
        if (d) setData(d);
        setReady(true);
      },
      () => setReady(true),
    );
    const unsubMarket = api.watchMarket(setAllListings, () => {});
    sync();
    return () => {
      unsubUser();
      unsubMarket();
    };
  }, [uid]);

  // Another student took one of our listings: settle our side (refund) right away.
  useEffect(() => {
    if (uid && allListings.some((l) => l.ownerId === uid && l.status === 'devralindi')) sync();
  }, [uid, allListings]);

  // Finished meals and expired listings are settled when the app returns to the foreground.
  useEffect(() => {
    if (!uid) return;
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') sync();
    });
    return () => sub.remove();
  }, [uid]);

  const value = useMemo<AppContextValue>(() => {
    const now = new Date();
    return {
      ready,
      signedIn: !!uid && data?.profile.id === uid,
      user: data?.profile ?? null,
      data,
      market: allListings.filter((l) => l.status === 'acik' && slotStart(l.date, l.slotIndex) > now),
      login: api.login,
      register: api.register,
      logout: api.logout,
      topUp: api.topUp,
      reserve: api.reserve,
      cancelReservation: api.cancelReservation,
      listForTransfer: api.listForTransfer,
      withdrawListing: api.withdrawListing,
      takeTransfer: api.takeTransfer,
      submitFeedback: api.submitFeedback,
      markNotificationsRead: api.markNotificationsRead,
      updatePrefs: api.updatePrefs,
    };
  }, [ready, uid, data, allListings]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}

/** Data is always loaded on screens behind the auth guard. */
export function useUserData() {
  const app = useApp();
  if (!app.data || !app.user) throw new Error('useUserData used before login');
  return { ...app, data: app.data, user: app.user };
}
