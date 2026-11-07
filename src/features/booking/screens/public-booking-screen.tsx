import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest } from '@/data/repositories';
import { getErrorMessage } from '@/domain/errors';
import type { BookingReceipt, PublicSchedule } from '@/domain/models';
import { publicBooking } from '@/domain/validation/booking';
import { markFormDirty } from '@/pwa/activity';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  LoadingState,
  ScreenContainer,
  uiStyles,
} from '@/shared/ui';
import { formatCalendarDate, formatCurrency, formatShortDate } from '@/shared/utils/format';
import styles from './public-booking-screen.module.css';

const customerSchema = publicBooking.pick({
  customerName: true,
  customerPhone: true,
  vehicleDescription: true,
  vehiclePlate: true,
});
type CustomerForm = z.input<typeof customerSchema>;
function subscribeOnline(callback: () => void) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}
export default function PublicBookingScreen() {
  const { establishmentId = '' } = useParams();
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => subscribeOnline(() => setOnline(navigator.onLine)), []);
  const query = useQuery({
    queryKey: ['public-schedule', establishmentId],
    queryFn: async () => {
      const response = await fetch(
        `/api/app?establishment=${encodeURIComponent(establishmentId)}`,
        { cache: 'no-store', credentials: 'omit' },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? 'Agenda indisponível.');
      return result.data as PublicSchedule;
    },
    retry: false,
    networkMode: 'always',
    refetchInterval: online ? 15000 : false,
  });
  useEffect(() => {
    document.title = `${query.data?.establishment.name ?? 'Agendamento'} · Lava On`;
  }, [query.data?.establishment.name]);
  if (query.isPending) return <LoadingState label="Buscando dias disponíveis…" />;
  if (!query.data)
    return (
      <ScreenContainer>
        <ErrorState
          message={
            !online
              ? 'Conecte-se à internet para consultar as vagas e enviar sua reserva.'
              : getErrorMessage(query.error)
          }
          onRetry={() => void query.refetch()}
        />
      </ScreenContainer>
    );
  return (
    <BookingForm
      key={establishmentId}
      data={query.data}
      online={online}
      stale={query.isError}
      refresh={() => void query.refetch()}
    />
  );
}
function BookingForm({
  data,
  online,
  stale,
  refresh,
}: {
  data: PublicSchedule;
  online: boolean;
  stale: boolean;
  refresh: () => void;
}) {
  const [date, setDate] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [receipt, setReceipt] = useState<BookingReceipt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const attempt = useRef<{ fingerprint: string; requestId: string } | null>(null);
  const day = data.days.find((item) => item.date === date);
  const service = day?.services.find((item) => item.id === serviceId);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CustomerForm, unknown, z.output<typeof customerSchema>>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      customerName: '',
      customerPhone: '',
      vehicleDescription: '',
      vehiclePlate: '',
    },
  });
  const submit = handleSubmit(async (customer) => {
    setError(null);
    if (!online) {
      setError('Conecte-se à internet para enviar a solicitação.');
      return;
    }
    if (!day || !service || !day.available) {
      setError('Escolha um dia com vagas e um serviço disponível.');
      refresh();
      return;
    }
    const payload = { ...customer, date, serviceId };
    const fingerprint = JSON.stringify(payload);
    if (attempt.current?.fingerprint !== fingerprint)
      attempt.current = { fingerprint, requestId: crypto.randomUUID() };
    try {
      const result = await apiRequest<BookingReceipt>('public.book', [
        data.establishment.id,
        { ...payload, requestId: attempt.current.requestId },
      ]);
      setReceipt(result);
      refresh();
    } catch (cause) {
      setError(getErrorMessage(cause));
      refresh();
    }
  });
  return (
    <ScreenContainer form>
      <header className="stack">
        <span className={styles.brand}>Lava On · Agendamento</span>
        <h1 className={uiStyles.title}>{data.establishment.name}</h1>
        <p className={uiStyles.muted}>
          {data.establishment.address.city} · {data.establishment.address.state}
        </p>
      </header>
      {receipt ? (
        <Card>
          <div role="status" className="stack">
            <h2 className={uiStyles.heading}>Solicitação enviada!</h2>
            <p className={uiStyles.body}>
              Sua vaga está reservada enquanto o estabelecimento analisa o pedido.
            </p>
            <p className={uiStyles.body}>
              {formatShortDate(receipt.serviceDate)} · {receipt.serviceName} ·{' '}
              {formatCurrency(receipt.priceInCents)}
            </p>
            <p className={uiStyles.caption}>
              Status: pendente de aprovação. Guarde o protocolo e entre em contato com o
              estabelecimento para acompanhar a confirmação.
            </p>
            <p className={styles.protocol}>Protocolo: {receipt.id}</p>
          </div>
        </Card>
      ) : (
        <>
          <p className={uiStyles.body}>
            Escolha um dia e o serviço para seu veículo. O pedido ficará pendente de aprovação,
            ocupando uma vaga.
          </p>
          {(!online || stale) && (
            <p role="alert" className={styles.notice}>
              {!online
                ? 'Você está sem internet. Os dados abaixo podem estar desatualizados. Conecte-se para enviar sua reserva.'
                : 'Não foi possível atualizar as vagas. Ao enviar, a disponibilidade será verificada novamente.'}
            </p>
          )}
          {!data.days.length ? (
            <EmptyState
              title="Nenhum dia aberto no momento"
              description="O estabelecimento ainda não publicou novas datas. Volte mais tarde ou entre em contato."
            />
          ) : (
            <>
              <fieldset className={styles.fields} disabled={isSubmitting}>
                <legend className={uiStyles.heading}>1. Escolha o dia</legend>
                <div className={styles.days}>
                  {data.days.map((item) => (
                    <button
                      type="button"
                      key={item.date}
                      className={`${styles.day} ${date === item.date ? styles.selected : ''}`}
                      aria-pressed={date === item.date}
                      disabled={item.available === 0 || !item.services.length}
                      onClick={() => {
                        setDate(item.date);
                        setServiceId('');
                        setError(null);
                        markFormDirty();
                      }}
                    >
                      <span>{formatCalendarDate(item.date, 'EEEE')}</span>
                      <strong>{formatShortDate(item.date)}</strong>
                      <span>
                        {!item.services.length
                          ? 'Indisponível'
                          : item.available
                            ? `${item.available} vaga(s)`
                            : 'Esgotado'}
                      </span>
                    </button>
                  ))}
                </div>
              </fieldset>
              {day && (
                <fieldset className={styles.fields} disabled={isSubmitting}>
                  <legend className={uiStyles.heading}>
                    2. Serviço para {formatShortDate(date)}
                  </legend>
                  {day.services.map((item) => (
                    <label key={item.id} className={styles.service}>
                      <input
                        type="radio"
                        name="service"
                        value={item.id}
                        checked={serviceId === item.id}
                        onChange={() => {
                          setServiceId(item.id);
                          markFormDirty();
                        }}
                      />
                      <span>
                        <strong>{item.name}</strong>
                        <span className={uiStyles.caption}>
                          {item.vehicleCategory === 'SMALL_CAR' ? 'Carro pequeno' : 'Carro grande'}{' '}
                          · {formatCurrency(item.priceInCents)}
                        </span>
                      </span>
                    </label>
                  ))}
                  {!day.available && (
                    <p role="alert" className={styles.notice}>
                      As vagas deste dia acabaram. Escolha outra data.
                    </p>
                  )}
                </fieldset>
              )}
              {service && (
                <fieldset className={styles.fields} disabled={isSubmitting}>
                  <legend className={uiStyles.heading}>3. Seus dados</legend>
                  <Controller
                    control={control}
                    name="customerName"
                    render={({ field }) => (
                      <Input
                        label="Seu nome"
                        value={field.value}
                        onChangeText={field.onChange}
                        error={errors.customerName?.message}
                      />
                    )}
                  />
                  <Controller
                    control={control}
                    name="customerPhone"
                    render={({ field }) => (
                      <Input
                        label="Telefone com DDD"
                        keyboardType="phone-pad"
                        value={field.value}
                        onChangeText={field.onChange}
                        error={errors.customerPhone?.message}
                      />
                    )}
                  />
                  <Controller
                    control={control}
                    name="vehicleDescription"
                    render={({ field }) => (
                      <Input
                        label="Modelo e cor do veículo"
                        placeholder="Ex.: Honda Fit prata"
                        value={field.value}
                        onChangeText={field.onChange}
                        error={errors.vehicleDescription?.message}
                      />
                    )}
                  />
                  <Controller
                    control={control}
                    name="vehiclePlate"
                    render={({ field }) => (
                      <Input
                        label="Placa do veículo"
                        autoCapitalize="characters"
                        value={field.value}
                        onChangeText={field.onChange}
                        error={errors.vehiclePlate?.message}
                      />
                    )}
                  />
                  <p className={uiStyles.caption}>
                    Seus dados serão usados pelo estabelecimento para organizar e entrar em contato
                    sobre este atendimento.
                  </p>
                </fieldset>
              )}
              {error && (
                <p role="alert" className={styles.notice}>
                  {error}
                </p>
              )}
              <Button
                title="Solicitar agendamento"
                disabled={!online || !service || !day?.available}
                loading={isSubmitting}
                onClick={() => void submit()}
              />
              <p className={uiStyles.caption}>
                A disponibilidade é conferida ao enviar. Se o pedido for recusado ou cancelado, a
                vaga será liberada.
              </p>
            </>
          )}
        </>
      )}
      <Card>
        <h2 className={uiStyles.heading}>Fale com o estabelecimento</h2>
        <a
          className={styles.contact}
          href={`tel:${data.establishment.phone.replace(/[^+0-9]/g, '')}`}
        >
          {data.establishment.phone}
        </a>
      </Card>
    </ScreenContainer>
  );
}
