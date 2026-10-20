import styles from './sign-up-screen.module.css';
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
  name: z.string().trim().min(3, 'Informe seu nome.'),
  email: z.email('Informe um e-mail válido.'),
  password: z.string().min(4, 'Informe ao menos 4 caracteres.'),
});
type FormData = z.infer<typeof schema>;

export default function SignUpScreen() {
  const { signUp } = useSession();
  const router = useAppNavigation();
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
      showDialog('Não foi possível criar a conta', getErrorMessage(error));
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
      <Button title="Criar conta" onClick={submit} loading={isSubmitting} />
      <span className={cx(styles.footer)}>
        Já possui conta?{' '}
        <Link to="/login" className={cx(styles.link)}>
          Entrar
        </Link>
      </span>
    </AuthShell>
  );
}
