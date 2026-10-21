import { useState } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useUserData } from '@/store/AppContext';
import { Banner, Button, Card, Chip, Field, Screen, errorMessage, text } from '@/components/ui';
import { MEAL_PRICE, TOP_UP_MAX, TOP_UP_MIN } from '@/config';
import { tl } from '@/utils/format';
import { colors } from '@/theme';

const PRESETS = [60, 120, 300, 600];

export default function TopUpScreen() {
  const router = useRouter();
  const { data, topUp } = useUserData();
  const [amount, setAmount] = useState('120');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<number | null>(null);

  const value = Number(amount.replace(',', '.'));
  const valid = Number.isFinite(value) && value >= TOP_UP_MIN && value <= TOP_UP_MAX;

  async function submit() {
    setError(null);
    setLoading(true);
    try {
      await topUp(value);
      setDone(value);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  if (done !== null) {
    return (
      <Screen contentStyle={{ paddingTop: 40 }}>
        <View style={{ alignItems: 'center', gap: 8 }}>
          <Ionicons name="checkmark-circle" size={72} color={colors.success} />
          <Text style={text.h1}>{tl(done)} yüklendi</Text>
          <Text style={text.muted}>Güncel bakiyeniz {tl(data.balance)}</Text>
        </View>
        <Button title="Tamam" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Card style={{ gap: 4 }}>
        <Text style={text.muted}>Mevcut bakiye</Text>
        <Text style={text.h1}>{tl(data.balance)}</Text>
      </Card>

      <Text style={text.h3}>Yüklenecek tutar</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {PRESETS.map((p) => (
          <Chip key={p} label={`${tl(p)} · ${p / MEAL_PRICE} öğün`} selected={value === p} onPress={() => setAmount(String(p))} />
        ))}
      </View>
      <Field
        label="Farklı tutar (₺)"
        value={amount}
        onChangeText={(t) => setAmount(t.replace(/[^0-9,.]/g, ''))}
        keyboardType="decimal-pad"
        error={amount && !valid ? `${tl(TOP_UP_MIN)} – ${tl(TOP_UP_MAX)} arasında bir tutar girin.` : undefined}
      />

      <Banner
        tone="info"
        text="Ödeme, bankanızın 3D Secure sayfasında tamamlanır; kart bilgileriniz uygulamada saklanmaz. (Demo sürümde ödeme adımı simüle edilir.)"
      />
      {error && <Banner tone="danger" text={error} />}

      <Button
        title={valid ? `${tl(value)} yükle` : 'Tutar girin'}
        icon="card"
        disabled={!valid}
        loading={loading}
        onPress={submit}
      />
    </Screen>
  );
}
