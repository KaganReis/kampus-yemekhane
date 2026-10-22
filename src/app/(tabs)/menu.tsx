import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useUserData } from '@/store/AppContext';
import { Badge, Button, Card, Chip, Screen, Segmented, styles, text } from '@/components/ui';
import { trayKcal, weekMenu } from '@/data/menu';
import { isBookable } from '@/services/api';
import { dateKey, longDate, shortDate, shortDayName } from '@/utils/format';
import { MenuItem } from '@/types';
import { colors } from '@/theme';

type Week = 'bu' | 'gelecek';

export default function MenuScreen() {
  const router = useRouter();
  const { data } = useUserData();
  const now = new Date();
  const [week, setWeek] = useState<Week>('bu');
  const days = weekMenu(now, week === 'bu' ? 0 : 1);
  const today = dateKey(now);
  const [selected, setSelected] = useState(() => days.find((d) => d.date >= today)?.date ?? days[0].date);
  const menu = days.find((d) => d.date === selected) ?? days[0];

  const reservation = data.reservations.find(
    (r) => r.date === menu.date && (r.status === 'aktif' || r.status === 'devirde'),
  );
  const bookable = isBookable(menu.date, now);

  function changeWeek(w: Week) {
    setWeek(w);
    const next = weekMenu(now, w === 'bu' ? 0 : 1);
    setSelected(next.find((d) => d.date >= today)?.date ?? next[0].date);
  }

  return (
    <Screen>
      <Segmented
        options={[
          { key: 'bu', label: 'Bu hafta' },
          { key: 'gelecek', label: 'Gelecek hafta' },
        ]}
        value={week}
        onChange={changeWeek}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8, alignItems: 'center' }}>
        {days.map((d) => (
          <Chip
            key={d.date}
            label={`${shortDayName(d.date)} ${shortDate(d.date).split(' ')[0]}`}
            selected={d.date === selected}
            onPress={() => setSelected(d.date)}
          />
        ))}
      </ScrollView>

      <Card>
        <View style={[styles.row, { justifyContent: 'space-between' }]}>
          <Text style={text.h2}>{longDate(menu.date)}</Text>
          {menu.date === today && <Badge label="Bugün" tone="primary" />}
        </View>

        <Text style={[text.muted, { marginTop: 4 }]}>ZORUNLU</Text>
        <Dish label="Ana yemek" item={menu.main} />

        <View style={styles.divider} />
        <Text style={text.muted}>ZORUNLU · BİRİNİ SEÇİN</Text>
        <Dish label="İçecek" item={menu.drink} />
        <Dish label="Tatlı" item={menu.dessert} />

        <View style={styles.divider} />
        <Text style={text.muted}>İSTEĞE BAĞLI</Text>
        <Dish label="Çorba" item={menu.soup} />
        <Dish label="2. yemek (pilav)" item={menu.side} />

        <View style={styles.divider} />
        <Text style={text.muted}>
          Tam tepsi: {trayKcal(menu, { soup: true, side: true, extra: 'tatli' })} kcal (tatlıyla) ·{' '}
          {trayKcal(menu, { soup: true, side: true, extra: 'icecek' })} kcal (içecekle)
        </Text>
      </Card>

      {reservation ? (
        <Card style={{ backgroundColor: colors.primarySoft, borderColor: colors.primarySoft }}>
          <Text style={[text.body, { color: colors.primaryDark, fontWeight: '600' }]}>Bu gün için randevunuz var.</Text>
          <Button title="Randevuyu görüntüle" variant="secondary" onPress={() => router.push('/reservations')} />
        </Card>
      ) : bookable ? (
        <Button
          title="Bu gün için randevu al"
          icon="calendar"
          onPress={() => router.push({ pathname: '/reservation-new', params: { date: menu.date } })}
        />
      ) : (
        <Text style={[text.muted, { textAlign: 'center' }]}>Bu gün için randevu alımı kapalı.</Text>
      )}
    </Screen>
  );
}

function Dish({ label, item }: { label: string; item: MenuItem }) {
  return (
    <View style={[styles.row, { justifyContent: 'space-between' }]}>
      <View style={{ flex: 1 }}>
        <Text style={text.muted}>{label}</Text>
        <Text style={[text.body, { fontWeight: '600' }]}>{item.name}</Text>
      </View>
      <Text style={text.muted}>{item.kcal} kcal</Text>
    </View>
  );
}
