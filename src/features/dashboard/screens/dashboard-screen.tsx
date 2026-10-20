import styles from './dashboard-screen.module.css';
import { cx } from '@/shared/ui/classes';
import { Icon, type IconName } from '@/shared/ui/icon';
import { useAppNavigation } from '@/app/navigation';

import { useDashboard, useEstablishment } from '@/data/query/hooks';
import { getErrorMessage } from '@/domain/errors';
import { getTodayInTimeZone } from '@/domain/rules/reservations';
import { ReservationCard } from '@/features/reservations/components/reservation-card';
import { CapacitySummary } from '@/features/schedule/components/capacity-summary';
import { useSession } from '@/providers/session-provider';
import { colors } from '@/shared/theme';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  ScreenContainer,
  SectionHeader,
  uiStyles,
} from '@/shared/ui';
import { formatCalendarDate } from '@/shared/utils/format';

export default function DashboardScreen() {
  const router = useAppNavigation();
  const { session } = useSession();
  const establishment = useEstablishment();
  const today = getTodayInTimeZone(establishment.data?.timeZone ?? 'America/Sao_Paulo');
  const dashboard = useDashboard(today);
  if (establishment.isLoading || dashboard.isLoading)
    return <LoadingState label="Preparando seu dia…" />;
  if (establishment.error || dashboard.error || !dashboard.data)
    return (
      <ErrorState
        message={getErrorMessage(establishment.error ?? dashboard.error)}
        onRetry={() => {
          void establishment.refetch();
          void dashboard.refetch();
        }}
      />
    );
  const data = dashboard.data;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  return (
    <ScreenContainer>
      <div className={cx('stack', styles.heading)}>
        <span className={cx(styles.kicker)}>{establishment.data?.name}</span>
        <span className={cx(uiStyles.title)}>
          {greeting}, {session?.owner.name.split(' ')[0]}.
        </span>
        <span className={cx(styles.date)}>{formatCalendarDate(today)}</span>
      </div>
      <CapacitySummary capacity={data.capacity} />
      {data.activeServiceCount === 0 ? (
        <Card>
          <span className={cx(uiStyles.heading)}>Cadastre seu primeiro serviço</span>
          <span className={cx(uiStyles.muted)}>
            Serviços ativos são necessários para receber solicitações quando a página pública for
            conectada.
          </span>
          <Button title="Cadastrar serviço" onClick={() => router.push('/services/new')} />
        </Card>
      ) : null}
      <div className={cx('stack', styles.shortcuts)}>
        <Shortcut
          icon="calendar-outline"
          label="Ver agenda"
          onClick={() => router.push('/schedule')}
        />
        <Shortcut
          icon="car-outline"
          label="Reservas"
          onClick={() => router.push('/reservations')}
        />
        <Shortcut icon="water-outline" label="Serviços" onClick={() => router.push('/services')} />
      </div>
      <SectionHeader
        title={`Aguardando aprovação (${data.pendingReservations.length})`}
        action={
          data.pendingReservations.length ? (
            <Button
              title="Ver todas"
              variant="ghost"
              onClick={() =>
                router.push({ pathname: '/reservations', params: { status: 'PENDING' } })
              }
            />
          ) : undefined
        }
      />
      {data.pendingReservations.length ? (
        data.pendingReservations
          .slice(0, 3)
          .map((reservation) => (
            <ReservationCard
              key={reservation.id}
              reservation={reservation}
              onClick={() => router.push(`/reservations/${reservation.id}`)}
            />
          ))
      ) : (
        <EmptyState
          title="Nenhuma solicitação pendente"
          description="As novas solicitações aparecerão aqui."
          icon="checkmark-circle-outline"
        />
      )}
      <SectionHeader title="Confirmadas para hoje" />
      {data.confirmedReservations.length ? (
        data.confirmedReservations.map((reservation) => (
          <ReservationCard
            key={reservation.id}
            reservation={reservation}
            onClick={() => router.push(`/reservations/${reservation.id}`)}
          />
        ))
      ) : (
        <EmptyState
          title="Agenda livre por enquanto"
          description="Não há reservas confirmadas para hoje."
          icon="calendar-outline"
        />
      )}
      <SectionHeader title="Próximos dias" />
      {data.upcomingReservations.length ? (
        data.upcomingReservations.map((reservation) => (
          <ReservationCard
            key={reservation.id}
            reservation={reservation}
            onClick={() => router.push(`/reservations/${reservation.id}`)}
          />
        ))
      ) : (
        <EmptyState
          title="Sem reservas futuras"
          description="As próximas confirmações serão exibidas aqui."
          icon="calendar-clear-outline"
        />
      )}
    </ScreenContainer>
  );
}

function Shortcut({
  icon,
  label,
  onClick,
}: {
  icon: IconName;
  label: string;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className={cx(styles.shortcut)}>
      <Icon name={icon} size={21} color={colors.primary} />
      <span className={cx(styles.shortcutLabel)}>{label}</span>
    </button>
  );
}
