import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Alert, StyleSheet } from 'react-native';
import { z } from 'zod';

import { repositories } from '@/data/repositories/mock-repositories';
import { getErrorMessage } from '@/domain/errors';
import { AuthShell } from '@/features/auth/components/auth-shell';
import { colors, typography } from '@/shared/theme';
import { Button, Input } from '@/shared/ui';

const schema = z.object({ email: z.email('Informe um e-mail válido.') });
type FormData = z.infer<typeof schema>;

export default function ForgotPasswordScreen() {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { email: '' } });
  const submit = handleSubmit(async ({ email }) => {
    try {
      await repositories.auth.requestPasswordRecovery(email);
      Alert.alert(
        'Solicitação registrada',
        'No produto real, enviaremos as instruções por e-mail.',
      );
    } catch (error) {
      Alert.alert('Não foi possível continuar', getErrorMessage(error));
    }
  });
  return (
    <AuthShell
      title="Recupere seu acesso"
      subtitle="Nesta versão, simulamos o envio das instruções."
    >
      <Controller
        control={control}
        name="email"
        render={({ field }) => (
          <Input
            label="E-mail"
            autoCapitalize="none"
            keyboardType="email-address"
            value={field.value}
            onChangeText={field.onChange}
            error={errors.email?.message}
          />
        )}
      />
      <Button title="Solicitar recuperação" onPress={submit} loading={isSubmitting} />
      <Link href="/(auth)/login" style={styles.link}>
        Voltar para o login
      </Link>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  link: { ...typography.label, color: colors.primary, textAlign: 'center' },
});
