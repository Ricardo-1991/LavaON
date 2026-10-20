import { cx } from '@/shared/ui/classes';
import { showDialog } from '@/shared/ui/dialog';
import { zodResolver } from '@hookform/resolvers/zod';
import React from 'react';
import { Controller, useForm } from 'react-hook-form';

import { z } from 'zod';

import { useEstablishment, useUpdateEstablishment } from '@/data/query/hooks';
import { getErrorMessage } from '@/domain/errors';
import {
  Button,
  Card,
  Input,
  ErrorState,
  LoadingState,
  ScreenContainer,
  uiStyles,
} from '@/shared/ui';

const schema = z.object({
  name: z.string().trim().min(3),
  phone: z.string().trim().min(10),
  street: z.string().trim().min(2),
  number: z.string().trim().min(1),
  district: z.string().trim().min(2),
  city: z.string().trim().min(2),
  state: z.string().trim().length(2),
  postalCode: z.string().trim().min(8),
  complement: z.string(),
});
type FormData = z.infer<typeof schema>;

export default function EstablishmentScreen() {
  const query = useEstablishment();
  const mutation = useUpdateEstablishment();
  const {
    control,
    handleSubmit,
    reset,
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
  React.useEffect(() => {
    const item = query.data;
    if (item)
      reset({
        name: item.name,
        phone: item.phone,
        ...item.address,
        complement: item.address.complement ?? '',
      });
  }, [query.data, reset]);
  if (query.isLoading) return <LoadingState />;
  if (query.error || !query.data)
    return (
      <ErrorState message={getErrorMessage(query.error)} onRetry={() => void query.refetch()} />
    );
  const submit = handleSubmit((values) =>
    mutation.mutate(
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
      {
        onSuccess: () => showDialog('Dados salvos', 'O estabelecimento foi atualizado.'),
        onError: (error) => showDialog('Não foi possível salvar', getErrorMessage(error)),
      },
    ),
  );
  return (
    <ScreenContainer form>
      <div className={cx('stack')}>
        <TextTitle />
        <TextMuted />
      </div>
      <Card>
        <Controller
          control={control}
          name="name"
          render={({ field }) => (
            <Input
              label="Nome"
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
      <Button title="Salvar alterações" onClick={submit} loading={mutation.isPending} />
    </ScreenContainer>
  );
}

function TextTitle() {
  return <span className={cx(uiStyles.title)}>Dados do estabelecimento</span>;
}
function TextMuted() {
  return (
    <span className={cx(uiStyles.muted)}>
      Estas informações aparecerão na futura página pública.
    </span>
  );
}
