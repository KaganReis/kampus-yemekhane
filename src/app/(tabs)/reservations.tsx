import { useState } from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useUserData } from '@/store/AppContext';
import {
  Badge,
  Banner,
  Button,
  Card,
  EmptyState,
  Screen,
  SectionTitle,
  Segmented,
  confirm,
  errorMessage,
  showMessage,
  styles,
  text,
} from '@/components/ui';
import { ReservationCard } from '@/components/ReservationCard';
import { slotLabel, trayLabel } from '@/config';
import { menuFor, trayNames } from '@/data/menu';
import { TransferListing } from '@/types';
import { dateTime, longDate, relativeDay, tl } from '@/utils/format';
import { colors } from '@/theme';

type Tab = 'randevularim' | 'devir';

export default function ReservationsScreen() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const fromParam = (p?: string): Tab | undefined => (p === 'devir' || p === 'randevularim' ? p : undefined);
  const [state, setState] = useState({ param: params.tab, tab: fromParam(params.tab) ?? 'randevularim' });
  // A link that names a tab (e.g. "Devir ilanları" on the home screen) switches to it.
  if (state.param !== params.tab) setState({ param: params.tab, tab: fromParam(params.tab) ?? state.tab });
  const tab = state.tab;
  const setTab = (t: Tab) => setState((s) => ({ ...s, tab: t }));

  return (
    <Screen>
      <Segmented
        options={[
          { key: 'randevularim', label: 'Randevularım' },
          { key: 'devir', label: 'Devir İlanları' },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'randevularim' ? <MyReservations /> : <TransferMarket />}
    </Screen>
  );
}

