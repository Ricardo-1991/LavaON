import { useId, type CSSProperties, type ReactNode, type InputHTMLAttributes } from 'react';
import { cx } from './classes';
import { Icon, type IconName } from './icon';
import styles from './ui.module.css';
import typography from './typography.module.css';
import { markFormDirty } from '@/pwa/activity';

export const uiStyles = typography;
export function ScreenContainer({
  children,
  contentClassName,
  form = false,
}: {
  children: ReactNode;
  scroll?: boolean;
  contentClassName?: string;
  form?: boolean;
}) {
  const className = cx(styles.screen, contentClassName);
  return form ? (
    <form
      className={className}
      noValidate
      onChange={markFormDirty}
      onSubmit={(event) => {
        event.preventDefault();
        const buttons =
          event.currentTarget.querySelectorAll<HTMLButtonElement>('button[data-primary]');
        buttons[buttons.length - 1]?.click();
      }}
    >
      <button type="submit" hidden aria-hidden="true" tabIndex={-1}>
        Enviar formulário
      </button>
      {children}
    </form>
  ) : (
    <section className={className} onChange={markFormDirty}>
      {children}
    </section>
  );
}
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx(styles.card, className)}>{children}</div>;
}
export function Button({
  title,
  onClick,
  variant = 'primary',
  loading = false,
  disabled = false,
  icon,
}: {
  title: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  icon?: IconName;
}) {
  return (
    <button
      type="button"
      className={cx(styles.button, styles[variant])}
      data-primary={variant === 'primary' ? true : undefined}
      disabled={disabled || loading}
      aria-busy={loading}
      onClick={onClick}
    >
      {loading ? (
        <>
          <span className={styles.spinner} aria-hidden="true" />
          <span className="sr-only">{title}: aguarde</span>
        </>
      ) : (
        <>
          {icon && <Icon name={icon} size={18} />}
          <span>{title}</span>
        </>
      )}
    </button>
  );
}
type KeyboardType = 'email-address' | 'phone-pad' | 'number-pad' | 'decimal-pad' | 'default';
interface InputProps {
  label: string;
  error?: string;
  value?: string;
  onChangeText?: (value: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardType;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  multiline?: boolean;
}
export function Input({
  label,
  error,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  multiline,
}: InputProps) {
  const id = useId();
  const type = secureTextEntry
    ? 'password'
    : keyboardType === 'email-address'
      ? 'email'
      : keyboardType === 'phone-pad'
        ? 'tel'
        : 'text';
  const inputMode =
    keyboardType === 'number-pad'
      ? 'numeric'
      : keyboardType === 'decimal-pad'
        ? 'decimal'
        : undefined;
  const common = {
    id,
    value,
    placeholder,
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChangeText?.(event.target.value),
    className: cx(styles.input, error && styles.inputError),
    'aria-invalid': !!error,
    'aria-describedby': error ? `${id}-error` : undefined,
    autoCapitalize,
    autoComplete: secureTextEntry
      ? 'current-password'
      : type === 'email'
        ? 'email'
        : type === 'tel'
          ? 'tel'
          : undefined,
  };
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      {multiline ? (
        <textarea {...common} rows={3} />
      ) : (
        <input {...common} type={type} inputMode={inputMode} />
      )}
      {error && (
        <span id={`${id}-error`} className={styles.errorText} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
export function NumericInput({
  onChangeText,
  keyboardType: _keyboardType,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> & {
  onChangeText?: (value: string) => void;
  keyboardType?: KeyboardType;
}) {
  return (
    <input
      {...props}
      type="text"
      inputMode="numeric"
      onChange={(event) => onChangeText?.(event.target.value)}
    />
  );
}
export function Toggle({
  value,
  onValueChange,
  disabled,
  ...props
}: {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  'aria-label'?: string;
}) {
  return (
    <input
      type="checkbox"
      role="switch"
      className={styles.toggle}
      checked={value}
      disabled={disabled}
      aria-label={props['aria-label'] ?? 'Ativar dia'}
      onClick={(event) => event.stopPropagation()}
      onChange={(event) => onValueChange(event.target.checked)}
    />
  );
}
export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className={styles.sectionHeader}>
      <h2>{title}</h2>
      {action}
    </div>
  );
}
export function FilterChip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cx(styles.chip, selected && styles.chipSelected)}
      aria-pressed={selected}
      onClick={() => {
        markFormDirty();
        onClick();
      }}
    >
      {label}
    </button>
  );
}
export function LoadingState({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div className={styles.state} role="status">
      <span className={styles.spinner} aria-hidden="true" />
      <p>{label}</p>
    </div>
  );
}
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className={styles.state} role="alert">
      <Icon name="alert-circle-outline" size={32} color="#C53232" />
      <h2>Algo deu errado</h2>
      <p>{message}</p>
      {onRetry && <Button title="Tentar novamente" variant="secondary" onClick={onRetry} />}
    </div>
  );
}
export function EmptyState({
  title,
  description,
  icon = 'water-outline',
}: {
  title: string;
  description: string;
  icon?: IconName;
}) {
  return (
    <div className={styles.state}>
      <Icon name={icon} size={34} color="#65718A" />
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}
export type InlineStyle = CSSProperties;
