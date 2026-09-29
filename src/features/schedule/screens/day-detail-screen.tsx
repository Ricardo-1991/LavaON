import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { useDaySchedule } from '@/data/query/hooks';
import { getErrorMessage } from '@/domain/errors';
import { ReservationCard } from '@/features/reservations/components/reservation-card';
import { CapacitySummary } from '@/features/schedule/components/capacity-summary';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  ScreenContainer,
  SectionHeader,
  uiStyles,
} from '@/shared/ui';
import { formatCalendarDate } from '@/shared/utils/format';

export default function DayDetailScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const router = useRouter();
  const query = useDaySchedule(date);
  if (query.isLoading) return <LoadingState />;
  if (query.error || !query.data)
    return (
      <ErrorState message={getErrorMessage(query.error)} onRetry={() => void query.refetch()} />
    );
  return (
    <ScreenContainer>
      <View>
        <Text style={uiStyles.title}>{formatCalendarDate(date)}</Text>
        <Text style={uiStyles.muted}>
          {query.data.capacity.open ? 'Dia aberto para atendimento' : 'Estabelecimento fechado'}
        </Text>
      </View>
      <CapacitySummary capacity={query.data.capacity} />
      <SectionHeader title={`Reservas (${query.data.reservations.length})`} />
      {query.data.reservations.length ? (
        query.data.reservations.map((reservation) => (
          <ReservationCard
            key={reservation.id}
            reservation={reservation}
            onPress={() => router.push(`/reservations/${reservation.id}`)}
          />
        ))
      ) : (
        <EmptyState
          title="Nenhuma reserva"
          description="Ainda não há veículos previstos para este dia."
          icon="calendar-outline"
        />
      )}
    </ScreenContainer>
  );
}
