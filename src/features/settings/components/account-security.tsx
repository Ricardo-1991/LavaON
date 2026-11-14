import { useState } from 'react';
import { apiRequest, isSharedMode } from '@/data/repositories';
import { useSession } from '@/providers/session-provider';
import { Button, Card, Input, uiStyles } from '@/shared/ui';
import { showDialog } from '@/shared/ui/dialog';
import { getErrorMessage } from '@/domain/errors';
export function AccountSecurity() {
  const { refreshSession, signOut } = useSession();
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  if (!isSharedMode) return null;
  const change = async () => {
    if (!current || password.length < 12 || password.length > 128 || password !== confirmation) {
      showDialog(
        'Confira a senha',
        'Informe a senha atual e repita a nova senha com pelo menos 12 caracteres.',
      );
      return;
    }
    setBusy(true);
    try {
      await apiRequest('auth.changePassword', [
        { currentPassword: current, newPassword: password },
      ]);
      setCurrent('');
      setPassword('');
      setConfirmation('');
      await refreshSession();
      showDialog(
        'Senha alterada',
        'As outras sessões foram encerradas. Use a nova senha no próximo acesso.',
      );
    } catch (error) {
      showDialog('Não foi possível alterar a senha', getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card>
      <h2 className={uiStyles.heading}>Segurança da conta</h2>
      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault();
          void change();
        }}
      >
        <button type="submit" hidden aria-hidden="true" tabIndex={-1}>
          Alterar senha
        </button>
        <fieldset
          disabled={busy}
          style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
          className="stack"
        >
          <legend className="sr-only">Alterar senha</legend>
          <Input label="Senha atual" secureTextEntry value={current} onChangeText={setCurrent} />
          <Input
            label="Nova senha"
            secureTextEntry
            autoComplete="new-password"
            value={password}
            onChangeText={setPassword}
          />
          <Input
            label="Repita a nova senha"
            secureTextEntry
            autoComplete="new-password"
            value={confirmation}
            onChangeText={setConfirmation}
          />
          <p className={uiStyles.caption}>
            Use pelo menos 12 caracteres. Alterar a senha encerra as demais sessões.
          </p>
          <Button title="Alterar senha" loading={busy} onClick={() => void change()} />
        </fieldset>
      </form>
      <Button
        title="Sair de todos os dispositivos"
        variant="secondary"
        disabled={busy}
        onClick={() =>
          showDialog(
            'Encerrar todos os acessos?',
            'Será necessário entrar novamente em cada dispositivo.',
            [
              { text: 'Voltar', style: 'cancel' },
              {
                text: 'Encerrar acessos',
                style: 'destructive',
                onClick: async () => {
                  setBusy(true);
                  try {
                    await apiRequest('auth.signOutAll', []);
                    await signOut();
                  } catch (error) {
                    showDialog('Não foi possível sair', getErrorMessage(error));
                    setBusy(false);
                  }
                },
              },
            ],
          )
        }
      />
    </Card>
  );
}
