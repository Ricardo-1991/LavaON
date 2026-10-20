import styles from './schedule-screen.module.css';
import { cx } from '@/shared/ui/classes';
import { useAppNavigation } from '@/app/navigation';
import { useState } from 'react';

import { useEstablishment, useSchedule } from '@/data/query/hooks';
import { getErrorMessage } from '@/domain/errors';
import { getTodayInTimeZone } from '@/domain/rules/reservations';

import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  ScreenContainer,
  uiStyles,
} from '@/shared/ui';
import { formatCalendarDate } from '@/shared/utils/format';

export default function ScheduleScreen() {
  const router = useAppNavigation();
  const [days, setDays] = useState(30);
  const establishment = useEstablishment();
  const today = getTodayInTimeZone(establishment.data?.timeZone ?? 'America/Sao_Paulo');
  const query = useSchedule(today, days);
  return (
    <ScreenContainer>
      <div className={cx('stack')}>
        <span className={cx(uiStyles.title)}>Agenda</span>
        <span className={cx(uiStyles.muted)}>Capacidade diária dos próximos {days} dias.</span>
      </div>
      {query.isLoading ? (
        <LoadingState />
      ) : query.error ? (
        <ErrorState message={getErrorMessage(query.error)} onRetry={() => void query.refetch()} />
      ) : query.data?.length ? (
        <>
          {query.data.map((day) => (
            <button
              type="button"
              key={day.capacity.date}
              onClick={() => router.push(`/schedule/${day.capacity.date}`)}
              className={cx(styles.day)}
            >
              <div className={cx('stack', styles.dayDate)}>
                <span className={cx(styles.dayName)}>
                  {formatCalendarDate(day.capacity.date, 'EEEE')}
                </span>
                <span className={cx(styles.date)}>
                  {formatCalendarDate(day.capacity.date, 'dd/MM')}
                </span>
              </div>
              <div className={cx('stack', styles.numbers)}>
                <span className={cx(styles.available)}>
                  {day.capacity.open ? day.capacity.available : '—'}
                </span>
                <span className={cx(styles.caption)}>
                  {day.capacity.open ? 'vagas livres' : 'fechado'}
                </span>
              </div>
              <div className={cx('stack', styles.summary)}>
                <span className={cx(styles.caption)}>{day.capacity.confirmed} confirmadas</span>
                <span className={cx(styles.caption)}>{day.capacity.pending} pendentes</span>
              </div>
            </button>
          ))}
          <Button
            title="Mostrar mais 30 dias"
            variant="secondary"
            onClick={() => setDays((value) => value + 30)}
          />
        </>
      ) : (
        <EmptyState
          title="Agenda indisponível"
          description="Configure os dias de funcionamento para visualizar a agenda."
        />
      )}
    </ScreenContainer>
  );
}
