import { ColorValue, Pressable, Text, View } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useApp } from '@/store/AppContext';
import { colors } from '@/theme';

function BellButton() {
  const router = useRouter();
  const { data } = useApp();
  const unread = data?.notifications.filter((n) => !n.read).length ?? 0;
  return (
    <Pressable
      onPress={() => router.push('/notifications')}
      accessibilityRole="button"
      accessibilityLabel={unread ? `Bildirimler, ${unread} okunmamış` : 'Bildirimler'}
      style={{ marginRight: 16, padding: 4 }}
      hitSlop={8}
    >
      <Ionicons name="notifications-outline" size={24} color={colors.text} />
      {unread > 0 && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            minWidth: 17,
            height: 17,
            borderRadius: 9,
            backgroundColor: colors.accent,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 3,
          }}
        >
          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{unread > 9 ? '9+' : unread}</Text>
        </View>
      )}
    </Pressable>
  );
}

type IconName = keyof typeof Ionicons.glyphMap;

function tabIcon(name: IconName) {
  return function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Ionicons name={name} size={size} color={color as string} />;
  };
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        headerRight: () => <BellButton />,
        headerTitleStyle: { fontWeight: '700' },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Ana Sayfa', tabBarIcon: tabIcon('home') }} />
      <Tabs.Screen name="menu" options={{ title: 'Menü', tabBarIcon: tabIcon('restaurant') }} />
      <Tabs.Screen name="reservations" options={{ title: 'Randevu', tabBarIcon: tabIcon('calendar') }} />
      <Tabs.Screen name="wallet" options={{ title: 'Bakiye', tabBarIcon: tabIcon('wallet') }} />
      <Tabs.Screen name="account" options={{ title: 'Hesabım', tabBarIcon: tabIcon('person-circle') }} />
    </Tabs>
  );
}
