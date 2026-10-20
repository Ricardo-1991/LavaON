import styles from './onboarding-screen.module.css';
import { cx } from '@/shared/ui/classes';
import { showDialog } from '@/shared/ui/dialog';
import { Toggle, NumericInput } from '@/shared/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAppNavigation } from '@/app/navigation';
import React from 'react';
import { Controller, useForm } from 'react-hook-form';

import { z } from 'zod';

import { repositories } from '@/data/repositories/mock-repositories';
import { getErrorMessage } from '@/domain/errors';
import type { OperatingDay } from '@/domain/models';
import { useSession } from '@/providers/session-provider';

import { Button, Card, Input, ScreenContainer, uiStyles } from '@/shared/ui';

const schema = z.object({
  name: z.string().trim().min(3, 'Informe o nome do estabelecimento.'),
  phone: z.string().trim().min(10, 'Informe um telefone válido.'),
  street: z.string().trim().min(2, 'Informe a rua.'),
  number: z.string().trim().min(1, 'Informe o número.'),
  district: z.string().trim().min(2, 'Informe o bairro.'),
  city: z.string().trim().min(2, 'Informe a cidade.'),
  state: z.string().trim().length(2, 'Use a sigla com 2 letras.'),
  postalCode: z.string().trim().min(8, 'Informe o CEP.'),
  complement: z.string(),
});
type FormData = z.infer<typeof schema>;
type DayDraft = Omit<OperatingDay, 'establishmentId'>;

const weekdayNames = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];
const initialDays: DayDraft[] = ([0, 1, 2, 3, 4, 5, 6] as const).map((weekday) => ({
  weekday,
  open: weekday !== 0,
  capacity: weekday === 6 ? 12 : 15,
}));

