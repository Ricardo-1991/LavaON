import styles from './services-screen.module.css';
import { cx } from '@/shared/ui/classes';
import { showDialog } from '@/shared/ui/dialog';
import { Toggle } from '@/shared/ui';
import { Icon } from '@/shared/ui/icon';
import { Link, useAppNavigation } from '@/app/navigation';

import { useServices, useToggleService } from '@/data/query/hooks';
import { getErrorMessage } from '@/domain/errors';
import { colors } from '@/shared/theme';
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  ScreenContainer,
  uiStyles,
} from '@/shared/ui';
import { categoryLabel, formatCurrency } from '@/shared/utils/format';

export default function ServicesScreen() {
  const router = useAppNavigation();
  const query = useServices();
  const toggle = useToggleService();
  return (
    <ScreenContainer>
      <div className={cx('stack', styles.heading)}>
        <div className={cx('stack', styles.flex)}>
          <span className={cx(uiStyles.title)}>Serviços</span>
          <span className={cx(uiStyles.muted)}>Cada categoria e preço formam uma oferta.</span>
        </div>
        <Button title="Novo" icon="add" onClick={() => router.push('/services/new')} />
      </div>
      {query.isLoading ? (
        <LoadingState />
      ) : query.error ? (
        <ErrorState message={getErrorMessage(query.error)} onRetry={() => void query.refetch()} />
      ) : query.data?.length ? (
        query.data.map((service) => (
          <div key={service.id} className={cx(styles.item)}>
            <Link to={`/services/${service.id}`} className={styles.serviceLink}>
              <div className={cx('stack', styles.icon)}>
                <Icon name="water-outline" size={21} color={colors.primary} />
              </div>
              <div className={cx('stack', styles.flex)}>
                <span className={cx(styles.name)}>{service.name}</span>
                <span className={cx(styles.meta)}>
                  {categoryLabel(service.vehicleCategory)} · {formatCurrency(service.priceInCents)}
                </span>
              </div>
            </Link>
            <Toggle
              aria-label={`${service.active ? 'Desativar' : 'Ativar'} ${service.name}`}
              value={service.active}
              disabled={toggle.isPending}
              onValueChange={(active) =>
                toggle.mutate(
                  { serviceId: service.id, active },
                  {
                    onError: (error) =>
                      showDialog('Não foi possível alterar', getErrorMessage(error)),
                  },
                )
              }
            />
          </div>
        ))
      ) : (
        <EmptyState
          title="Nenhum serviço cadastrado"
          description="Crie as opções que seus clientes poderão reservar."
        />
      )}
    </ScreenContainer>
  );
}
