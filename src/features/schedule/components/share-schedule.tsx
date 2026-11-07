import { useActiveEstablishmentId } from '@/providers/session-provider';
import { isSharedMode } from '@/data/repositories';
import { Button, Card, uiStyles } from '@/shared/ui';
import { showDialog } from '@/shared/ui/dialog';
import styles from './share-schedule.module.css';
export function ShareSchedule() {
  const id = useActiveEstablishmentId();
  const url = `${window.location.origin}/book/${encodeURIComponent(id)}`;
  if (!isSharedMode)
    return (
      <p className={uiStyles.caption}>
        Demonstração local: para receber reservas de outros dispositivos, utilize a versão com banco
        compartilhado.
      </p>
    );
  return (
    <Card>
      <h3 className={uiStyles.heading}>Link para seus clientes</h3>
      <p className={uiStyles.caption}>
        Somente os dias criados nesta agenda serão publicados. Cada solicitação ocupa uma vaga até
        ser recusada ou cancelada.
      </p>
      <label className={styles.label}>
        Link público
        <input
          className={styles.link}
          readOnly
          value={url}
          onFocus={(event) => event.target.select()}
        />
      </label>
      <Button
        title="Copiar link da agenda"
        variant="secondary"
        onClick={() => {
          void navigator.clipboard
            ?.writeText(url)
            .then(() => showDialog('Link copiado', 'Compartilhe este link com seus clientes.'))
            .catch(() =>
              showDialog(
                'Copie o link',
                'Selecione o endereço no campo acima e copie para compartilhar.',
              ),
            );
          if (!navigator.clipboard)
            showDialog(
              'Copie o link',
              'Selecione o endereço no campo acima e copie para compartilhar.',
            );
        }}
      />
      <a className={styles.preview} href={url} target="_blank" rel="noopener noreferrer">
        Visualizar página pública
      </a>
    </Card>
  );
}
