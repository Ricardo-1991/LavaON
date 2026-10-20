import styles from './reservation-card.module.css';
import { cx } from '@/shared/ui/classes';
import { Icon } from '@/shared/ui/icon';

import type { Reservation } from '@/domain/models';
import { RESERVATION_STATUS_META } from '@/domain/rules/reservations';
import { colors } from '@/shared/theme';
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
    <span
      className={cx(styles.badge)}
      style={{ backgroundColor: tone.backgroundColor, color: tone.color }}
    >
      {meta.label}
    </span>
  );
}

export function ReservationCard({
  reservation,
  onClick,
}: {
  reservation: Reservation;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className={cx(styles.card)}>
      <div className={cx('stack', styles.topRow)}>
        <div className={cx('stack', styles.identity)}>
          <span className={cx(styles.name)}>{reservation.snapshot.customerName}</span>
          <span className={cx(styles.vehicle)}>
            {reservation.snapshot.vehicleDescription} · {reservation.snapshot.vehiclePlate}
          </span>
        </div>
        <StatusBadge status={reservation.status} />
      </div>
      <div className={cx('stack', styles.divider)} />
      <div className={cx('stack', styles.bottomRow)}>
        <div className={cx('stack', styles.meta)}>
          <Icon name="calendar-outline" size={15} color={colors.textMuted} />
          <span className={cx(styles.metaText)}>{formatShortDate(reservation.serviceDate)}</span>
        </div>
        <span className={cx(styles.service)}>{reservation.snapshot.serviceName}</span>
        <span className={cx(styles.price)}>
          {formatCurrency(reservation.snapshot.priceInCents)}
        </span>
      </div>
    </button>
  );
}
