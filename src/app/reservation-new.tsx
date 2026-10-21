import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useUserData } from '@/store/AppContext';
import { Badge, Banner, Button, Card, Chip, ProgressBar, Screen, SectionTitle, errorMessage, styles, text } from '@/components/ui';
import {
  CHOICE_LABEL,
  MEAL_PRICE,
  SLOT_CAPACITY,
  TIME_PREFERENCES,
  TimePreference,
  slotLabel,
} from '@/config';
import { baseKcal, menuFor, slotOccupancy } from '@/data/menu';
import { isBookable } from '@/services/api';
import { ChoiceComponent, PaymentMethod, Reservation } from '@/types';
import { addDays, dateKey, longDate, relativeDay, shortDate, shortDayName, tl } from '@/utils/format';
import { colors, radius, space } from '@/theme';

function bookableDates(now: Date): string[] {
  const out: string[] = [];
  for (let i = 0; i < 14; i++) {
    const key = dateKey(addDays(now, i));
    if (isBookable(key, now)) out.push(key);
  }
  return out;
}

export default function NewReservationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ date?: string }>();
  const { data, reserve } = useUserData();
  const now = new Date();

  const taken = new Set(
    data.reservations.filter((r) => r.status === 'aktif' || r.status === 'devirde').map((r) => r.date),
  );
  const dates = bookableDates(now);
  const initial = params.date && dates.includes(params.date) && !taken.has(params.date) ? params.date : dates.find((d) => !taken.has(d));

  const [date, setDate] = useState<string | undefined>(initial);
  const [choice, setChoice] = useState<ChoiceComponent>('corba');
  const [preference, setPreference] = useState<TimePreference>('orta');
  const activeTickets = data.tickets.filter((t) => t.status === 'aktif' && (!date || t.validUntil >= date));
  const [payment, setPayment] = useState<PaymentMethod>('bakiye');
  const [ticketId, setTicketId] = useState<string | undefined>(activeTickets[0]?.id);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Reservation | null>(null);

  if (created) return <Success r={created} onDone={() => router.replace('/reservations')} />;

  if (!date) {
    return (
      <Screen>
        <Banner tone="info" text="Önümüzdeki iki hafta için randevu alınabilecek boş bir gününüz yok." />
      </Screen>
    );
  }

  const menu = menuFor(date);
  const load = slotOccupancy(date);
  const ticketValid = activeTickets.some((t) => t.id === ticketId);
  const canPay =
    payment === 'bakiye' ? data.balance >= MEAL_PRICE : payment === 'ucretsiz' ? data.freeMeals > 0 : ticketValid;

  async function submit() {
    setError(null);
    setLoading(true);
    try {
      const r = await reserve({ date: date!, choice, preference, paidWith: payment, ticketId: payment === 'bilet' ? ticketId : undefined });
      setCreated(r);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <SectionTitle>1. Gün seçin</SectionTitle>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8, alignItems: 'center' }}>
        {dates.map((d) => (
          <Chip
            key={d}
            label={`${shortDayName(d)} ${shortDate(d)}${taken.has(d) ? ' ✓' : ''}`}
            selected={d === date}
            onPress={() => !taken.has(d) && setDate(d)}
          />
        ))}
      </ScrollView>
      <Text style={text.muted}>✓ işaretli günlerde randevunuz zaten var. Aynı gün için randevu alımı 10:00’da kapanır.</Text>

      <Card style={{ gap: 6 }}>
        <Text style={text.h3}>{longDate(date)} · sabit menü</Text>
        <Text style={text.body}>
          {menu.main.name} · {menu.side.name} · {menu.dessert.name}
        </Text>
        <Text style={text.muted}>{baseKcal(menu)} kcal</Text>
      </Card>

      <SectionTitle>2. Bileşen seçin</SectionTitle>
      <View style={[styles.row, { alignItems: 'stretch' }]}>
        {(['corba', 'salata'] as const).map((c) => {
          const item = c === 'corba' ? menu.soup : menu.salad;
          const selected = c === choice;
          return (
            <Pressable
              key={c}
              onPress={() => setChoice(c)}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              style={[s.option, { flex: 1 }, selected && s.optionSelected]}
            >
              <Ionicons name={c === 'corba' ? 'cafe' : 'leaf'} size={24} color={selected ? colors.primary : colors.muted} />
              <Text style={text.h3}>{CHOICE_LABEL[c]}</Text>
              <Text style={text.body}>{item.name}</Text>
              <Text style={text.muted}>{item.kcal} kcal</Text>
            </Pressable>
          );
        })}
      </View>

      <SectionTitle>3. Saat tercihi</SectionTitle>
      <Text style={[text.muted, { marginTop: -4 }]}>
        Sistem, tercih ettiğiniz aralıkta en az yoğun 15 dakikalık dilimi size atar.
      </Text>
      {TIME_PREFERENCES.map((p) => {
        const fill = p.slots.reduce((sum, i) => sum + load[i], 0) / (p.slots.length * SLOT_CAPACITY);
        const selected = p.key === preference;
        return (
          <Pressable
            key={p.key}
            onPress={() => setPreference(p.key)}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            style={[s.option, selected && s.optionSelected]}
          >
            <View style={[styles.row, { justifyContent: 'space-between' }]}>
              <Text style={text.h3}>
                {p.label} <Text style={text.muted}>{p.range}</Text>
              </Text>
              <Badge
                label={fill > 0.85 ? 'Yoğun' : fill > 0.6 ? 'Orta' : 'Sakin'}
                tone={fill > 0.85 ? 'danger' : fill > 0.6 ? 'warning' : 'success'}
              />
            </View>
            <ProgressBar value={fill} color={fill > 0.85 ? colors.danger : fill > 0.6 ? colors.warning : colors.success} />
          </Pressable>
        );
      })}

      <SectionTitle>4. Ödeme</SectionTitle>
      <PayOption
        selected={payment === 'bakiye'}
        onPress={() => setPayment('bakiye')}
        title={`Bakiye · ${tl(MEAL_PRICE)}`}
        detail={`Mevcut bakiye ${tl(data.balance)}`}
        disabled={data.balance < MEAL_PRICE}
      />
      <PayOption
        selected={payment === 'ucretsiz'}
        onPress={() => setPayment('ucretsiz')}
        title="Ücretsiz yemek hakkı"
        detail={`${data.freeMeals} hakkınız var`}
        disabled={data.freeMeals < 1}
      />
      <PayOption
        selected={payment === 'bilet'}
        onPress={() => setPayment('bilet')}
        title="Dijital yemek bileti"
        detail={activeTickets.length ? `${activeTickets.length} geçerli bilet` : 'Bu tarih için geçerli bilet yok'}
        disabled={activeTickets.length === 0}
      />
      {payment === 'bilet' && activeTickets.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {activeTickets.map((t) => (
            <Chip key={t.id} label={t.title} selected={t.id === ticketId} onPress={() => setTicketId(t.id)} />
          ))}
        </View>
      )}

      {error && <Banner tone="danger" text={error} />}
      {payment === 'bakiye' && data.balance < MEAL_PRICE && (
        <Button title="Yetersiz bakiye — bakiye yükle" variant="secondary" onPress={() => router.push('/topup')} />
      )}
      <Button title="Randevuyu oluştur" icon="checkmark-circle" loading={loading} disabled={!canPay} onPress={submit} />
    </Screen>
  );
}

