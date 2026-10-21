import { useState } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useUserData } from '@/store/AppContext';
import { Button, Card, Chip, EmptyState, IconCircle, IconName, Screen, SectionTitle, Tone, styles, text } from '@/components/ui';
import { MEAL_PRICE } from '@/config';
import { TxType } from '@/types';
import { dateTime, tl } from '@/utils/format';
import { colors } from '@/theme';

type Filter = 'tum' | 'giris' | 'cikis';

const TX_META: Record<TxType, { icon: IconName; tone: Tone }> = {
  yukleme: { icon: 'arrow-down-circle', tone: 'success' },
  harcama: { icon: 'restaurant', tone: 'neutral' },
  iade: { icon: 'arrow-undo', tone: 'info' },
  'devir-alim': { icon: 'swap-horizontal', tone: 'warning' },
  'devir-iade': { icon: 'swap-horizontal', tone: 'info' },
};

export default function WalletScreen() {
  const router = useRouter();
  const { data } = useUserData();
  const [filter, setFilter] = useState<Filter>('tum');

  const now = new Date();
  const monthTx = data.transactions.filter((t) => {
    const d = new Date(t.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const spentThisMonth = -monthTx.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0);
  const loadedThisMonth = monthTx.filter((t) => t.type === 'yukleme').reduce((s, t) => s + t.amount, 0);

  const list = data.transactions.filter((t) =>
    filter === 'tum' ? true : filter === 'giris' ? t.amount > 0 : t.amount < 0,
  );

  return (
    <Screen>
      <Card style={{ alignItems: 'center', paddingVertical: 28 }}>
        <Text style={text.muted}>Kalan bakiye</Text>
        <Text style={{ fontSize: 38, fontWeight: '800', color: colors.text }}>{tl(data.balance)}</Text>
        <Text style={text.muted}>Yaklaşık {Math.floor(data.balance / MEAL_PRICE)} öğüne yeter</Text>
        <Button title="Bakiye yükle" icon="add-circle" onPress={() => router.push('/topup')} style={{ alignSelf: 'stretch', marginTop: 8 }} />
      </Card>

      <View style={[styles.row, { gap: 12 }]}>
        <Card style={{ flex: 1, gap: 4 }}>
          <Text style={text.muted}>Bu ay harcanan</Text>
          <Text style={text.h2}>{tl(spentThisMonth)}</Text>
        </Card>
        <Card style={{ flex: 1, gap: 4 }}>
          <Text style={text.muted}>Bu ay yüklenen</Text>
          <Text style={[text.h2, { color: colors.success }]}>{tl(loadedThisMonth)}</Text>
        </Card>
      </View>

      <SectionTitle>İşlem geçmişi</SectionTitle>
      <View style={[styles.row, { gap: 8 }]}>
        <Chip label="Tümü" selected={filter === 'tum'} onPress={() => setFilter('tum')} />
        <Chip label="Girişler" selected={filter === 'giris'} onPress={() => setFilter('giris')} />
        <Chip label="Harcamalar" selected={filter === 'cikis'} onPress={() => setFilter('cikis')} />
      </View>

      <Card style={{ paddingVertical: 4, gap: 0 }}>
        {list.length === 0 ? (
          <EmptyState icon="receipt-outline" title="İşlem bulunamadı" />
        ) : (
          list.map((t, i) => {
            const meta = TX_META[t.type];
            return (
              <View key={t.id}>
                {i > 0 && <View style={styles.divider} />}
                <View style={[styles.row, { paddingVertical: 12 }]}>
                  <IconCircle name={meta.icon} tone={meta.tone} size={38} />
                  <View style={{ flex: 1 }}>
                    <Text style={[text.body, { fontWeight: '600' }]} numberOfLines={1}>
                      {t.description}
                    </Text>
                    <Text style={text.muted}>{dateTime(t.date)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[text.body, { fontWeight: '700', color: t.amount > 0 ? colors.success : colors.text }]}>
                      {t.amount > 0 ? '+' : ''}
                      {tl(t.amount)}
                    </Text>
                    <Text style={text.muted}>{tl(t.balanceAfter)}</Text>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </Card>
    </Screen>
  );
}
