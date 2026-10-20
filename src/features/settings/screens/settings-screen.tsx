import styles from './settings-screen.module.css';
import { cx } from '@/shared/ui/classes';
import { Icon } from '@/shared/ui/icon';
import { useAppNavigation } from '@/app/navigation';

import { useEstablishment } from '@/data/query/hooks';
import { getErrorMessage } from '@/domain/errors';
import { colors } from '@/shared/theme';
import { ErrorState, LoadingState, ScreenContainer, uiStyles } from '@/shared/ui';

const items = [
  {
    title: 'Dados do estabelecimento',
    description: 'Nome, telefone e endereço',
    icon: 'business-outline' as const,
    route: '/settings/establishment' as const,
  },
  {
    title: 'Funcionamento',
    description: 'Dias e capacidade diária',
    icon: 'time-outline' as const,
    route: '/settings/operating' as const,
  },
  {
    title: 'Serviços',
    description: 'Preços e categorias de veículo',
    icon: 'water-outline' as const,
    route: '/services' as const,
  },
  {
    title: 'Conta',
    description: 'Perfil e acesso',
    icon: 'person-outline' as const,
    route: '/settings/account' as const,
  },
];

export default function SettingsScreen() {
  const router = useAppNavigation();
  const establishment = useEstablishment();
  if (establishment.isLoading) return <LoadingState />;
  if (establishment.error)
    return (
      <ErrorState
        message={getErrorMessage(establishment.error)}
        onRetry={() => void establishment.refetch()}
      />
    );
  return (
    <ScreenContainer>
      <div className={cx('stack')}>
        <span className={cx(uiStyles.title)}>Configurações</span>
        <span className={cx(uiStyles.muted)}>{establishment.data?.name}</span>
      </div>
      {items.map((item) => (
        <button
          type="button"
          key={item.title}
          onClick={() => router.push(item.route)}
          className={cx(styles.item)}
        >
          <div className={cx('stack', styles.icon)}>
            <Icon name={item.icon} size={22} color={colors.primary} />
          </div>
          <div className={cx('stack', styles.flex)}>
            <span className={cx(styles.title)}>{item.title}</span>
            <span className={cx(styles.description)}>{item.description}</span>
          </div>
          <Icon name="chevron-forward" size={20} color={colors.textMuted} />
        </button>
      ))}
      <div className={cx('stack', styles.future)}>
        <span className={cx(styles.futureTitle)}>Em breve</span>
        <span className={cx(styles.description)}>
          Notificações, página pública e plano da assinatura serão adicionados em etapas futuras.
        </span>
      </div>
    </ScreenContainer>
  );
}
