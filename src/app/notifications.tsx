import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useUserData } from '@/store/AppContext';
import { Button, Card, EmptyState, IconCircle, IconName, Screen, Tone, styles, text } from '@/components/ui';
import { NotificationKind } from '@/types';
import { dateTime } from '@/utils/format';
import { colors } from '@/theme';

const KIND: Record<NotificationKind, { icon: IconName; tone: Tone }> = {
  randevu: { icon: 'calendar', tone: 'primary' },
  bakiye: { icon: 'wallet', tone: 'success' },
  menu: { icon: 'restaurant', tone: 'info' },
  bilet: { icon: 'ticket', tone: 'accent' },
};

export default function NotificationsScreen() {
  const router = useRouter();
  const { data, markNotificationsRead } = useUserData();
  // Notifications are marked read on open, but keep their unread dots for this visit.
  const [unreadIds] = useState(() => new Set(data.notifications.filter((n) => !n.read).map((n) => n.id)));
  const marked = useRef(false);
  useEffect(() => {
    if (marked.current || !unreadIds.size) return;
    marked.current = true;
    markNotificationsRead().catch(() => {});
  }, [unreadIds, markNotificationsRead]);

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Button title="Ayarlar" variant="ghost" compact icon="options" onPress={() => router.push('/notification-settings')} />
          ),
        }}
      />
      <Screen>
        {data.notifications.length === 0 ? (
          <EmptyState icon="notifications-off-outline" title="Bildiriminiz yok" />
        ) : (
          <Card style={{ paddingVertical: 4, gap: 0 }}>
            {data.notifications.map((n, i) => {
              const k = KIND[n.kind];
              const unread = unreadIds.has(n.id);
              return (
                <View key={n.id}>
                  {i > 0 && <View style={styles.divider} />}
                  <View style={[styles.row, { paddingVertical: 14, alignItems: 'flex-start' }]}>
                    <IconCircle name={k.icon} tone={k.tone} size={38} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={[text.body, { fontWeight: unread ? '700' : '500' }]}>{n.title}</Text>
                      <Text style={text.muted}>{n.body}</Text>
                      <Text style={[text.muted, { fontSize: 12 }]}>{dateTime(n.createdAt)}</Text>
                    </View>
                    {unread && <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: colors.accent, marginTop: 6 }} />}
                  </View>
                </View>
              );
            })}
          </Card>
        )}
      </Screen>
    </>
  );
}
