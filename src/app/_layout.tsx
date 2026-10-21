import { ActivityIndicator, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppProvider, useApp } from '@/store/AppContext';
import { DialogHost } from '@/components/ui';
import { colors } from '@/theme';

function RootStack() {
  const { ready, signedIn } = useApp();

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.primary,
        headerTitleStyle: { color: colors.text },
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={signedIn} redirectTo="/login">
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="reservation-new" options={{ title: 'Yeni Randevu' }} />
        <Stack.Screen name="topup" options={{ title: 'Bakiye Yükle', presentation: 'modal' }} />
        <Stack.Screen name="rewards" options={{ title: 'Ödüller ve Biletler' }} />
        <Stack.Screen name="feedback" options={{ title: 'Şikâyet ve Öneri' }} />
        <Stack.Screen name="notifications" options={{ title: 'Bildirimler' }} />
        <Stack.Screen name="notification-settings" options={{ title: 'Bildirim Ayarları' }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AppProvider>
      <StatusBar style="dark" />
      <RootStack />
      <DialogHost />
    </AppProvider>
  );
}
