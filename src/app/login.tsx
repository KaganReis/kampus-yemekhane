import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useApp } from '@/store/AppContext';
import { Banner, Button, Field, Segmented, errorMessage, text } from '@/components/ui';
import { UNIVERSITY_EMAIL } from '@/config';
import { colors, radius, space } from '@/theme';

type Mode = 'giris' | 'kayit';

export default function LoginScreen() {
  const { login, register } = useApp();
  const [mode, setMode] = useState<Mode>('giris');
  const [name, setName] = useState('');
  const [studentNo, setStudentNo] = useState('');
  const [faculty, setFaculty] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isRegister = mode === 'kayit';
  const emailError =
    touched && email && !UNIVERSITY_EMAIL.test(email.trim()) ? 'Üniversite e-posta adresi …edu.tr ile bitmelidir.' : undefined;
  const passwordError = isRegister && password && password.length < 8 ? 'Şifre en az 8 karakter olmalı.' : undefined;
  const password2Error = isRegister && password2 && password2 !== password ? 'Şifreler eşleşmiyor.' : undefined;
  const canSubmit = isRegister
    ? !!(name.trim() && studentNo.trim() && email && password.length >= 8 && password === password2)
    : !!(email && password);

  async function submit() {
    if (!canSubmit) return;
    setTouched(true);
    setError(null);
    setLoading(true);
    try {
      if (isRegister) await register({ name, studentNo, faculty, email, password });
      else await login(email, password);
    } catch (e) {
      setError(errorMessage(e));
      if (!isRegister) setPassword('');
    } finally {
      setLoading(false);
    }
  }

  function switchMode(m: Mode) {
    setMode(m);
    setError(null);
    setPassword('');
    setPassword2('');
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
            <Segmented
              options={[
                { key: 'giris', label: 'Giriş yap' },
                { key: 'kayit', label: 'Kayıt ol' },
              ]}
              value={mode}
              onChange={switchMode}
            />
            <Text style={text.muted}>
              {isRegister
                ? 'Üniversite e-posta adresinizle bir hesap oluşturun. Bakiyeniz ve randevularınız hesabınıza kaydedilir; hangi cihazdan girerseniz girin aynı görünür.'
                : 'Üniversite e-posta adresiniz ve şifrenizle giriş yapın.'}
            </Text>

            {error && <Banner tone="danger" text={error} />}

            {isRegister && (
              <>
                <Field label="Ad soyad" placeholder="Elif Yılmaz" value={name} onChangeText={setName} autoComplete="name" textContentType="name" />
                <Field
                  label="Öğrenci numarası"
                  placeholder="2023104512"
                  value={studentNo}
                  onChangeText={(t) => setStudentNo(t.replace(/\D/g, ''))}
                  keyboardType="number-pad"
                  maxLength={12}
                />
                <Field label="Fakülte (isteğe bağlı)" placeholder="Mühendislik Fakültesi" value={faculty} onChangeText={setFaculty} />
              </>
            )}

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
                placeholder={isRegister ? 'En az 8 karakter' : 'Şifreniz'}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                textContentType={isRegister ? 'newPassword' : 'password'}
                onSubmitEditing={isRegister ? undefined : submit}
                returnKeyType={isRegister ? 'next' : 'go'}
                error={passwordError}
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

            {isRegister && (
              <Field
                label="Şifre (tekrar)"
                placeholder="Şifrenizi tekrar girin"
                value={password2}
                onChangeText={setPassword2}
                secureTextEntry={!showPassword}
                autoComplete="new-password"
                textContentType="newPassword"
                onSubmitEditing={submit}
                returnKeyType="go"
                error={password2Error}
              />
            )}

            <Button title={isRegister ? 'Hesap oluştur' : 'Giriş yap'} onPress={submit} loading={loading} disabled={!canSubmit} />

            <View style={s.secure}>
              <Ionicons name="lock-closed" size={14} color={colors.muted} />
              <Text style={[text.muted, { flex: 1 }]}>
                Hesabınız Firebase Authentication ile korunur; şifreniz uygulamada saklanmaz. Art arda hatalı denemelerde giriş
                geçici olarak engellenir.
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
});
