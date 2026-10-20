import styles from './capacity-summary.module.css';
import { cx } from '@/shared/ui/classes';

import type { DailyCapacity } from '@/domain/models';
import { colors } from '@/shared/theme';

export function CapacitySummary({ capacity }: { capacity: DailyCapacity }) {
  const metrics = [
    { label: 'Capacidade', value: capacity.capacity, color: colors.text },
    { label: 'Confirmadas', value: capacity.confirmed, color: colors.info },
    { label: 'Pendentes', value: capacity.pending, color: colors.warning },
    { label: 'Disponíveis', value: capacity.available, color: colors.success },
    { label: 'Atendidos', value: capacity.completed, color: colors.primary },
  ];
  return (
    <div className={cx('stack', styles.grid)}>
      {metrics.map((metric) => (
        <div key={metric.label} className={cx('stack', styles.metric)}>
          <span className={cx(styles.value)} style={{ color: metric.color }}>
            {metric.value}
          </span>
          <span className={cx(styles.label)}>{metric.label}</span>
        </div>
      ))}
      {capacity.inconsistent ? (
        <span className={cx(styles.warning)}>
          A capacidade está abaixo das reservas existentes.
        </span>
      ) : null}
    </div>
  );
}
