import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Alert, StyleSheet, Switch, Text, View } from 'react-native';
import { z } from 'zod';

import { useSaveService, useService } from '@/data/query/hooks';
import { getErrorMessage } from '@/domain/errors';
import type { VehicleCategory } from '@/domain/models';
import { colors, spacing, typography } from '@/shared/theme';
import {
  Button,
  Card,
  FilterChip,
  Input,
  LoadingState,
  ScreenContainer,
  uiStyles,
} from '@/shared/ui';

const schema = z.object({
  name: z.string().trim().min(3, 'Informe o nome.'),
  price: z.string().min(1, 'Informe o preço.'),
  category: z.enum(['SMALL_CAR', 'LARGE_CAR']),
  active: z.boolean(),
});
type FormData = z.infer<typeof schema>;

function parsePrice(value: string): number {
  const normalized = value.replace(/[^\d,]/g, '').replace(',', '.');
  return Math.round(Number(normalized) * 100);
}

export default function ServiceFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const query = useService(id);
  const mutation = useSaveService(id);
  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', price: '', category: 'SMALL_CAR', active: true },
  });
  React.useEffect(() => {
    if (query.data)
      reset({
        name: query.data.name,
        price: (query.data.priceInCents / 100).toFixed(2).replace('.', ','),
        category: query.data.vehicleCategory,
        active: query.data.active,
      });
  }, [query.data, reset]);
  const category = useWatch({ control, name: 'category' });
  const active = useWatch({ control, name: 'active' });
  if (id && query.isLoading) return <LoadingState />;
  const submit = handleSubmit((values) => {
    const priceInCents = parsePrice(values.price);
    if (!Number.isInteger(priceInCents) || priceInCents <= 0)
      return Alert.alert('Preço inválido', 'Informe um valor maior que zero.');
    mutation.mutate(
      {
        name: values.name,
        vehicleCategory: values.category as VehicleCategory,
        priceInCents,
        active: values.active,
      },
      {
        onSuccess: () => {
          Alert.alert('Serviço salvo', 'As alterações foram armazenadas.');
          router.back();
        },
        onError: (error) => Alert.alert('Não foi possível salvar', getErrorMessage(error)),
      },
    );
  });
  return (
    <ScreenContainer>
      <View>
        <Text style={uiStyles.title}>{id ? 'Editar serviço' : 'Novo serviço'}</Text>
        <Text style={uiStyles.muted}>A reserva guardará uma cópia do nome e preço atuais.</Text>
      </View>
      <Card>
        <Controller
          control={control}
          name="name"
          render={({ field }) => (
            <Input
              label="Nome"
              placeholder="Ex.: Lavagem completa"
              value={field.value}
              onChangeText={field.onChange}
              error={errors.name?.message}
            />
          )}
        />
        <View style={styles.field}>
          <Text style={styles.label}>Categoria do veículo</Text>
          <View style={styles.row}>
            <FilterChip
              label="Carro pequeno"
              selected={category === 'SMALL_CAR'}
              onPress={() => setValue('category', 'SMALL_CAR')}
            />
            <FilterChip
              label="Carro grande"
              selected={category === 'LARGE_CAR'}
              onPress={() => setValue('category', 'LARGE_CAR')}
            />
          </View>
        </View>
        <Controller
          control={control}
          name="price"
          render={({ field }) => (
            <Input
              label="Preço em reais"
              placeholder="40,00"
              keyboardType="decimal-pad"
              value={field.value}
              onChangeText={field.onChange}
              error={errors.price?.message}
            />
          )}
        />
        <View style={styles.toggle}>
          <View style={styles.flex}>
            <Text style={styles.label}>Serviço ativo</Text>
            <Text style={uiStyles.caption}>Serviços inativos continuam no histórico.</Text>
          </View>
          <Switch
            value={active}
            onValueChange={(value) => setValue('active', value)}
            trackColor={{ true: colors.primary }}
          />
        </View>
      </Card>
      <Button title="Salvar serviço" onPress={submit} loading={mutation.isPending} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.sm },
  label: { ...typography.label, color: colors.text },
  row: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
});
