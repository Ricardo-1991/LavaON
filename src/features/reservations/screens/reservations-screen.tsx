import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useReservations } from '@/data/query/hooks';
import { getErrorMessage } from '@/domain/errors';
import type { ReservationPeriod, ReservationStatusFilter } from '@/domain/models';
import { getTodayInTimeZone } from '@/domain/rules/reservations';
import { ReservationCard } from '@/features/reservations/components/reservation-card';
import { colors, spacing, typography } from '@/shared/theme';
import {
  EmptyState,
  ErrorState,
  FilterChip,
  Input,
  LoadingState,
  ScreenContainer,
  uiStyles,
} from '@/shared/ui';

const periods: { value: ReservationPeriod; label: string }[] = [
  { value: 'ALL', label: 'Todas' },
  { value: 'TODAY', label: 'Hoje' },
  { value: 'UPCOMING', label: 'Próximas' },
  { value: 'HISTORY', label: 'Histórico' },
  { value: 'DATE', label: 'Data' },
];
const statuses: { value: ReservationStatusFilter; label: string }[] = [
  { value: 'ALL', label: 'Todos os status' },
  { value: 'PENDING', label: 'Pendentes' },
  { value: 'CONFIRMED', label: 'Confirmadas' },
  { value: 'FINISHED', label: 'Finalizadas' },
  { value: 'CANCELLED', label: 'Canceladas' },
  { value: 'REJECTED', label: 'Recusadas' },
];

export default function ReservationsScreen() {
  const params = useLocalSearchParams<{ status?: string }>();
  const [period, setPeriod] = useState<ReservationPeriod>('ALL');
  const [status, setStatus] = useState<ReservationStatusFilter>(
    (statuses.some((item) => item.value === params.status)
      ? params.status
      : 'ALL') as ReservationStatusFilter,
  );
  const [date, setDate] = useState(getTodayInTimeZone('America/Sao_Paulo'));
  const router = useRouter();
  const query = useReservations({ period, status, date: period === 'DATE' ? date : undefined });
  return (
    <ScreenContainer>
      <View>
        <Text style={uiStyles.title}>Reservas</Text>
        <Text style={uiStyles.muted}>Acompanhe solicitações, atendimentos e histórico.</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
      >
        {periods.map((item) => (
          <FilterChip
            key={item.value}
            label={item.label}
            selected={period === item.value}
            onPress={() => setPeriod(item.value)}
          />
        ))}
      </ScrollView>
      {period === 'DATE' ? (
        <Input
          label="Data da reserva (AAAA-MM-DD)"
          value={date}
          onChangeText={setDate}
          autoCapitalize="none"
        />
      ) : null}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
      >
        {statuses.map((item) => (
          <FilterChip
            key={item.value}
            label={item.label}
            selected={status === item.value}
            onPress={() => setStatus(item.value)}
          />
        ))}
      </ScrollView>
      {query.isLoading ? (
        <LoadingState />
      ) : query.error ? (
        <ErrorState message={getErrorMessage(query.error)} onRetry={() => void query.refetch()} />
      ) : query.data?.items.length ? (
        <>
          {query.data.items.map((reservation) => (
            <ReservationCard
              key={reservation.id}
              reservation={reservation}
              onPress={() => router.push(`/reservations/${reservation.id}`)}
            />
          ))}
          <Text style={styles.total}>{query.data.total} reserva(s)</Text>
        </>
      ) : (
        <EmptyState
          title="Nenhuma reserva encontrada"
          description="Ajuste os filtros para consultar outro período."
          icon="search-outline"
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  chips: { gap: spacing.sm },
  total: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
});
