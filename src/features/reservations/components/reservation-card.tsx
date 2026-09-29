import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Reservation } from '@/domain/models';
import { RESERVATION_STATUS_META } from '@/domain/rules/reservations';
import { colors, radius, spacing, typography } from '@/shared/theme';
import { formatCurrency, formatShortDate } from '@/shared/utils/format';

const toneStyles = {
  warning: { backgroundColor: colors.warningSoft, color: colors.warning },
  info: { backgroundColor: colors.infoSoft, color: colors.info },
  danger: { backgroundColor: colors.dangerSoft, color: colors.danger },
  success: { backgroundColor: colors.successSoft, color: colors.success },
  neutral: { backgroundColor: colors.surfaceMuted, color: colors.textMuted },
};

export function StatusBadge({ status }: { status: Reservation['status'] }) {
  const meta = RESERVATION_STATUS_META[status];
  const tone = toneStyles[meta.tone];
  return (
    <Text style={[styles.badge, { backgroundColor: tone.backgroundColor, color: tone.color }]}>
      {meta.label}
    </Text>
  );
}

export function ReservationCard({
  reservation,
  onPress,
}: {
  reservation: Reservation;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.topRow}>
        <View style={styles.identity}>
          <Text style={styles.name}>{reservation.snapshot.customerName}</Text>
          <Text style={styles.vehicle}>
            {reservation.snapshot.vehicleDescription} · {reservation.snapshot.vehiclePlate}
          </Text>
        </View>
        <StatusBadge status={reservation.status} />
      </View>
      <View style={styles.divider} />
      <View style={styles.bottomRow}>
        <View style={styles.meta}>
          <Ionicons name="calendar-outline" size={15} color={colors.textMuted} />
          <Text style={styles.metaText}>{formatShortDate(reservation.serviceDate)}</Text>
        </View>
        <Text style={styles.service}>{reservation.snapshot.serviceName}</Text>
        <Text style={styles.price}>{formatCurrency(reservation.snapshot.priceInCents)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  pressed: { opacity: 0.75 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  identity: { flex: 1, gap: 2 },
  name: { ...typography.heading, color: colors.text },
  vehicle: { ...typography.caption, color: colors.textMuted },
  badge: {
    ...typography.caption,
    fontWeight: '700',
    borderRadius: radius.pill,
    overflow: 'hidden',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  divider: { height: 1, backgroundColor: colors.border },
  bottomRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  metaText: { ...typography.caption, color: colors.textMuted },
  service: { ...typography.caption, color: colors.textMuted, flex: 1 },
  price: { ...typography.label, color: colors.text },
});
