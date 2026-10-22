import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from 'firebase/app';
import { Auth, connectAuthEmulator, getAuth, initializeAuth, Persistence } from 'firebase/auth';
import { connectFirestoreEmulator, initializeFirestore } from 'firebase/firestore';
import { firebaseConfig } from './firebaseConfig';

export const app = initializeApp(firebaseConfig);

/**
 * The web SDK keeps the session in IndexedDB. On iOS/Android it has to be
 * given AsyncStorage, or users are signed out on every app start.
 * getReactNativePersistence only exists in the react-native build of
 * firebase/auth, so it is not in the default TypeScript types.
 */
function createAuth(): Auth {
  if (Platform.OS === 'web') return getAuth(app);
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getReactNativePersistence } = require('firebase/auth') as {
    getReactNativePersistence: (storage: typeof AsyncStorage) => Persistence;
  };
  return initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
}

export const auth = createAuth();

// Optional fields (e.g. a reservation's ticketId) are left undefined rather than deleted.
export const db = initializeFirestore(app, { ignoreUndefinedProperties: true });

// Local development against `firebase emulators:start` (see firebase.json).
if (process.env.EXPO_PUBLIC_FIREBASE_EMULATOR === '1') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}
