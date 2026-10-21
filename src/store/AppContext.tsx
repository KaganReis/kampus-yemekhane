import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import * as api from '../services/api';
import { FeedbackKind, NotificationPrefs, Reservation, TransferListing, User, UserData } from '../types';

type AppContextValue = {
  ready: boolean;
  /** Drives the auth guard. `user`/`data` stay set after logout so screens can unmount cleanly. */
  signedIn: boolean;
  user: User | null;
  data: UserData | null;
  market: TransferListing[];
  login(email: string, password: string): Promise<void>;
  logout(): Promise<void>;
  resetDemo(): Promise<void>;
  refresh(): Promise<void>;
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
  const [signedIn, setSignedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [data, setData] = useState<UserData | null>(null);
  const [market, setMarket] = useState<TransferListing[]>([]);

  const apply = useCallback(<R,>(snap: api.Snapshot & { result: R }) => {
    setData(snap.data);
    setMarket(snap.market);
    return snap.result;
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const restored = await api.restoreSession();
        if (restored) {
          apply(await api.fetchSnapshot(restored.id));
          setUser(restored);
          setSignedIn(true);
        }
      } finally {
        setReady(true);
      }
    })();
  }, [apply]);

  // Re-settle time-based state (finished meals, expired listings) when the app returns to the foreground.
  useEffect(() => {
    if (!user || !signedIn) return;
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') api.fetchSnapshot(user.id).then(apply).catch(() => {});
    });
    return () => sub.remove();
  }, [user, signedIn, apply]);

  const value = useMemo<AppContextValue>(() => {
    const uid = () => {
      if (!user) throw new api.ApiError('Oturum açmanız gerekiyor.');
      return user.id;
    };
    return {
      ready,
      signedIn,
      user,
      data,
      market,
      async login(email, password) {
        const u = await api.login(email, password);
        apply(await api.fetchSnapshot(u.id));
        setUser(u);
        setSignedIn(true);
      },
      async logout() {
        await api.logout();
        setSignedIn(false);
      },
      async resetDemo() {
        await api.resetDemo(uid());
        setSignedIn(false);
      },
      refresh: async () => void apply(await api.fetchSnapshot(uid())),
      topUp: async (amount) => void apply(await api.topUp(uid(), amount)),
      reserve: async (input) => apply(await api.reserve(uid(), input)),
      cancelReservation: async (id) => void apply(await api.cancelReservation(uid(), id)),
      listForTransfer: async (id) => void apply(await api.listForTransfer(uid(), shortName(user?.name ?? ''), id)),
      withdrawListing: async (id) => void apply(await api.withdrawListing(uid(), id)),
      takeTransfer: async (id) => apply(await api.takeTransfer(uid(), id)),
      submitFeedback: async (input) => void apply(await api.submitFeedback(uid(), input)),
      markNotificationsRead: async () => void apply(await api.markNotificationsRead(uid())),
      updatePrefs: async (prefs) => void apply(await api.updatePrefs(uid(), prefs)),
    };
  }, [ready, signedIn, user, data, market, apply]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

/** "Elif Yılmaz" → "Elif Y." for public transfer listings. */
const shortName = (name: string) => {
  const [first, ...rest] = name.split(' ');
  const last = rest.at(-1);
  return last ? `${first} ${last[0]}.` : first;
};

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
