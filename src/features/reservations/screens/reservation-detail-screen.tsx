import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { useEstablishment, useReservation, useReservationAction } from '@/data/query/hooks';
import { getErrorMessage } from '@/domain/errors';
import type { ReservationAction } from '@/domain/models';
import {
  getAllowedReservationActions,
  getTodayInTimeZone,
  RESERVATION_ACTION_LABELS,
} from '@/domain/rules/reservations';
import { StatusBadge } from '@/features/reservations/components/reservation-card';
import { colors, spacing, typography } from '@/shared/theme';
import { Button, Card, ErrorState, LoadingState, ScreenContainer, uiStyles } from '@/shared/ui';
import { categoryLabel, formatCalendarDate, formatCurrency } from '@/shared/utils/format';

export default function ReservationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useReservation(id);
  const establishment = useEstablishment();
  const mutation = useReservationAction(id ?? '');
  if (query.isLoading || establishment.isLoading) return <LoadingState />;
  if (query.error || !query.data)
    return (
      <ErrorState message={getErrorMessage(query.error)} onRetry={() => void query.refetch()} />
    );
  const reservation = query.data;
  const actions = getAllowedReservationActions(
    reservation,
    getTodayInTimeZone(establishment.data?.timeZone ?? 'America/Sao_Paulo'),
  );
  const execute = (action: ReservationAction) => {
    const run = () =>
      mutation.mutate(action, {
        onError: (error) => Alert.alert('Não foi possível atualizar', getErrorMessage(error)),
        onSuccess: () => Alert.alert('Reserva atualizada', 'O novo status já aparece na agenda.'),
      });
    if (action === 'ACCEPT' || action === 'COMPLETE') return run();
    Alert.alert(RESERVATION_ACTION_LABELS[action], 'Confirma esta ação?', [
      { text: 'Voltar', style: 'cancel' },
      {
        text: 'Confirmar',
        style: action === 'CANCEL' || action === 'REJECT' ? 'destructive' : 'default',
        onPress: run,
      },
    ]);
  };
  return (
    <ScreenContainer>
      <View style={styles.heading}>
        <StatusBadge status={reservation.status} />
        <Text style={uiStyles.title}>{reservation.snapshot.customerName}</Text>
        <Text style={styles.date}>{formatCalendarDate(reservation.serviceDate)}</Text>
      </View>
      <Card>
        <Detail icon="call-outline" label="Telefone" value={reservation.snapshot.customerPhone} />
        <Detail
          icon="car-outline"
          label="Veículo"
          value={`${reservation.snapshot.vehicleDescription} · ${reservation.snapshot.vehiclePlate}`}
        />
        <Detail
          icon="resize-outline"
          label="Categoria"
          value={categoryLabel(reservation.snapshot.vehicleCategory)}
        />
      </Card>
      <Card>
        <Detail icon="water-outline" label="Serviço" value={reservation.snapshot.serviceName} />
        <Detail
          icon="cash-outline"
          label="Valor"
          value={formatCurrency(reservation.snapshot.priceInCents)}
        />
      </Card>
      {actions.length ? (
        <View style={styles.actions}>
          {actions.map((action) => (
            <Button
              key={action}
              title={RESERVATION_ACTION_LABELS[action]}
              variant={
                action === 'REJECT' || action === 'CANCEL'
                  ? 'danger'
                  : action === 'MARK_NO_SHOW'
                    ? 'secondary'
                    : 'primary'
              }
              onPress={() => execute(action)}
              disabled={mutation.isPending}
              loading={mutation.isPending && mutation.variables === action}
            />
          ))}
        </View>
      ) : (
        <Text style={styles.final}>
          Esta reserva está em um estado final e permanece disponível somente para consulta.
        </Text>
      )}
    </ScreenContainer>
  );
}

function Detail({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detail}>
      <Ionicons name={icon} size={20} color={colors.primary} />
      <View style={styles.detailText}>
        <Text style={styles.label}>{label}</Text>
        <Text style={uiStyles.body}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { alignItems: 'flex-start', gap: spacing.sm, marginTop: spacing.sm },
  date: { ...typography.body, color: colors.textMuted, textTransform: 'capitalize' },
  detail: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  detailText: { flex: 1 },
  label: { ...typography.caption, color: colors.textMuted },
  actions: { gap: spacing.sm },
  final: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
});
