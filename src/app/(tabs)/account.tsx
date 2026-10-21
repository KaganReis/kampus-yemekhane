import { Pressable, Text, View } from 'react-native';
import { Href, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useUserData } from '@/store/AppContext';
import { Card, IconCircle, IconName, Screen, Tone, confirm, styles, text } from '@/components/ui';
import { colors } from '@/theme';

export default function AccountScreen() {
  const router = useRouter();
  const { user, data, logout, resetDemo } = useUserData();
  const unread = data.notifications.filter((n) => !n.read).length;
  const initials = user.name
    .split(' ')
    .map((p) => p[0])
    .join('');

  const items: { icon: IconName; tone: Tone; label: string; detail?: string; href: Href }[] = [
    { icon: 'gift', tone: 'accent', label: 'Ödüller ve dijital biletler', detail: `${data.freeMeals} ücretsiz hak`, href: '/rewards' },
    { icon: 'notifications', tone: 'info', label: 'Bildirimler', detail: unread ? `${unread} yeni` : undefined, href: '/notifications' },
    { icon: 'options', tone: 'neutral', label: 'Bildirim ayarları', href: '/notification-settings' },
    { icon: 'chatbubble-ellipses', tone: 'primary', label: 'Şikâyet ve öneri', href: '/feedback' },
  ];

  return (
    <Screen>
      <Card style={{ alignItems: 'center' }}>
        <View
          style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ color: '#fff', fontSize: 26, fontWeight: '700' }}>{initials}</Text>
        </View>
        <Text style={text.h2}>{user.name}</Text>
        <Text style={text.muted}>{user.email}</Text>
        <Text style={text.muted}>
          {user.faculty} · Öğrenci no: {user.studentNo}
        </Text>
      </Card>

      <Card style={{ paddingVertical: 4, gap: 0 }}>
        {items.map((item, i) => (
          <View key={item.label}>
            {i > 0 && <View style={styles.divider} />}
            <Pressable
              onPress={() => router.push(item.href)}
              accessibilityRole="button"
              style={({ pressed }) => [styles.row, { paddingVertical: 14 }, pressed && { opacity: 0.6 }]}
            >
              <IconCircle name={item.icon} tone={item.tone} size={36} />
              <Text style={[text.body, { flex: 1, fontWeight: '500' }]}>{item.label}</Text>
              {item.detail && <Text style={text.muted}>{item.detail}</Text>}
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </Pressable>
          </View>
        ))}
      </Card>

      <Pressable
        onPress={async () => {
          if (await confirm('Çıkış yap', 'Oturumunuz bu cihazda kapatılacak.', 'Çıkış yap')) await logout();
        }}
        accessibilityRole="button"
        style={({ pressed }) => [styles.card, styles.row, pressed && { opacity: 0.6 }]}
      >
        <IconCircle name="log-out" tone="danger" size={36} />
        <Text style={[text.body, { color: colors.danger, fontWeight: '600' }]}>Çıkış yap</Text>
      </Pressable>
      <Pressable
        onPress={async () => {
          if (await confirm('Demo verilerini sıfırla', 'Bakiye, randevu ve bildirimler başlangıç durumuna döner ve oturum kapanır.', 'Sıfırla'))
            await resetDemo();
        }}
        accessibilityRole="button"
        style={({ pressed }) => [styles.card, styles.row, pressed && { opacity: 0.6 }]}
      >
        <IconCircle name="refresh" tone="neutral" size={36} />
        <View style={{ flex: 1 }}>
          <Text style={[text.body, { fontWeight: '600' }]}>Demo verilerini sıfırla</Text>
          <Text style={text.muted}>Demoyu baştan denemek için</Text>
        </View>
      </Pressable>
    </Screen>
  );
}
