import { useState } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';
import { useUserData } from '@/store/AppContext';
import { Badge, Banner, Button, Card, Chip, Field, Screen, SectionTitle, Segmented, Tone, errorMessage, styles, text } from '@/components/ui';
import { FEEDBACK_CATEGORIES } from '@/config';
import { Feedback, FeedbackKind } from '@/types';
import { dateTime } from '@/utils/format';
import { colors } from '@/theme';

const STATUS: Record<Feedback['status'], { label: string; tone: Tone }> = {
  alindi: { label: 'Alındı', tone: 'info' },
  inceleniyor: { label: 'İnceleniyor', tone: 'warning' },
  yanitlandi: { label: 'Yanıtlandı', tone: 'success' },
};

export default function FeedbackScreen() {
  const { data, submitFeedback } = useUserData();
  const [kind, setKind] = useState<FeedbackKind>('sikayet');
  const [category, setCategory] = useState(FEEDBACK_CATEGORIES[0]);
  const [message, setMessage] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);

  const length = message.trim().length;

  async function submit() {
    setResult(null);
    setLoading(true);
    try {
      await submitFeedback({ kind, category, message, anonymous });
      setMessage('');
      setResult({ tone: 'success', text: 'Geri bildiriminiz alındı. Teşekkür ederiz!' });
    } catch (e) {
      setResult({ tone: 'danger', text: errorMessage(e) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <Card>
        <Segmented
          options={[
            { key: 'sikayet', label: 'Şikâyet' },
            { key: 'oneri', label: 'Öneri' },
          ]}
          value={kind}
          onChange={setKind}
        />
        <Text style={styles.label}>Kategori</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {FEEDBACK_CATEGORIES.map((c) => (
            <Chip key={c} label={c} selected={c === category} onPress={() => setCategory(c)} />
          ))}
        </View>
        <Field
          label={kind === 'sikayet' ? 'Şikâyetiniz' : 'Öneriniz'}
          placeholder={kind === 'sikayet' ? 'Yaşadığınız sorunu tarih ve saat belirterek anlatın…' : 'Önerinizi kısaca anlatın…'}
          value={message}
          onChangeText={setMessage}
          multiline
          maxLength={1000}
        />
        <Text style={[text.muted, { textAlign: 'right', marginTop: -6, color: length > 0 && length < 20 ? colors.danger : colors.muted }]}>
          {length}/1000 · en az 20 karakter
        </Text>
        <Pressable onPress={() => setAnonymous((v) => !v)} style={[styles.row, { justifyContent: 'space-between' }]}>
          <View style={{ flex: 1 }}>
            <Text style={text.body}>Anonim gönder</Text>
            <Text style={text.muted}>Adınız ve öğrenci numaranız yetkililerle paylaşılmaz.</Text>
          </View>
          <Switch value={anonymous} onValueChange={setAnonymous} trackColor={{ true: colors.primary }} />
        </Pressable>
        {result && <Banner tone={result.tone} text={result.text} />}
        <Button title="Gönder" icon="send" loading={loading} disabled={length < 20} onPress={submit} />
      </Card>

      {data.feedback.length > 0 && (
        <>
          <SectionTitle>Gönderdiklerim</SectionTitle>
          {data.feedback.map((f) => (
            <Card key={f.id}>
              <View style={[styles.row, { justifyContent: 'space-between' }]}>
                <View style={[styles.row, { gap: 6 }]}>
                  <Badge label={f.kind === 'sikayet' ? 'Şikâyet' : 'Öneri'} tone={f.kind === 'sikayet' ? 'danger' : 'primary'} />
                  <Badge label={f.category} />
                </View>
                <Badge label={STATUS[f.status].label} tone={STATUS[f.status].tone} />
              </View>
              <Text style={text.body}>{f.message}</Text>
              <Text style={text.muted}>
                {dateTime(f.createdAt)}
                {f.anonymous ? ' · Anonim' : ''}
              </Text>
              {f.reply && (
                <View style={{ backgroundColor: colors.successSoft, borderRadius: 10, padding: 12, gap: 4 }}>
                  <Text style={[text.muted, { color: colors.success, fontWeight: '700' }]}>Yemekhane yönetimi yanıtı</Text>
                  <Text style={text.body}>{f.reply}</Text>
                </View>
              )}
            </Card>
          ))}
        </>
      )}
    </Screen>
  );
}
