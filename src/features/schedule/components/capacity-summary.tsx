import { StyleSheet, Text, View } from 'react-native';

import type { DailyCapacity } from '@/domain/models';
import { colors, radius, spacing, typography } from '@/shared/theme';

export function CapacitySummary({ capacity }: { capacity: DailyCapacity }) {
  const metrics = [
    { label: 'Capacidade', value: capacity.capacity, color: colors.text },
    { label: 'Confirmadas', value: capacity.confirmed, color: colors.info },
    { label: 'Pendentes', value: capacity.pending, color: colors.warning },
    { label: 'Disponíveis', value: capacity.available, color: colors.success },
    { label: 'Atendidos', value: capacity.completed, color: colors.primary },
  ];
  return (
    <View style={styles.grid}>
      {metrics.map((metric) => (
        <View key={metric.label} style={styles.metric}>
          <Text style={[styles.value, { color: metric.color }]}>{metric.value}</Text>
          <Text style={styles.label}>{metric.label}</Text>
        </View>
      ))}
      {capacity.inconsistent ? (
        <Text style={styles.warning}>A capacidade está abaixo das reservas existentes.</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  metric: {
    width: '31%',
    minWidth: 96,
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  value: { fontSize: 24, lineHeight: 29, fontWeight: '700' },
  label: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  warning: { ...typography.caption, color: colors.danger, width: '100%' },
});
