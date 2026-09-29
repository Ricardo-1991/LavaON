import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Alert, StyleSheet, Text } from 'react-native';
import { z } from 'zod';

import { getErrorMessage } from '@/domain/errors';
import { AuthShell } from '@/features/auth/components/auth-shell';
import { useSession } from '@/providers/session-provider';
import { colors, spacing, typography } from '@/shared/theme';
import { Button, Input } from '@/shared/ui';

const schema = z.object({
  email: z.email('Informe um e-mail válido.'),
  password: z.string().min(4, 'Informe ao menos 4 caracteres.'),
});
type FormData = z.infer<typeof schema>;

export default function LoginScreen() {
  const { signIn } = useSession();
  const router = useRouter();
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: 'joao@lavaon.com.br', password: 'demo' },
  });
  const submit = handleSubmit(async ({ email }) => {
    try {
      await signIn(email);
      router.replace('/');
    } catch (error) {
      Alert.alert('Não foi possível entrar', getErrorMessage(error));
    }
  });
  return (
    <AuthShell
      title="Cuide da agenda sem complicação"
      subtitle="Entre para acompanhar as reservas do seu lava-jato."
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
      <Controller
        control={control}
        name="password"
        render={({ field }) => (
          <Input
            label="Senha"
            secureTextEntry
            value={field.value}
            onChangeText={field.onChange}
            error={errors.password?.message}
          />
        )}
      />
      <Link href="/(auth)/forgot-password" style={styles.link}>
        Esqueci minha senha
      </Link>
      <Button title="Entrar" onPress={submit} loading={isSubmitting} />
      <Text style={styles.demo}>
        Conta de demonstração já preenchida. A senha ainda é apenas visual.
      </Text>
      <Text style={styles.footer}>
        Ainda não tem conta?{' '}
        <Link href="/(auth)/sign-up" style={styles.link}>
          Criar conta
        </Link>
      </Text>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  link: { ...typography.label, color: colors.primary },
  demo: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
  footer: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
