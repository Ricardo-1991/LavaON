import React from 'react';
import { Alert, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { useOperatingDays, useUpdateOperatingDays } from '@/data/query/hooks';
import { getErrorMessage } from '@/domain/errors';
import type { OperatingDay } from '@/domain/models';
import { colors, radius, spacing } from '@/shared/theme';
import { Button, Card, LoadingState, ScreenContainer, uiStyles } from '@/shared/ui';

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
  if (query.isLoading || !query.data) return <LoadingState />;
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
      return Alert.alert('Capacidade inválida', 'Dias abertos precisam de capacidade positiva.');
    mutation.mutate(days, {
      onSuccess: () => Alert.alert('Funcionamento salvo', 'A agenda foi recalculada.'),
      onError: (error) => Alert.alert('Não foi possível salvar', getErrorMessage(error)),
    });
  };
  return (
    <ScreenContainer>
      <View>
        <Text style={uiStyles.title}>Funcionamento</Text>
        <Text style={uiStyles.muted}>Alterações valem para hoje e para reservas futuras.</Text>
      </View>
      <Card>
        {days.map((day) => (
          <View key={day.weekday} style={styles.row}>
            <View style={styles.info}>
              <Text style={uiStyles.body}>{names[day.weekday]}</Text>
              <Text style={uiStyles.caption}>{day.open ? 'Capacidade diária' : 'Fechado'}</Text>
            </View>
            {day.open ? (
              <TextInput
                accessibilityLabel={`Capacidade de ${names[day.weekday]}`}
                style={styles.input}
                keyboardType="number-pad"
                value={String(day.capacity)}
                onChangeText={(value) =>
                  update(day.weekday, { capacity: Number(value.replace(/\D/g, '')) || 0 })
                }
              />
            ) : null}
            <Switch
              value={day.open}
              onValueChange={(open) => update(day.weekday, { open })}
              trackColor={{ true: colors.primary }}
            />
          </View>
        ))}
      </Card>
      <Text style={uiStyles.caption}>
        O aplicativo impede fechar ou reduzir um dia abaixo das reservas que ainda consomem
        capacidade.
      </Text>
      <Button title="Salvar funcionamento" onPress={save} loading={mutation.isPending} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  info: { flex: 1 },
  input: {
    width: 58,
    height: 40,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    textAlign: 'center',
    color: colors.text,
  },
});