function MyReservations() {
  const router = useRouter();
  const { data, cancelReservation, listForTransfer, withdrawListing } = useUserData();
  const [busy, setBusy] = useState<string | null>(null);
  const [showPast, setShowPast] = useState(false);

  const upcoming = data.reservations
    .filter((r) => r.status === 'aktif' || r.status === 'devirde')
    .sort((a, b) => a.date.localeCompare(b.date));
  const past = data.reservations.filter((r) => r.status !== 'aktif' && r.status !== 'devirde');

  async function run(id: string, action: () => Promise<void>, success: string) {
    setBusy(id);
    try {
      await action();
      showMessage(success);
    } catch (e) {
      showMessage('İşlem yapılamadı', errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <Button title="Yeni randevu oluştur" icon="add-circle" onPress={() => router.push('/reservation-new')} />

      {upcoming.length === 0 ? (
        <EmptyState icon="calendar-outline" title="Yaklaşan randevunuz yok" body="Menüden bir gün seçerek randevu oluşturabilirsiniz." />
      ) : (
        upcoming.map((r) => (
          <ReservationCard key={r.id} r={r}>
            {r.status === 'aktif' ? (
              <View style={[styles.row, { gap: 8 }]}>
                <Button
                  title="Devret"
                  icon="swap-horizontal"
                  variant="secondary"
                  compact
                  style={{ flex: 1 }}
                  loading={busy === r.id + 'devir'}
                  onPress={async () => {
                    const ok = await confirm(
                      'Devir ilanı aç',
                      `${longDate(r.date)} ${slotLabel(r.slotIndex)} randevunuz devir ilanlarında listelenecek. Başka bir öğrenci devraldığında ücret bakiyenize iade edilir.`,
                      'İlan aç',
                    );
                    if (ok) run(r.id + 'devir', () => listForTransfer(r.id), 'Devir ilanınız yayınlandı.');
                  }}
                />
                <Button
                  title="İptal et"
                  icon="close-circle"
                  variant="danger"
                  compact
                  style={{ flex: 1 }}
                  loading={busy === r.id + 'iptal'}
                  onPress={async () => {
                    const ok = await confirm('Randevuyu iptal et', 'Randevunuz iptal edilecek ve ücret iade edilecek.', 'İptal et');
                    if (ok) run(r.id + 'iptal', () => cancelReservation(r.id), 'Randevunuz iptal edildi.');
                  }}
                />
              </View>
            ) : (
              <>
                <Banner tone="warning" text="Devir ilanınız yayında. Bir öğrenci devraldığında bildirim alacaksınız." />
                <Button
                  title="İlanı geri çek"
                  variant="secondary"
                  compact
                  loading={busy === r.id}
                  onPress={() => run(r.id, () => withdrawListing(r.id), 'İlan geri çekildi, randevunuz yeniden aktif.')}
                />
              </>
            )}
          </ReservationCard>
        ))
      )}

      {past.length > 0 && (
        <>
          <SectionTitle
            action={
              <Button title={showPast ? 'Gizle' : `Göster (${past.length})`} variant="ghost" compact onPress={() => setShowPast((v) => !v)} />
            }
          >
            Geçmiş randevular
          </SectionTitle>
          {showPast && past.map((r) => <ReservationCard key={r.id} r={r} />)}
        </>
      )}
    </>
  );
}

function TransferMarket() {
  const { user, data, market, takeTransfer } = useUserData();
  const [busy, setBusy] = useState<string | null>(null);

  const mine = market.filter((l) => l.ownerId === user.id);
  const others = market
    .filter((l) => l.ownerId !== user.id)
    .sort((a, b) => a.date.localeCompare(b.date) || a.slotIndex - b.slotIndex);

  const blockedReason = (l: TransferListing) => {
    if (data.reservations.some((r) => r.date === l.date && (r.status === 'aktif' || r.status === 'devirde')))
      return 'Bu gün için randevunuz var';
    if (data.balance < l.price) return 'Yetersiz bakiye';
    return null;
  };

  async function take(l: TransferListing) {
    const ok = await confirm(
      'Randevuyu devral',
      `${longDate(l.date)} ${slotLabel(l.slotIndex)} randevusu (${trayLabel(l.tray)}) için bakiyenizden ${tl(l.price)} düşülecek.`,
      'Devral',
    );
    if (!ok) return;
    setBusy(l.id);
    try {
      await takeTransfer(l.id);
      showMessage('Randevu devralındı', 'Randevu "Randevularım" listenize eklendi.');
    } catch (e) {
      showMessage('Devralınamadı', errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <Banner
        tone="info"
        text="Gelemeyeceğiniz randevuyu devrederek ücretinizi geri alabilir, dolu günlerde başkasının devrettiği randevuyu devralabilirsiniz."
      />

      {mine.length > 0 && (
        <>
          <SectionTitle>İlanlarım</SectionTitle>
          {mine.map((l) => (
            <Card key={l.id} style={{ borderColor: colors.warning }}>
              <View style={[styles.row, { justifyContent: 'space-between' }]}>
                <Text style={text.h3}>{relativeDay(l.date)}</Text>
                <Badge label="Devralınmayı bekliyor" tone="warning" />
              </View>
              <Text style={text.body}>
                {slotLabel(l.slotIndex)} · {trayLabel(l.tray)}
              </Text>
              <Text style={text.muted}>Geri çekmek için Randevularım sekmesini kullanın.</Text>
            </Card>
          ))}
        </>
      )}

      <SectionTitle>Açık ilanlar</SectionTitle>
      {others.length === 0 ? (
        <EmptyState icon="swap-horizontal" title="Şu an açık devir ilanı yok" body="Yeni ilanlar açıldığında burada listelenir." />
      ) : (
        others.map((l) => {
          const reason = blockedReason(l);
          const menu = menuFor(l.date);
          return (
            <Card key={l.id}>
              <View style={[styles.row, { justifyContent: 'space-between' }]}>
                <Text style={text.h3}>{relativeDay(l.date)}</Text>
                <Text style={[text.h3, { color: colors.primary }]}>{tl(l.price)}</Text>
              </View>
              <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>{slotLabel(l.slotIndex)}</Text>
              <Text style={text.muted}>
                {trayNames(menu, l.tray)}
              </Text>
              <View style={[styles.row, { flexWrap: 'wrap', gap: 6 }]}>
                <Badge label={trayLabel(l.tray)} tone="primary" />
                <Badge label={`${l.ownerName} · ${dateTime(l.createdAt)}`} />
              </View>
              <Button
                title={reason ?? 'Devral'}
                icon={reason ? undefined : 'checkmark-circle'}
                disabled={!!reason}
                loading={busy === l.id}
                onPress={() => take(l)}
              />
            </Card>
          );
        })
      )}
    </>
  );
}
