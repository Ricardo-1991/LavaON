import { useState } from 'react';
import { useAppNavigation, useRouteParams } from '@/app/navigation';
import {
  useCreateSchedulePeriod,
  useEstablishment,
  useOperatingDays,
  useServices,
} from '@/data/query/hooks';
import { getErrorMessage } from '@/domain/errors';
import type { OperatingDay, Service } from '@/domain/models';
import { getTodayInTimeZone } from '@/domain/rules/reservations';
import { addCalendarDays, getSchedulePeriod, isCalendarDate } from '@/domain/rules/schedule';
import { markFormDirty } from '@/pwa/activity';
import {
  Button,
  Card,
  ErrorState,
  Input,
  LoadingState,
  NumericInput,
  ScreenContainer,
  Toggle,
  uiStyles,
} from '@/shared/ui';
import { showDialog } from '@/shared/ui/dialog';
import { formatCalendarDate, formatShortDate } from '@/shared/utils/format';
import styles from './schedule-period-screen.module.css';

type DayDraft = { open: boolean; capacity: number; serviceIds: string[] };

export default function SchedulePeriodScreen({ mode }: { mode: 'day' | 'week' }) {
  const operating = useOperatingDays();
  const establishment = useEstablishment();
  const services = useServices();
  if (operating.isLoading || establishment.isLoading || services.isLoading) return <LoadingState />;
  if (
    operating.error ||
    establishment.error ||
    services.error ||
    !operating.data ||
    !establishment.data ||
    !services.data
  ) {
    return (
      <ErrorState
        message={getErrorMessage(operating.error ?? establishment.error ?? services.error)}
        onRetry={() => {
          void operating.refetch();
          void establishment.refetch();
          void services.refetch();
        }}
      />
    );
  }
  return (
    <SchedulePeriodForm
      mode={mode}
      operatingDays={operating.data}
      services={services.data.filter((service) => service.active)}
      timeZone={establishment.data.timeZone}
    />
  );
}

