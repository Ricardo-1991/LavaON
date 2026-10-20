import styles from './account-screen.module.css';
import { cx } from '@/shared/ui/classes';
import { showDialog } from '@/shared/ui/dialog';
import { useAppNavigation } from '@/app/navigation';
import React from 'react';

import { getErrorMessage } from '@/domain/errors';
import { useSession } from '@/providers/session-provider';

import { Button, Card, Input, ScreenContainer, uiStyles } from '@/shared/ui';

export default function AccountScreen() {
  const { session, updateOwnerName, signOut } = useSession();
  const [name, setName] = React.useState(session?.owner.name ?? '');
  const [saving, setSaving] = React.useState(false);
  const router = useAppNavigation();
  const save = async () => {
    try {
      setSaving(true);
      await updateOwnerName(name);
      showDialog('Perfil salvo', 'Seu nome foi atualizado.');
    } catch (error) {
      showDialog('Não foi possível salvar', getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };
  const logout = () =>
    showDialog('Sair da conta', 'Deseja encerrar esta sessão?', [
      { text: 'Voltar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onClick: async () => {
          await signOut();
          router.replace('/');
        },
      },
    ]);
  return (
    <ScreenContainer form>
      <div className={cx('stack')}>
        <span className={cx(uiStyles.title)}>Sua conta</span>
        <span className={cx(uiStyles.muted)}>Perfil usado para administrar o estabelecimento.</span>
      </div>
      <Card>
        <Input label="Nome" value={name} onChangeText={setName} />
        <div className={cx('stack', styles.field)}>
          <span className={cx(styles.label)}>E-mail</span>
          <span className={cx(styles.value)}>{session?.owner.email}</span>
        </div>
        <Button title="Salvar nome" onClick={save} loading={saving} />
      </Card>
      <Card>
        <span className={cx(uiStyles.heading)}>Acesso demonstrativo</span>
        <span className={cx(uiStyles.muted)}>
          Autenticação e alteração de senha reais serão conectadas ao backend.
        </span>
        <Button title="Sair da conta" variant="danger" onClick={logout} />
      </Card>
    </ScreenContainer>
  );
}
