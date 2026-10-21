import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ReactNode } from 'react';
import { Reservation, ReservationStatus } from '../types';
import { CHOICE_LABEL, PAYMENT_LABEL, slotLabel } from '../config';
import { menuFor } from '../data/menu';
import { relativeDay } from '../utils/format';
import { colors } from '../theme';
import { Badge, Card, styles, text, Tone } from './ui';

export const STATUS: Record<ReservationStatus, { label: string; tone: Tone }> = {
  aktif: { label: 'Aktif', tone: 'success' },
  devirde: { label: 'Devir ilanında', tone: 'warning' },
  devredildi: { label: 'Devredildi', tone: 'info' },
  iptal: { label: 'İptal edildi', tone: 'danger' },
  tamamlandi: { label: 'Tamamlandı', tone: 'neutral' },
  kullanilmadi: { label: 'Kullanılmadı', tone: 'neutral' },
};

export function ReservationCard({ r, children }: { r: Reservation; children?: ReactNode }) {
  const menu = menuFor(r.date);
  const status = STATUS[r.status];
  return (
    <Card>
      <View style={[styles.row, { justifyContent: 'space-between' }]}>
        <Text style={text.h3}>{relativeDay(r.date)}</Text>
        <Badge label={status.label} tone={status.tone} />
      </View>
      <View style={[styles.row, { gap: 10 }]}>
        <Ionicons name="time" size={22} color={colors.primary} />
        <Text style={{ fontSize: 24, fontWeight: '700', color: colors.text }}>{slotLabel(r.slotIndex)}</Text>
      </View>
      <Text style={text.muted}>
        {menu.main.name} · {menu.side.name} · {menu.dessert.name} ·{' '}
        <Text style={{ fontWeight: '700', color: colors.text }}>
          {r.choice === 'corba' ? menu.soup.name : menu.salad.name}
        </Text>
      </Text>
      <View style={[styles.row, { flexWrap: 'wrap', gap: 6 }]}>
        <Badge label={CHOICE_LABEL[r.choice]} tone="primary" />
        <Badge label={PAYMENT_LABEL[r.paidWith]} />
        {r.source === 'devir' && <Badge label="Devralındı" tone="info" />}
      </View>
      {children}
    </Card>
  );
}
