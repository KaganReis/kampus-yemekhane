import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useApp } from '@/store/AppContext';
import { Banner, Button, Field, errorMessage, text } from '@/components/ui';
import { UNIVERSITY_EMAIL } from '@/config';
import { DEMO_ACCOUNTS } from '@/data/seed';
import { colors, radius, space } from '@/theme';

export default function LoginScreen() {
  const { login } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailError =
    touched && email && !UNIVERSITY_EMAIL.test(email.trim()) ? 'Üniversite e-posta adresi …edu.tr ile bitmelidir.' : undefined;

  async function submit() {
    setTouched(true);
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
    } catch (e) {
      setError(errorMessage(e));
      setPassword('');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.primary }} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View style={s.hero}>
            <View style={s.logo}>
              <Ionicons name="restaurant" size={34} color={colors.primary} />
            </View>
            <Text style={s.title}>Kampüs Yemekhane</Text>
            <Text style={s.subtitle}>Menü, randevu ve bakiye işlemleriniz tek yerde</Text>
          </View>

          <View style={s.sheet}>
            <Text style={text.h2}>Oturum aç</Text>
            <Text style={text.muted}>Üniversite e-posta adresiniz ve şifrenizle giriş yapın.</Text>

            {error && <Banner tone="danger" text={error} />}

            <Field
              label="Üniversite e-postası"
              placeholder="ad.soyad@ogr.universite.edu.tr"
              value={email}
              onChangeText={setEmail}
              onBlur={() => setTouched(true)}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              autoComplete="email"
              textContentType="username"
              error={emailError}
            />

            <View>
              <Field
                label="Şifre"
                placeholder="Şifreniz"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoComplete="current-password"
                textContentType="password"
                onSubmitEditing={submit}
                returnKeyType="go"
              />
              <Pressable
                onPress={() => setShowPassword((v) => !v)}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                style={s.eye}
                hitSlop={8}
              >
                <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color={colors.muted} />
              </Pressable>
            </View>

            <Button title="Giriş yap" onPress={submit} loading={loading} disabled={!email || !password} />

            <View style={s.demo}>
              <Text style={[text.h3, { fontSize: 14 }]}>Demo sürüm</Text>
              <Text style={text.muted}>
                Bu sürüm gerçek bir sunucuya bağlı değildir; veriler yalnızca bu cihazda tutulur. Denemek için demo hesabı
                kullanın: {DEMO_ACCOUNTS[0].user.email}
              </Text>
              <Button
                title="Demo hesabıyla doldur"
                variant="secondary"
                compact
                icon="flash"
                onPress={() => {
                  setEmail(DEMO_ACCOUNTS[0].user.email);
                  setPassword(DEMO_ACCOUNTS[0].password);
                  setError(null);
                }}
              />
            </View>

            <View style={s.secure}>
              <Ionicons name="lock-closed" size={14} color={colors.muted} />
              <Text style={[text.muted, { flex: 1 }]}>
                Oturum anahtarınız cihazın güvenli deposunda saklanır ve 12 saat sonra sona erer. 5 hatalı denemede
                giriş 5 dakika kilitlenir.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  hero: { alignItems: 'center', paddingTop: space.xl * 2, paddingBottom: space.xl, paddingHorizontal: space.lg, gap: space.sm },
  logo: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginBottom: space.sm },
  title: { fontSize: 28, fontWeight: '800', color: '#fff' },
  subtitle: { fontSize: 15, color: '#CCFBF1', textAlign: 'center' },
  sheet: {
    flexGrow: 1,
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.lg * 1.5,
    borderTopRightRadius: radius.lg * 1.5,
    padding: space.xl,
    gap: space.lg,
  },
  eye: { position: 'absolute', right: 12, top: 38 },
  secure: { flexDirection: 'row', gap: 6, alignItems: 'flex-start' },
  demo: {
    gap: space.sm,
    padding: space.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
});
