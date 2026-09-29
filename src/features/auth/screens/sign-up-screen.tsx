import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Alert, StyleSheet, Text } from 'react-native';
import { z } from 'zod';

import { getErrorMessage } from '@/domain/errors';
import { AuthShell } from '@/features/auth/components/auth-shell';
import { useSession } from '@/providers/session-provider';
import { colors, typography } from '@/shared/theme';
import { Button, Input } from '@/shared/ui';

const schema = z.object({
  name: z.string().trim().min(3, 'Informe seu nome.'),
  email: z.email('Informe um e-mail válido.'),
  password: z.string().min(4, 'Informe ao menos 4 caracteres.'),
});
type FormData = z.infer<typeof schema>;

export default function SignUpScreen() {
  const { signUp } = useSession();
  const router = useRouter();
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', password: '' },
  });
  const submit = handleSubmit(async ({ name, email }) => {
    try {
      await signUp({ name, email });
      router.replace('/');
    } catch (error) {
      Alert.alert('Não foi possível criar a conta', getErrorMessage(error));
    }
  });
  return (
    <AuthShell
      title="Comece com o essencial"
      subtitle="Crie seu acesso e configure o estabelecimento no próximo passo."
    >
      <Controller
        control={control}
        name="name"
        render={({ field }) => (
          <Input
            label="Seu nome"
            autoCapitalize="words"
            value={field.value}
            onChangeText={field.onChange}
            error={errors.name?.message}
          />
        )}
      />
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
      <Button title="Criar conta" onPress={submit} loading={isSubmitting} />
      <Text style={styles.footer}>
        Já possui conta?{' '}
        <Link href="/(auth)/login" style={styles.link}>
          Entrar
        </Link>
      </Text>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  link: { ...typography.label, color: colors.primary },
  footer: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
});
