import styles from './operating-screen.module.css';
import { cx } from '@/shared/ui/classes';
import { showDialog } from '@/shared/ui/dialog';
import { Toggle, NumericInput } from '@/shared/ui';
import React from 'react';

import { useOperatingDays, useUpdateOperatingDays } from '@/data/query/hooks';
import { getErrorMessage } from '@/domain/errors';
import type { OperatingDay } from '@/domain/models';

import { Button, Card, ErrorState, LoadingState, ScreenContainer, uiStyles } from '@/shared/ui';

const names = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

export default function OperatingScreen() {
  const query = useOperatingDays();
  if (query.isLoading) return <LoadingState />;
  if (query.error || !query.data)
    return (
      <ErrorState message={getErrorMessage(query.error)} onRetry={() => void query.refetch()} />
    );
  return <OperatingForm initialDays={query.data} />;
}

function OperatingForm({ initialDays }: { initialDays: OperatingDay[] }) {
  const mutation = useUpdateOperatingDays();
  const [days, setDays] = React.useState<OperatingDay[]>(initialDays);
  const update = (weekday: number, patch: Partial<OperatingDay>) =>
    setDays((current) =>
      current.map((day) => (day.weekday === weekday ? { ...day, ...patch } : day)),
    );
  const save = () => {
    if (days.some((day) => day.open && day.capacity < 1))
      return showDialog('Capacidade inválida', 'Dias abertos precisam de capacidade positiva.');
    mutation.mutate(days, {
      onSuccess: () => showDialog('Funcionamento salvo', 'A agenda foi recalculada.'),
      onError: (error) => showDialog('Não foi possível salvar', getErrorMessage(error)),
    });
  };
  return (
    <ScreenContainer form>
      <div className={cx('stack')}>
        <span className={cx(uiStyles.title)}>Funcionamento</span>
        <span className={cx(uiStyles.muted)}>
          Alterações valem para hoje e para reservas futuras.
        </span>
      </div>
      <Card>
        {days.map((day) => (
          <div key={day.weekday} className={cx('stack', styles.row)}>
            <div className={cx('stack', styles.info)}>
              <span className={cx(uiStyles.body)}>{names[day.weekday]}</span>
              <span className={cx(uiStyles.caption)}>
                {day.open ? 'Capacidade diária' : 'Fechado'}
              </span>
            </div>
            {day.open ? (
              <NumericInput
                aria-label={`Capacidade de ${names[day.weekday]}`}

                keyboardType="number-pad"
                value={String(day.capacity)}
                onChangeText={(value) =>
                  update(day.weekday, { capacity: Number(value.replace(/\D/g, '')) || 0 })
                }
                className={cx(styles.input)}
              />
            ) : null}
            <Toggle
              aria-label={`Abrir ${names[day.weekday]}`}
              value={day.open}
              onValueChange={(open) => update(day.weekday, { open })}
            />
          </div>
        ))}
      </Card>
      <span className={cx(uiStyles.caption)}>
        O aplicativo impede fechar ou reduzir um dia abaixo das reservas que ainda consomem
        capacidade.
      </span>
      <Button title="Salvar funcionamento" onClick={save} loading={mutation.isPending} />
    </ScreenContainer>
  );
}
