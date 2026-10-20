import { useEffect, useId, useRef, useState } from 'react';
import { getErrorMessage } from '@/domain/errors';
import styles from './ui.module.css';

export interface DialogAction {
  text: string;
  style?: 'cancel' | 'destructive' | 'default';
  onClick?: () => void;
}
interface Message {
  title: string;
  message: string;
  actions: DialogAction[];
}
let queue: Message[] = [];
const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((fn) => fn());
}
export function showDialog(
  title: string,
  message: string,
  actions: DialogAction[] = [{ text: 'OK' }],
): void {
  queue.push({ title, message, actions });
  emit();
}
export function DialogHost() {
  const [message, setMessage] = useState<Message | undefined>(() => queue[0]);
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  useEffect(() => {
    const refresh = () => setMessage(queue[0]);
    listeners.add(refresh);
    refresh();
    return () => {
      listeners.delete(refresh);
    };
  }, []);
  useEffect(() => {
    if (!message || !dialog.current) return;
    const previous = document.activeElement as HTMLElement | null;
    const current = dialog.current;
    current.showModal();
    current.querySelector<HTMLButtonElement>('button')?.focus();
    return () => {
      current.close();
      if (previous?.isConnected) previous.focus();
    };
  }, [message]);
  const close = (action?: DialogAction) => {
    queue = queue.slice(1);
    emit();
    void Promise.resolve(action?.onClick?.()).catch((error) =>
      showDialog('Não foi possível concluir', getErrorMessage(error)),
    );
  };
  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        event.preventDefault();
        close(message?.actions.find((a) => a.style === 'cancel'));
      }}
    >
      {message && (
        <>
          <h2 id={titleId}>{message.title}</h2>
          <p id={descriptionId}>{message.message}</p>
          <div className={styles.dialogActions}>
            {message.actions.map((action) => (
              <button
                key={action.text}
                type="button"
                className={action.style === 'destructive' ? styles.danger : styles.secondary}
                onClick={() => close(action)}
              >
                {action.text}
              </button>
            ))}
          </div>
        </>
      )}
    </dialog>
  );
}
