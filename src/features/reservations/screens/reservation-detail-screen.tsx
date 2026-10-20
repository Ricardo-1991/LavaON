import styles from './reservation-detail-screen.module.css';
import { cx } from '@/shared/ui/classes';
import { showDialog } from '@/shared/ui/dialog';
import { Icon, type IconName } from '@/shared/ui/icon';
import { useRouteParams } from '@/app/navigation';

import { useEstablishment, useReservation, useReservationAction } from '@/data/query/hooks';
import { getErrorMessage } from '@/domain/errors';
import type { ReservationAction } from '@/domain/models';
import {
  getAllowedReservationActions,
  getTodayInTimeZone,
  RESERVATION_ACTION_LABELS,
} from '@/domain/rules/reservations';
import { StatusBadge } from '@/features/reservations/components/reservation-card';
import { colors } from '@/shared/theme';
import { Button, Card, ErrorState, LoadingState, ScreenContainer, uiStyles } from '@/shared/ui';
import { categoryLabel, formatCalendarDate, formatCurrency } from '@/shared/utils/format';

export default function ReservationDetailScreen() {
  const { id } = useRouteParams<{ id: string }>();
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
        onError: (error) => showDialog('Não foi possível atualizar', getErrorMessage(error)),
        onSuccess: () => showDialog('Reserva atualizada', 'O novo status já aparece na agenda.'),
      });
    if (action === 'ACCEPT' || action === 'COMPLETE') return run();
    showDialog(RESERVATION_ACTION_LABELS[action], 'Confirma esta ação?', [
      { text: 'Voltar', style: 'cancel' },
      {
        text: 'Confirmar',
        style: action === 'CANCEL' || action === 'REJECT' ? 'destructive' : 'default',
        onClick: run,
      },
    ]);
  };
  return (
    <ScreenContainer>
      <div className={cx('stack', styles.heading)}>
        <StatusBadge status={reservation.status} />
        <span className={cx(uiStyles.title)}>{reservation.snapshot.customerName}</span>
        <span className={cx(styles.date)}>{formatCalendarDate(reservation.serviceDate)}</span>
      </div>
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
        <div className={cx('stack', styles.actions)}>
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
              onClick={() => execute(action)}
              disabled={mutation.isPending}
              loading={mutation.isPending && mutation.variables === action}
            />
          ))}
        </div>
      ) : (
        <span className={cx(styles.final)}>
          Esta reserva está em um estado final e permanece disponível somente para consulta.
        </span>
      )}
    </ScreenContainer>
  );
}

function Detail({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <div className={cx('stack', styles.detail)}>
      <Icon name={icon} size={20} color={colors.primary} />
      <div className={cx('stack', styles.detailText)}>
        <span className={cx(styles.label)}>{label}</span>
        <span className={cx(uiStyles.body)}>{value}</span>
      </div>
    </div>
  );
}
