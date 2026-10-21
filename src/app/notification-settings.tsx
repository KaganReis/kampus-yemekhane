import { useState } from 'react';
import { Platform, Switch, Text, View } from 'react-native';
import { useUserData } from '@/store/AppContext';
import { Banner, Card, Chip, IconCircle, IconName, Screen, SectionTitle, Tone, errorMessage, styles, text } from '@/components/ui';
import { NotificationKind, NotificationPrefs } from '@/types';
import { tl } from '@/utils/format';
import { colors } from '@/theme';

const ROWS: { key: NotificationKind; icon: IconName; tone: Tone; title: string; body: string }[] = [
  { key: 'randevu', icon: 'calendar', tone: 'primary', title: 'Randevu', body: 'Saat diliminden 30 dk önce hatırlatma, oluşturma, iptal ve devir bildirimleri' },
  { key: 'bakiye', icon: 'wallet', tone: 'success', title: 'Bakiye', body: 'Yükleme onayı ve düşük bakiye uyarısı' },
  { key: 'menu', icon: 'restaurant', tone: 'info', title: 'Menü', body: 'Haftalık menü yayınlandığında' },
  { key: 'bilet', icon: 'ticket', tone: 'accent', title: 'Bilet ve ödüller', body: 'Yeni bilet, süresi dolacak bilet ve kazanılan ücretsiz yemek hakkı' },
];

const THRESHOLDS = [60, 120, 180, 300];

export default function NotificationSettingsScreen() {
  const { data, updatePrefs } = useUserData();
  const [error, setError] = useState<string | null>(null);

  async function save(prefs: NotificationPrefs) {
    setError(null);
    try {
      await updatePrefs(prefs);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <Screen>
      {Platform.OS === 'web' && (
        <Banner tone="info" text="Web önizlemesinde bildirimler yalnızca uygulama içinde görünür; telefonda anlık bildirim olarak da gelir." />
      )}
      {error && <Banner tone="danger" text={error} />}

      <Card style={{ paddingVertical: 4, gap: 0 }}>
        {ROWS.map((row, i) => (
          <View key={row.key}>
            {i > 0 && <View style={styles.divider} />}
            <View style={[styles.row, { paddingVertical: 14 }]}>
              <IconCircle name={row.icon} tone={row.tone} size={36} />
              <View style={{ flex: 1 }}>
                <Text style={[text.body, { fontWeight: '600' }]}>{row.title}</Text>
                <Text style={text.muted}>{row.body}</Text>
              </View>
              <Switch
                value={data.prefs[row.key]}
                onValueChange={(v) => save({ ...data.prefs, [row.key]: v })}
                trackColor={{ true: colors.primary }}
                accessibilityLabel={`${row.title} bildirimleri`}
              />
            </View>
          </View>
        ))}
      </Card>

      <SectionTitle>Düşük bakiye uyarı eşiği</SectionTitle>
      <Text style={text.muted}>Bakiyeniz bu tutarın altına düştüğünde uyarılırsınız.</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {THRESHOLDS.map((t) => (
          <Chip
            key={t}
            label={tl(t)}
            selected={data.prefs.lowBalanceThreshold === t}
            onPress={() => save({ ...data.prefs, lowBalanceThreshold: t })}
          />
        ))}
      </View>
    </Screen>
  );
}
