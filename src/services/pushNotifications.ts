import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';

/**
 * Device notifications. Every notification also lands in the in-app
 * notification center; this module only mirrors them to the OS on
 * iOS/Android (expo-notifications has no web support).
 */
const supported = Platform.OS !== 'web';

if (supported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

let permission: boolean | null = null;

async function ensurePermission(): Promise<boolean> {
  if (!supported) return false;
  if (permission !== null) return permission;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('yemekhane', {
      name: 'Yemekhane',
      importance: AndroidImportance.HIGH,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  permission = current.granted || (await Notifications.requestPermissionsAsync()).granted;
  return permission;
}

export async function showNow(title: string, body: string): Promise<void> {
  if (!(await ensurePermission())) return;
  await Notifications.scheduleNotificationAsync({ content: { title, body }, trigger: null });
}

export async function scheduleAt(id: string, date: Date, title: string, body: string): Promise<void> {
  if (date.getTime() <= Date.now() || !(await ensurePermission())) return;
  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: { title, body },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
  });
}

export async function cancelScheduled(id: string): Promise<void> {
  if (!supported) return;
  await Notifications.cancelScheduledNotificationAsync(id);
}
