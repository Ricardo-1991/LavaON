import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { z } from 'zod';

import { repositories } from '@/data/repositories/mock-repositories';
import { getErrorMessage } from '@/domain/errors';
import type { OperatingDay } from '@/domain/models';
import { useSession } from '@/providers/session-provider';
import { colors, radius, spacing, typography } from '@/shared/theme';
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
  const router = useRouter();
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
      Alert.alert('Não foi possível concluir', getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.top}>
        <Text style={styles.eyebrow}>CONFIGURAÇÃO {step + 1} DE 3</Text>
        <Text style={uiStyles.title}>
          {step === 0
            ? 'Conte sobre seu lava-jato'
            : step === 1
              ? 'Defina o funcionamento'
              : 'Tudo pronto para começar'}
        </Text>
        <View style={styles.progress}>
          <View style={[styles.progressFill, { width: `${((step + 1) / 3) * 100}%` }]} />
        </View>
      </View>

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
          <View style={styles.twoColumns}>
            <View style={styles.flex}>
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
            </View>
            <View style={styles.flex}>
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
            </View>
          </View>
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
          <View style={styles.twoColumns}>
            <View style={styles.flex}>
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
            </View>
            <View style={styles.flex}>
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
            </View>
          </View>
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
          <Text style={uiStyles.muted}>
            Ative os dias e informe quantos veículos podem ser atendidos em cada um.
          </Text>
          {days.map((day) => (
            <View key={day.weekday} style={styles.dayRow}>
              <View style={styles.dayInfo}>
                <Text style={uiStyles.body}>{weekdayNames[day.weekday]}</Text>
                <Text style={uiStyles.caption}>{day.open ? 'Aberto' : 'Fechado'}</Text>
              </View>
              {day.open ? (
                <TextInput
                  accessibilityLabel={`Capacidade de ${weekdayNames[day.weekday]}`}
                  keyboardType="number-pad"
                  style={styles.capacityInput}
                  value={String(day.capacity)}
                  onChangeText={(value) =>
                    updateDay(day.weekday, { capacity: Number(value.replace(/\D/g, '')) || 0 })
                  }
                />
              ) : null}
              <Switch
                value={day.open}
                onValueChange={(open) => updateDay(day.weekday, { open })}
                trackColor={{ true: colors.primary }}
              />
            </View>
          ))}
        </Card>
      ) : null}

      {step === 2 ? (
        <Card>
          <Text style={uiStyles.heading}>{getValues('name')}</Text>
          <Text style={uiStyles.muted}>{getValues('phone')}</Text>
          <Text style={uiStyles.body}>
            {getValues('street')}, {getValues('number')} · {getValues('city')}/
            {getValues('state').toUpperCase()}
          </Text>
          <View style={styles.divider} />
          <Text style={uiStyles.heading}>Funcionamento semanal</Text>
          <Text style={uiStyles.muted}>
            {days.filter((day) => day.open).length} dias abertos · capacidade configurada por dia
          </Text>
          <Text style={styles.tip}>
            Depois, cadastre os serviços oferecidos. Você poderá alterar todos esses dados nas
            configurações.
          </Text>
        </Card>
      ) : null}

      <View style={styles.actions}>
        {step > 0 ? (
          <Button
            title="Voltar"
            variant="secondary"
            onPress={() => setStep((current) => current - 1)}
          />
        ) : null}
        {step === 0 ? <Button title="Continuar" onPress={handleSubmit(() => setStep(1))} /> : null}
        {step === 1 ? (
          <Button
            title="Revisar"
            onPress={() => {
              if (days.some((day) => day.open && day.capacity < 1))
                return Alert.alert(
                  'Capacidade inválida',
                  'Dias abertos precisam ter ao menos uma vaga.',
                );
              setStep(2);
            }}
          />
        ) : null}
        {step === 2 ? (
          <Button title="Concluir configuração" onPress={finish} loading={saving} />
        ) : null}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  top: { gap: spacing.sm, marginTop: spacing.lg },
  eyebrow: { ...typography.label, color: colors.primary },
  progress: {
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    overflow: 'hidden',
    marginTop: spacing.sm,
  },
  progressFill: { height: '100%', backgroundColor: colors.primary },
  twoColumns: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
  dayRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  dayInfo: { flex: 1 },
  capacityInput: {
    width: 54,
    height: 40,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
    textAlign: 'center',
    color: colors.text,
  },
  divider: { height: 1, backgroundColor: colors.border },
  tip: {
    ...typography.body,
    color: colors.info,
    backgroundColor: colors.infoSoft,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  actions: { gap: spacing.sm },
});