function SchedulePeriodForm({
  mode,
  operatingDays,
  services,
  timeZone,
}: {
  mode: 'day' | 'week';
  operatingDays: OperatingDay[];
  services: Service[];
  timeZone: string;
}) {
  const today = getTodayInTimeZone(timeZone);
  const params = useRouteParams<{ date?: string }>();
  const [startDate, setStartDate] = useState(
    params.date && isCalendarDate(params.date) ? params.date : today,
  );
  const [drafts, setDrafts] = useState<Record<string, DayDraft>>({});
  const mutation = useCreateSchedulePeriod();
  const router = useAppNavigation();
  const week = mode === 'week';
  const days = isCalendarDate(startDate)
    ? Array.from({ length: week ? 7 : 1 }, (_, index) => {
        const date = addCalendarDays(startDate, index);
        const template = operatingDays.find(
          (day) => day.weekday === new Date(`${date}T12:00:00Z`).getUTCDay(),
        );
        return {
          date,
          ...(drafts[date] ?? {
            open: week ? (template?.open ?? false) : true,
            capacity: template?.capacity && template.capacity > 0 ? template.capacity : 15,
            serviceIds: services.map((service) => service.id),
          }),
        };
      })
    : [];
  const update = (date: string, patch: Partial<DayDraft>) => {
    const current = days.find((day) => day.date === date);
    if (!current) return;
    setDrafts((previous) => ({
      ...previous,
      [date]: {
        open: current.open,
        capacity: current.capacity,
        serviceIds: current.serviceIds,
        ...patch,
      },
    }));
    markFormDirty();
  };
  const save = () => {
    const input = {
      startDate,
      days: days.map(({ open, capacity, serviceIds }) => ({ open, capacity, serviceIds })),
    };
    try {
      getSchedulePeriod(input, today);
      if (days.some((day) => day.open && !day.serviceIds.length))
        throw new Error('Selecione pelo menos um serviço em cada dia aberto.');
    } catch (error) {
      showDialog('Confira a agenda', getErrorMessage(error));
      return;
    }
    mutation.mutate(input, {
      onSuccess: () => {
        router.replace(
          week ? { pathname: '/schedule', params: { start: startDate } } : `/schedule/${startDate}`,
        );
        showDialog(
          week ? 'Semana criada' : 'Dia criado',
          'Disponibilidade e serviços salvos. Compartilhe o link da agenda com seus clientes.',
        );
      },
      onError: (error) => showDialog('Não foi possível criar a agenda', getErrorMessage(error)),
    });
  };
  const openDays = days.filter((day) => day.open);
  return (
    <ScreenContainer form>
      <div className="stack">
        <h2 className={uiStyles.title}>
          {week ? 'Nova semana de agendamentos' : 'Novo dia de agendamentos'}
        </h2>
        <p className={uiStyles.muted}>
          {week
            ? 'Escolha a data inicial e defina as vagas dos sete dias seguintes.'
            : 'Escolha uma data e quantos veículos poderão ser atendidos.'}
        </p>
      </div>
      {!services.length && (
        <Card>
          <p className={uiStyles.body}>Você precisa de serviços ativos para receber reservas.</p>
          <Button
            title="Cadastrar serviço"
            variant="secondary"
            onClick={() => router.push('/services/new')}
          />
        </Card>
      )}
      <fieldset className={styles.fields} disabled={mutation.isPending}>
        <legend className="sr-only">Disponibilidade para agendamentos</legend>
        <Card>
          <Input
            label={week ? 'Data inicial da semana' : 'Data do atendimento'}
            type="date"
            min={today}
            value={startDate}
            onChangeText={setStartDate}
          />
          {week && days.length > 0 && (
            <p className={uiStyles.caption}>
              Período: {formatShortDate(startDate)} a {formatShortDate(days[6]!.date)}. O
              funcionamento semanal preenche as sugestões iniciais.
            </p>
          )}
        </Card>
        {days.length > 0 && (
          <Card>
            {days.map((day) => (
              <section
                key={day.date}
                className={styles.daySection}
                aria-label={formatShortDate(day.date)}
              >
                <div className={styles.day}>
                  <div className={styles.identity}>
                    <span className={styles.dayName}>{formatCalendarDate(day.date, 'EEEE')}</span>
                    <span className={uiStyles.caption}>
                      {formatShortDate(day.date)} · {day.open ? 'Aberto' : 'Fechado'}
                    </span>
                  </div>
                  {day.open && (
                    <label className={styles.capacity}>
                      <span>Vagas</span>
                      <NumericInput
                        aria-label={`Vagas de ${formatShortDate(day.date)}`}
                        className={styles.capacityInput}
                        value={String(day.capacity)}
                        onChangeText={(value) =>
                          update(day.date, { capacity: value.trim() === '' ? 0 : Number(value) })
                        }
                      />
                    </label>
                  )}
                  {week && (
                    <Toggle
                      aria-label={`Abrir ${formatShortDate(day.date)}`}
                      value={day.open}
                      onValueChange={(open) => update(day.date, { open })}
                    />
                  )}
                </div>
                {day.open && (
                  <fieldset className={styles.services}>
                    <legend>Serviços de {formatShortDate(day.date)}</legend>
                    {services.map((service) => (
                      <label key={service.id} className={styles.service}>
                        <input
                          type="checkbox"
                          checked={day.serviceIds.includes(service.id)}
                          onChange={(event) =>
                            update(day.date, {
                              serviceIds: event.target.checked
                                ? [...day.serviceIds, service.id]
                                : day.serviceIds.filter((id) => id !== service.id),
                            })
                          }
                        />
                        <span>
                          {service.name} ·{' '}
                          {service.vehicleCategory === 'SMALL_CAR'
                            ? 'Carro pequeno'
                            : 'Carro grande'}
                        </span>
                      </label>
                    ))}
                    {!services.length && (
                      <p className={uiStyles.caption}>
                        Cadastre um serviço ativo antes de abrir a agenda.
                      </p>
                    )}
                  </fieldset>
                )}
              </section>
            ))}
          </Card>
        )}
      </fieldset>
      <Card>
        <h3 className={uiStyles.heading}>Resumo da disponibilidade</h3>
        <p className={uiStyles.body}>
          {openDays.length} dia(s) aberto(s) · Capacidade total de{' '}
          {openDays.reduce(
            (total, day) => total + (Number.isFinite(day.capacity) ? day.capacity : 0),
            0,
          )}{' '}
          veículo(s).
        </p>
        <p className={uiStyles.caption}>
          Esta configuração vale apenas para as datas escolhidas. As reservas existentes já ocupam
          vagas e não serão alteradas.
        </p>
      </Card>
      <Button
        title={week ? 'Criar semana' : 'Criar dia'}
        onClick={save}
        loading={mutation.isPending}
        disabled={!services.length}
      />
      <Button
        title="Voltar à agenda"
        variant="ghost"
        disabled={mutation.isPending}
        onClick={() => router.replace('/schedule')}
      />
    </ScreenContainer>
  );
}
