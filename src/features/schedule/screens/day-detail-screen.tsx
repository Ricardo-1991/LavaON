import { cx } from '@/shared/ui/classes';
import { useRouteParams, useAppNavigation } from '@/app/navigation';

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
import { formatCalendarDate, isCalendarDate } from '@/shared/utils/format';

export default function DayDetailScreen() {
  const { date } = useRouteParams<{ date: string }>();
  const router = useAppNavigation();
  const valid = !!date && isCalendarDate(date);
  const query = useDaySchedule(valid ? date : undefined);
  if (!valid) return <ErrorState message="Data inválida. Use uma data no formato AAAA-MM-DD." />;
  if (query.isLoading) return <LoadingState />;
  if (query.error || !query.data)
    return (
      <ErrorState message={getErrorMessage(query.error)} onRetry={() => void query.refetch()} />
    );
  return (
    <ScreenContainer>
      <div className={cx('stack')}>
        <span className={cx(uiStyles.title)}>{formatCalendarDate(date)}</span>
        <span className={cx(uiStyles.muted)}>
          {query.data.capacity.open ? 'Dia aberto para atendimento' : 'Estabelecimento fechado'}
        </span>
      </div>
      <CapacitySummary capacity={query.data.capacity} />
      <SectionHeader title={`Reservas (${query.data.reservations.length})`} />
      {query.data.reservations.length ? (
        query.data.reservations.map((reservation) => (
          <ReservationCard
            key={reservation.id}
            reservation={reservation}
            onClick={() => router.push(`/reservations/${reservation.id}`)}
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
