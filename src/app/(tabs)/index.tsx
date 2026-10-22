import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useUserData } from '@/store/AppContext';
import { Button, Card, IconCircle, IconName, ProgressBar, Screen, SectionTitle, Tone, styles, text } from '@/components/ui';
import { ReservationCard } from '@/components/ReservationCard';
import { MEAL_PRICE, MEALS_PER_FREE_MEAL } from '@/config';
import { menuFor } from '@/data/menu';
import { isBookable } from '@/services/api';
import { dateKey, longDate, tl } from '@/utils/format';
import { colors, radius, space } from '@/theme';

export default function HomeScreen() {
  const router = useRouter();
  const { user, data, market } = useUserData();
  const now = new Date();
  const today = dateKey(now);

  const upcoming = data.reservations
    .filter((r) => r.status === 'aktif' || r.status === 'devirde')
    .sort((a, b) => a.date.localeCompare(b.date) || a.slotIndex - b.slotIndex);
  const next = upcoming[0];
  const isWeekday = now.getDay() !== 0 && now.getDay() !== 6;
  const todayMenu = isWeekday ? menuFor(today) : null;
  const progress = (data.mealsConsumed % MEALS_PER_FREE_MEAL) / MEALS_PER_FREE_MEAL;
  const activeTickets = data.tickets.filter((t) => t.status === 'aktif').length;
  const openListings = market.filter((l) => l.ownerId !== user.id).length;

  return (
    <Screen>
      <View>
        <Text style={text.muted}>{longDate(today)}</Text>
        <Text style={text.h1}>Merhaba, {user.name.split(' ')[0]} 👋</Text>
      </View>

      <View style={s.balance}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={s.balanceLabel}>Kalan bakiye</Text>
          <Text style={s.balanceValue}>{tl(data.balance)}</Text>
          <Text style={s.balanceHint}>≈ {Math.floor(data.balance / MEAL_PRICE)} öğün · öğün ücreti {tl(MEAL_PRICE)}</Text>
        </View>
        <Pressable
          style={s.topUp}
          onPress={() => router.push('/topup')}
          accessibilityRole="button"
          accessibilityLabel="Bakiye yükle"
        >
          <Ionicons name="add" size={20} color={colors.primary} />
          <Text style={s.topUpText}>Yükle</Text>
        </Pressable>
      </View>

      <SectionTitle>Sıradaki randevu</SectionTitle>
      {next ? (
        <Pressable onPress={() => router.push('/reservations')} accessibilityRole="button">
          <ReservationCard r={next} />
        </Pressable>
      ) : (
        <Card>
          <Text style={text.body}>Yaklaşan bir randevunuz yok.</Text>
          <Button title="Randevu oluştur" icon="add-circle" onPress={() => router.push('/reservation-new')} />
        </Card>
      )}

      <View style={s.grid}>
        <QuickAction icon="add-circle" tone="primary" label="Randevu al" onPress={() => router.push('/reservation-new')} />
        <QuickAction
          icon="swap-horizontal"
          tone="warning"
          label="Devir ilanları"
          detail={openListings ? `${openListings} ilan` : undefined}
          onPress={() => router.push({ pathname: '/reservations', params: { tab: 'devir' } })}
        />
        <QuickAction
          icon="gift"
          tone="accent"
          label="Ödüller"
          detail={data.freeMeals ? `${data.freeMeals} ücretsiz hak` : undefined}
          onPress={() => router.push('/rewards')}
        />
        <QuickAction icon="chatbubble-ellipses" tone="info" label="Geri bildirim" onPress={() => router.push('/feedback')} />
      </View>

      <SectionTitle
        action={<Button title="Tüm hafta" variant="ghost" compact onPress={() => router.push('/menu')} />}
      >
        Bugünün menüsü
      </SectionTitle>
      <Card>
        {todayMenu ? (
          [
            ['Ana yemek', todayMenu.main.name],
            ['Pilav', todayMenu.side.name],
            ['Çorba', todayMenu.soup.name],
            ['İçecek', todayMenu.drink.name],
            ['Tatlı', todayMenu.dessert.name],
          ].map(([k, v]) => (
            <View key={k} style={[styles.row, { justifyContent: 'space-between' }]}>
              <Text style={text.muted}>{k}</Text>
              <Text style={[text.body, { fontWeight: '600' }]}>{v}</Text>
            </View>
          ))
        ) : (
          <Text style={text.body}>Hafta sonu yemekhane kapalıdır.</Text>
        )}
        {todayMenu && !isBookable(today, now) && (
          <Text style={text.muted}>Bugün için randevu alımı saat 10:00’da kapandı.</Text>
        )}
      </Card>

      <Pressable onPress={() => router.push('/rewards')} accessibilityRole="button">
        <Card>
          <View style={[styles.row, { justifyContent: 'space-between' }]}>
            <Text style={text.h3}>Ödül durumu</Text>
            <Text style={text.muted}>{activeTickets} aktif bilet</Text>
          </View>
          <ProgressBar value={progress} color={colors.accent} />
          <Text style={text.muted}>
            Bir sonraki ücretsiz yemeğe {MEALS_PER_FREE_MEAL - (data.mealsConsumed % MEALS_PER_FREE_MEAL)} öğün kaldı.
          </Text>
        </Card>
      </Pressable>
    </Screen>
  );
}

function QuickAction({
  icon,
  tone,
  label,
  detail,
  onPress,
}: {
  icon: IconName;
  tone: Tone;
  label: string;
  detail?: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={({ pressed }) => [s.action, pressed && { opacity: 0.7 }]} onPress={onPress} accessibilityRole="button">
      <IconCircle name={icon} tone={tone} />
      <Text style={[text.h3, { fontSize: 14 }]}>{label}</Text>
      {detail ? <Text style={[text.muted, { fontSize: 12 }]}>{detail}</Text> : null}
    </Pressable>
  );
}

const s = StyleSheet.create({
  balance: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: space.xl,
    flexDirection: 'row',
    alignItems: 'center',
  },
  balanceLabel: { color: '#CCFBF1', fontSize: 14, fontWeight: '600' },
  balanceValue: { color: '#fff', fontSize: 32, fontWeight: '800' },
  balanceHint: { color: '#CCFBF1', fontSize: 12 },
  topUp: {
    backgroundColor: '#fff',
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  topUpText: { color: colors.primary, fontWeight: '700', fontSize: 15 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  action: {
    flexGrow: 1,
    flexBasis: '45%',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
});