function PayOption({
  selected,
  onPress,
  title,
  detail,
  disabled,
}: {
  selected: boolean;
  onPress: () => void;
  title: string;
  detail: string;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled }}
      style={[s.option, s.payOption, selected && s.optionSelected, disabled && { opacity: 0.5 }]}
    >
      <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={22} color={selected ? colors.primary : colors.muted} />
      <View style={{ flex: 1 }}>
        <Text style={text.h3}>{title}</Text>
        <Text style={text.muted}>{detail}</Text>
      </View>
    </Pressable>
  );
}

function Success({ r, onDone }: { r: Reservation; onDone: () => void }) {
  const menu = menuFor(r.date);
  return (
    <Screen contentStyle={{ alignItems: 'stretch', paddingTop: 40 }}>
      <View style={{ alignItems: 'center', gap: 8 }}>
        <Ionicons name="checkmark-circle" size={72} color={colors.success} />
        <Text style={text.h1}>Randevunuz hazır</Text>
        <Text style={text.muted}>
          {relativeDay(r.date) === longDate(r.date) ? longDate(r.date) : `${relativeDay(r.date)} · ${longDate(r.date)}`}
        </Text>
      </View>
      <Card style={{ alignItems: 'center', backgroundColor: colors.primarySoft, borderColor: colors.primarySoft }}>
        <Text style={[text.muted, { color: colors.primaryDark }]}>Atanan saat diliminiz</Text>
        <Text style={{ fontSize: 34, fontWeight: '800', color: colors.primaryDark }}>{slotLabel(r.slotIndex)}</Text>
        <Text style={[text.body, { color: colors.primaryDark, textAlign: 'center' }]}>
          {menu.main.name} · {menu.side.name} · {menu.dessert.name} · {r.choice === 'corba' ? menu.soup.name : menu.salad.name}
        </Text>
      </Card>
      <Banner tone="info" text="Saat diliminizden 30 dakika önce hatırlatma bildirimi gönderilecek. Bu dilim dışında servis alınamaz." />
      <Button title="Randevularıma git" onPress={onDone} />
    </Screen>
  );
}

const s = StyleSheet.create({
  option: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: space.lg,
    gap: 6,
  },
  optionSelected: { borderColor: colors.primary, backgroundColor: '#F0FDFA' },
  payOption: { flexDirection: 'row', alignItems: 'center', gap: space.md },
});
