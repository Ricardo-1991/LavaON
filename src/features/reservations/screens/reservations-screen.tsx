import styles from './reservations-screen.module.css';
import { cx } from '@/shared/ui/classes';
import { useRouteParams, useAppNavigation } from '@/app/navigation';
import { useState } from 'react';

import { useReservations } from '@/data/query/hooks';
import { getErrorMessage } from '@/domain/errors';
import type { ReservationPeriod, ReservationStatusFilter } from '@/domain/models';
import { getTodayInTimeZone } from '@/domain/rules/reservations';
import { ReservationCard } from '@/features/reservations/components/reservation-card';

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
  const params = useRouteParams<{ status?: string }>();
  const [period, setPeriod] = useState<ReservationPeriod>('ALL');
  const [status, setStatus] = useState<ReservationStatusFilter>(
    (statuses.some((item) => item.value === params.status)
      ? params.status
      : 'ALL') as ReservationStatusFilter,
  );
  const [date, setDate] = useState(getTodayInTimeZone('America/Sao_Paulo'));
  const router = useAppNavigation();
  const query = useReservations({ period, status, date: period === 'DATE' ? date : undefined });
  return (
    <ScreenContainer>
      <div className={cx('stack')}>
        <span className={cx(uiStyles.title)}>Reservas</span>
        <span className={cx(uiStyles.muted)}>
          Acompanhe solicitações, atendimentos e histórico.
        </span>
      </div>
      <div className={cx('horizontal-scroll', styles.chips)}>
        {periods.map((item) => (
          <FilterChip
            key={item.value}
            label={item.label}
            selected={period === item.value}
            onClick={() => setPeriod(item.value)}
          />
        ))}
      </div>
      {period === 'DATE' ? (
        <Input
          label="Data da reserva (AAAA-MM-DD)"
          value={date}
          onChangeText={setDate}
          autoCapitalize="none"
        />
      ) : null}
      <div className={cx('horizontal-scroll', styles.chips)}>
        {statuses.map((item) => (
          <FilterChip
            key={item.value}
            label={item.label}
            selected={status === item.value}
            onClick={() => setStatus(item.value)}
          />
        ))}
      </div>
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
              onClick={() => router.push(`/reservations/${reservation.id}`)}
            />
          ))}
          <span className={cx(styles.total)}>{query.data.total} reserva(s)</span>
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
