import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useUserData } from '@/store/AppContext';
import { Badge, Banner, Card, EmptyState, ProgressBar, Screen, SectionTitle, Tone, styles, text } from '@/components/ui';
import { MEALS_PER_FREE_MEAL } from '@/config';
import { TicketStatus } from '@/types';
import { longDate } from '@/utils/format';
import { colors } from '@/theme';

const LEVELS = [
  { name: 'Bronz', min: 0, color: '#B45309' },
  { name: 'Gümüş', min: 25, color: '#6B7280' },
  { name: 'Altın', min: 60, color: '#CA8A04' },
];

const TICKET_STATUS: Record<TicketStatus, { label: string; tone: Tone }> = {
  aktif: { label: 'Kullanılabilir', tone: 'success' },
  kullanildi: { label: 'Kullanıldı', tone: 'neutral' },
  'suresi-doldu': { label: 'Süresi doldu', tone: 'danger' },
};

export default function RewardsScreen() {
  const { data } = useUserData();
  const meals = data.mealsConsumed;
  const toNext = MEALS_PER_FREE_MEAL - (meals % MEALS_PER_FREE_MEAL);
  const levelIndex = LEVELS.findLastIndex((l) => meals >= l.min);
  const level = LEVELS[levelIndex];
  const nextLevel = LEVELS[levelIndex + 1];

  const tickets = [...data.tickets].sort((a, b) => Number(b.status === 'aktif') - Number(a.status === 'aktif'));

  return (
    <Screen>
      <View style={[styles.row, { gap: 12 }]}>
        <Card style={{ flex: 1, alignItems: 'center', backgroundColor: colors.accentSoft, borderColor: colors.accentSoft }}>
          <Ionicons name="gift" size={28} color={colors.accent} />
          <Text style={{ fontSize: 32, fontWeight: '800', color: colors.accent }}>{data.freeMeals}</Text>
          <Text style={[text.muted, { textAlign: 'center' }]}>Ücretsiz yemek hakkı</Text>
        </Card>
        <Card style={{ flex: 1, alignItems: 'center' }}>
          <Ionicons name="medal" size={28} color={level.color} />
          <Text style={{ fontSize: 22, fontWeight: '800', color: level.color }}>{level.name}</Text>
          <Text style={[text.muted, { textAlign: 'center' }]}>{meals} öğün tamamlandı</Text>
        </Card>
      </View>

      <Card>
        <Text style={text.h3}>Sonraki ücretsiz yemek</Text>
        <ProgressBar value={(meals % MEALS_PER_FREE_MEAL) / MEALS_PER_FREE_MEAL} color={colors.accent} />
        <Text style={text.muted}>
          {meals % MEALS_PER_FREE_MEAL}/{MEALS_PER_FREE_MEAL} öğün · {toNext} öğün sonra 1 ücretsiz yemek hakkı kazanırsınız.
        </Text>
        {nextLevel && (
          <>
            <View style={styles.divider} />
            <Text style={text.h3}>{nextLevel.name} seviyesine</Text>
            <ProgressBar value={(meals - level.min) / (nextLevel.min - level.min)} color={nextLevel.color} />
            <Text style={text.muted}>{nextLevel.min - meals} öğün kaldı.</Text>
          </>
        )}
      </Card>

      <Banner
        tone="info"
        text="Ücretsiz yemek hakları ve dijital biletler randevu oluştururken ödeme yöntemi olarak seçilebilir."
      />

      <SectionTitle>Dijital yemek biletleri</SectionTitle>
      {tickets.length === 0 ? (
        <EmptyState icon="ticket-outline" title="Tanımlı biletiniz yok" />
      ) : (
        tickets.map((t) => {
          const status = TICKET_STATUS[t.status];
          const active = t.status === 'aktif';
          return (
            <Card key={t.id} style={!active && { opacity: 0.65 }}>
              <View style={[styles.row, { justifyContent: 'space-between', alignItems: 'flex-start' }]}>
                <Text style={[text.h3, { flex: 1 }]}>{t.title}</Text>
                <Badge label={status.label} tone={status.tone} />
              </View>
              <Text style={text.muted}>{t.description}</Text>
              <View
                style={{
                  borderWidth: 1.5,
                  borderStyle: 'dashed',
                  borderColor: active ? colors.primary : colors.border,
                  borderRadius: 10,
                  paddingVertical: 12,
                  alignItems: 'center',
                }}
              >
                <Text style={[text.mono, { fontSize: 20, fontWeight: '700', letterSpacing: 2, color: active ? colors.primaryDark : colors.muted }]}>
                  {t.code}
                </Text>
              </View>
              <Text style={text.muted}>Son geçerlilik: {longDate(t.validUntil)}</Text>
            </Card>
          );
        })
      )}
    </Screen>
  );
}
