import styles from './auth-shell.module.css';
import { cx } from '@/shared/ui/classes';
import { Icon } from '@/shared/ui/icon';
import type { ReactNode } from 'react';

import { colors } from '@/shared/theme';
import { ScreenContainer } from '@/shared/ui';

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <ScreenContainer form contentClassName={styles.content}>
      <div className={cx('stack', styles.brand)}>
        <div className={cx('stack', styles.logo)}>
          <Icon name="water" size={28} color={colors.white} />
        </div>
        <span className={cx(styles.brandName)}>Lava On</span>
      </div>
      <div className={cx('stack', styles.heading)}>
        <h1 className={cx(styles.title)}>{title}</h1>
        <span className={cx(styles.subtitle)}>{subtitle}</span>
      </div>
      <div className={cx('stack', styles.form)}>{children}</div>
    </ScreenContainer>
  );
}
