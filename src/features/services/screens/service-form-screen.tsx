import styles from './service-form-screen.module.css';
import { cx } from '@/shared/ui/classes';
import { showDialog } from '@/shared/ui/dialog';
import { Toggle } from '@/shared/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouteParams, useAppNavigation } from '@/app/navigation';
import React from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';

import { z } from 'zod';

import { useSaveService, useService } from '@/data/query/hooks';
import { getErrorMessage } from '@/domain/errors';
import type { VehicleCategory } from '@/domain/models';

import {
  Button,
  Card,
  FilterChip,
  Input,
  LoadingState,
  ErrorState,
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
  const { id } = useRouteParams<{ id?: string }>();
  const router = useAppNavigation();
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
  if (id && (query.error || !query.data))
    return (
      <ErrorState message={getErrorMessage(query.error)} onRetry={() => void query.refetch()} />
    );
  const submit = handleSubmit((values) => {
    const priceInCents = parsePrice(values.price);
    if (!Number.isInteger(priceInCents) || priceInCents <= 0)
      return showDialog('Preço inválido', 'Informe um valor maior que zero.');
    mutation.mutate(
      {
        name: values.name,
        vehicleCategory: values.category as VehicleCategory,
        priceInCents,
        active: values.active,
      },
      {
        onSuccess: () => {
          showDialog('Serviço salvo', 'As alterações foram armazenadas.');
          router.back();
        },
        onError: (error) => showDialog('Não foi possível salvar', getErrorMessage(error)),
      },
    );
  });
  return (
    <ScreenContainer form>
      <div className={cx('stack')}>
        <span className={cx(uiStyles.title)}>{id ? 'Editar serviço' : 'Novo serviço'}</span>
        <span className={cx(uiStyles.muted)}>
          A reserva guardará uma cópia do nome e preço atuais.
        </span>
      </div>
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
        <div className={cx('stack', styles.field)}>
          <span className={cx(styles.label)}>Categoria do veículo</span>
          <div className={cx('stack', styles.row)}>
            <FilterChip
              label="Carro pequeno"
              selected={category === 'SMALL_CAR'}
              onClick={() => setValue('category', 'SMALL_CAR')}
            />
            <FilterChip
              label="Carro grande"
              selected={category === 'LARGE_CAR'}
              onClick={() => setValue('category', 'LARGE_CAR')}
            />
          </div>
        </div>
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
        <div className={cx('stack', styles.toggle)}>
          <div className={cx('stack', styles.flex)}>
            <span className={cx(styles.label)}>Serviço ativo</span>
            <span className={cx(uiStyles.caption)}>Serviços inativos continuam no histórico.</span>
          </div>
          <Toggle
            aria-label="Serviço ativo"
            value={active}
            onValueChange={(value) => setValue('active', value)}
          />
        </div>
      </Card>
      <Button title="Salvar serviço" onClick={submit} loading={mutation.isPending} />
    </ScreenContainer>
  );
}
