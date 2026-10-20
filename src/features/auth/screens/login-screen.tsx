import styles from './login-screen.module.css';
import { cx } from '@/shared/ui/classes';
import { showDialog } from '@/shared/ui/dialog';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useAppNavigation } from '@/app/navigation';
import { Controller, useForm } from 'react-hook-form';

import { z } from 'zod';

import { getErrorMessage } from '@/domain/errors';
import { AuthShell } from '@/features/auth/components/auth-shell';
import { useSession } from '@/providers/session-provider';

import { Button, Input } from '@/shared/ui';

const schema = z.object({
  email: z.email('Informe um e-mail válido.'),
  password: z.string().min(4, 'Informe ao menos 4 caracteres.'),
});
type FormData = z.infer<typeof schema>;

export default function LoginScreen() {
  const { signIn } = useSession();
  const router = useAppNavigation();
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
      showDialog('Não foi possível entrar', getErrorMessage(error));
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
      <Link to="/forgot-password" className={cx(styles.link)}>
        Esqueci minha senha
      </Link>
      <Button title="Entrar" onClick={submit} loading={isSubmitting} />
      <span className={cx(styles.demo)}>
        Conta de demonstração já preenchida. A senha ainda é apenas visual.
      </span>
      <span className={cx(styles.footer)}>
        Ainda não tem conta?{' '}
        <Link to="/sign-up" className={cx(styles.link)}>
          Criar conta
        </Link>
      </span>
    </AuthShell>
  );
}
