import { ShareSchedule } from '../components/share-schedule';
import styles from './schedule-screen.module.css';
import { cx } from '@/shared/ui/classes';
import { useAppNavigation, useRouteParams } from '@/app/navigation';
import { useState } from 'react';

import { useEstablishment, useSchedule } from '@/data/query/hooks';
import { getErrorMessage } from '@/domain/errors';
import { getTodayInTimeZone } from '@/domain/rules/reservations';

import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  Input,
  ScreenContainer,
  uiStyles,
} from '@/shared/ui';
import { formatCalendarDate, formatShortDate, isCalendarDate } from '@/shared/utils/format';

export default function ScheduleScreen() {
  const router = useAppNavigation();
  const [days, setDays] = useState(30);
  const establishment = useEstablishment();
  const today = getTodayInTimeZone(establishment.data?.timeZone ?? 'America/Sao_Paulo');
  const params = useRouteParams<{ start?: string }>();
  const startDate = params.start && isCalendarDate(params.start) ? params.start : today;
  const query = useSchedule(startDate, days);
  return (
    <ScreenContainer>
      <div className={cx('stack')}>
        <span className={cx(uiStyles.title)}>Agenda</span>
        <span className={cx(uiStyles.muted)}>
          {startDate === today
            ? `Capacidade diária dos próximos ${days} dias.`
            : `Capacidade diária a partir de ${formatShortDate(startDate)}.`}
        </span>
      </div>
      <div className={styles.actions}>
        <Button
          title="Novo dia"
          icon="add"
          onClick={() =>
            router.push({
              pathname: '/schedule/new',
              params: { date: startDate < today ? today : startDate },
            })
          }
        />
        <Button
          title="Nova semana"
          icon="calendar-outline"
          variant="secondary"
          onClick={() =>
            router.push({
              pathname: '/schedule/new-week',
              params: { date: startDate < today ? today : startDate },
            })
          }
        />
      </div>
      <ShareSchedule />
      <Input
        label="Exibir a partir de"
        type="date"
        value={startDate}
        onChangeText={(date) => {
          if (isCalendarDate(date))
            router.replace({ pathname: '/schedule', params: { start: date } });
        }}
      />
      {startDate !== today && (
        <Button
          title="Voltar para hoje"
          variant="ghost"
          onClick={() => router.replace('/schedule')}
        />
      )}
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
                {day.configuration && (
                  <span className={styles.customized}>
                    {day.configuration.open ? 'Publicado' : 'Fechado'}
                  </span>
                )}
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
            disabled={days >= 366}
            variant="secondary"
            onClick={() => setDays((value) => Math.min(366, value + 30))}
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