export default function OnboardingScreen() {
  const [step, setStep] = React.useState(0);
  const [days, setDays] = React.useState(initialDays);
  const [saving, setSaving] = React.useState(false);
  const { session, refreshSession } = useSession();
  const router = useAppNavigation();
  const {
    control,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      phone: '',
      street: '',
      number: '',
      district: '',
      city: '',
      state: '',
      postalCode: '',
      complement: '',
    },
  });

  const updateDay = (weekday: number, patch: Partial<DayDraft>) =>
    setDays((current) =>
      current.map((day) => (day.weekday === weekday ? { ...day, ...patch } : day)),
    );
  const finish = async () => {
    if (!session) return;
    try {
      setSaving(true);
      const values = getValues();
      await repositories.establishments.createForOwner(
        session.owner.id,
        {
          name: values.name,
          phone: values.phone,
          address: {
            street: values.street,
            number: values.number,
            district: values.district,
            city: values.city,
            state: values.state.toUpperCase(),
            postalCode: values.postalCode,
            complement: values.complement || undefined,
          },
        },
        days,
      );
      await refreshSession();
      router.replace('/');
    } catch (error) {
      showDialog('Não foi possível concluir', getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenContainer form>
      <div className={cx('stack', styles.top)}>
        <span className={cx(styles.eyebrow)}>CONFIGURAÇÃO {step + 1} DE 3</span>
        <span className={cx(uiStyles.title)}>
          {step === 0
            ? 'Conte sobre seu lava-jato'
            : step === 1
              ? 'Defina o funcionamento'
              : 'Tudo pronto para começar'}
        </span>
        <div className={cx('stack', styles.progress)}>
          <div
            className={cx('stack', styles.progressFill)}
            style={{ width: `${((step + 1) / 3) * 100}%` }}
          />
        </div>
      </div>

      {step === 0 ? (
        <Card>
          <Controller
            control={control}
            name="name"
            render={({ field }) => (
              <Input
                label="Nome do estabelecimento"
                value={field.value}
                onChangeText={field.onChange}
                error={errors.name?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="phone"
            render={({ field }) => (
              <Input
                label="Telefone"
                keyboardType="phone-pad"
                value={field.value}
                onChangeText={field.onChange}
                error={errors.phone?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="street"
            render={({ field }) => (
              <Input
                label="Rua"
                value={field.value}
                onChangeText={field.onChange}
                error={errors.street?.message}
              />
            )}
          />
          <div className={cx('stack', styles.twoColumns)}>
            <div className={cx('stack', styles.flex)}>
              <Controller
                control={control}
                name="number"
                render={({ field }) => (
                  <Input
                    label="Número"
                    value={field.value}
                    onChangeText={field.onChange}
                    error={errors.number?.message}
                  />
                )}
              />
            </div>
            <div className={cx('stack', styles.flex)}>
              <Controller
                control={control}
                name="district"
                render={({ field }) => (
                  <Input
                    label="Bairro"
                    value={field.value}
                    onChangeText={field.onChange}
                    error={errors.district?.message}
                  />
                )}
              />
            </div>
          </div>
          <Controller
            control={control}
            name="city"
            render={({ field }) => (
              <Input
                label="Cidade"
                value={field.value}
                onChangeText={field.onChange}
                error={errors.city?.message}
              />
            )}
          />
          <div className={cx('stack', styles.twoColumns)}>
            <div className={cx('stack', styles.flex)}>
              <Controller
                control={control}
                name="state"
                render={({ field }) => (
                  <Input
                    label="UF"
                    autoCapitalize="characters"
                    value={field.value}
                    onChangeText={field.onChange}
                    error={errors.state?.message}
                  />
                )}
              />
            </div>
            <div className={cx('stack', styles.flex)}>
              <Controller
                control={control}
                name="postalCode"
                render={({ field }) => (
                  <Input
                    label="CEP"
                    keyboardType="number-pad"
                    value={field.value}
                    onChangeText={field.onChange}
                    error={errors.postalCode?.message}
                  />
                )}
              />
            </div>
          </div>
          <Controller
            control={control}
            name="complement"
            render={({ field }) => (
              <Input
                label="Complemento (opcional)"
                value={field.value}
                onChangeText={field.onChange}
              />
            )}
          />
        </Card>
      ) : null}

      {step === 1 ? (
        <Card>
          <span className={cx(uiStyles.muted)}>
            Ative os dias e informe quantos veículos podem ser atendidos em cada um.
          </span>
          {days.map((day) => (
            <div key={day.weekday} className={cx('stack', styles.dayRow)}>
              <div className={cx('stack', styles.dayInfo)}>
                <span className={cx(uiStyles.body)}>{weekdayNames[day.weekday]}</span>
                <span className={cx(uiStyles.caption)}>{day.open ? 'Aberto' : 'Fechado'}</span>
              </div>
              {day.open ? (
                <NumericInput
                  aria-label={`Capacidade de ${weekdayNames[day.weekday]}`}
                  keyboardType="number-pad"

                  value={String(day.capacity)}
                  onChangeText={(value) =>
                    updateDay(day.weekday, { capacity: Number(value.replace(/\D/g, '')) || 0 })
                  }
                  className={cx(styles.capacityInput)}
                />
              ) : null}
              <Toggle
                aria-label={`Abrir ${weekdayNames[day.weekday]}`}
                value={day.open}
                onValueChange={(open) => updateDay(day.weekday, { open })}
              />
            </div>
          ))}
        </Card>
      ) : null}

      {step === 2 ? (
        <Card>
          <span className={cx(uiStyles.heading)}>{getValues('name')}</span>
          <span className={cx(uiStyles.muted)}>{getValues('phone')}</span>
          <span className={cx(uiStyles.body)}>
            {getValues('street')}, {getValues('number')} · {getValues('city')}/
            {getValues('state').toUpperCase()}
          </span>
          <div className={cx('stack', styles.divider)} />
          <span className={cx(uiStyles.heading)}>Funcionamento semanal</span>
          <span className={cx(uiStyles.muted)}>
            {days.filter((day) => day.open).length} dias abertos · capacidade configurada por dia
          </span>
          <span className={cx(styles.tip)}>
            Depois, cadastre os serviços oferecidos. Você poderá alterar todos esses dados nas
            configurações.
          </span>
        </Card>
      ) : null}

      <div className={cx('stack', styles.actions)}>
        {step > 0 ? (
          <Button
            title="Voltar"
            variant="secondary"
            onClick={() => setStep((current) => current - 1)}
          />
        ) : null}
        {step === 0 ? <Button title="Continuar" onClick={handleSubmit(() => setStep(1))} /> : null}
        {step === 1 ? (
          <Button
            title="Revisar"
            onClick={() => {
              if (days.some((day) => day.open && day.capacity < 1))
                return showDialog(
                  'Capacidade inválida',
                  'Dias abertos precisam ter ao menos uma vaga.',
                );
              setStep(2);
            }}
          />
        ) : null}
        {step === 2 ? (
          <Button title="Concluir configuração" onClick={finish} loading={saving} />
        ) : null}
      </div>
    </ScreenContainer>
  );
}
