import { useEffect, useState, useSyncExternalStore } from 'react';
import { useIsMutating } from '@tanstack/react-query';
import { useLocation } from 'react-router';
import { useRegisterSW } from 'virtual:pwa-register/react';
import {
  clearFormDirty,
  getActivity,
  hasPendingWrites,
  hasUnsavedChanges,
  subscribeActivity,
} from './activity';
import { showDialog } from '@/shared/ui/dialog';
import styles from './pwa.module.css';

interface InstallPrompt extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
export function PwaControls() {
  const [install, setInstall] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(
    () =>
      window.matchMedia('(display-mode: standalone)').matches ||
      !!(navigator as Navigator & { standalone?: boolean }).standalone,
  );
  const [instructions, setInstructions] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const { pathname } = useLocation();
  const mutations = useIsMutating();
  useSyncExternalStore(subscribeActivity, getActivity, getActivity);
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError: () => setRegistrationFailed(true),
  });
  const [registrationFailed, setRegistrationFailed] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deferred, setDeferred] = useState(false);
  const [deferredPath, setDeferredPath] = useState<string | null>(null);
  useEffect(() => {
    if (deferredPath !== null && deferredPath !== pathname) setDeferredPath(null);
  }, [pathname, deferredPath]);
  const [dismissedOffline, setDismissedOffline] = useState(false);
  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstall(event as InstallPrompt);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstall(null);
    };
    const onNetwork = () => setOnline(navigator.onLine);
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges() || hasPendingWrites()) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    window.addEventListener('online', onNetwork);
    window.addEventListener('offline', onNetwork);
    window.addEventListener('beforeunload', beforeUnload);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      window.removeEventListener('online', onNetwork);
      window.removeEventListener('offline', onNetwork);
      window.removeEventListener('beforeunload', beforeUnload);
    };
  }, []);
  // Revisit the deferred update in Settings; periodically check when the app returns to foreground.
  useEffect(() => {
    const check = () => {
      if (document.visibilityState === 'visible' && navigator.onLine)
        void navigator.serviceWorker
          ?.getRegistration()
          .then((reg) => reg?.update())
          .catch(() => undefined);
    };
    document.addEventListener('visibilitychange', check);
    return () => document.removeEventListener('visibilitychange', check);
  }, []);
  const busy = hasPendingWrites() || mutations > 0 || updating;
  const update = () => {
    if (busy) return;
    const apply = () => {
      if (hasPendingWrites() || mutations > 0) return;
      clearFormDirty();
      setUpdating(true);
      void updateServiceWorker(true).catch(() => {
        setUpdating(false);
        showDialog('Não foi possível atualizar', 'Tente novamente quando estiver conectado.');
      });
    };
    if (hasUnsavedChanges())
      showDialog(
        'Atualizar aplicativo?',
        'Há alterações ainda não salvas. Atualizar agora descartará essas alterações.',
        [
          { text: 'Continuar editando', style: 'cancel' },
          { text: 'Atualizar', onClick: apply },
        ],
      );
    else apply();
  };
  const installApp = async () => {
    if (!install) {
      setInstructions(true);
      return;
    }
    try {
      await install.prompt();
      const choice = await install.userChoice;
      if (choice.outcome === 'accepted') setInstall(null);
    } catch {
      setInstructions(true);
    }
  };
  const isApple =
    /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
  return (
    <aside className={styles.controls} aria-label="Aplicativo e conexão">
      {!online && <p role="status">Sem internet. Você pode continuar usando os dados locais.</p>}
      {offlineReady && !dismissedOffline && (
        <div role="status" className={styles.notice}>
          <span>Pronto para usar sem internet.</span>
          <button
            type="button"
            onClick={() => {
              setDismissedOffline(true);
              setOfflineReady(false);
            }}
            aria-label="Fechar aviso offline"
          >
            OK
          </button>
        </div>
      )}
      {registrationFailed && (
        <p role="status">
          Não foi possível preparar o uso offline. Reabra o aplicativo com conexão para tentar
          novamente.
        </p>
      )}
      {needRefresh && (!deferred || (pathname === '/settings' && deferredPath !== pathname)) && (
        <div className={styles.notice}>
          <span>Nova versão disponível.</span>
          <button type="button" onClick={update} disabled={busy}>
            Atualizar
          </button>
          <button
            type="button"
            onClick={() => {
              setDeferred(true);
              setDeferredPath(pathname);
            }}
          >
            Depois
          </button>
        </div>
      )}
      {!installed && (install || pathname === '/settings' || pathname === '/login') && (
        <button type="button" onClick={() => void installApp()}>
          Adicionar Lava On ao dispositivo
        </button>
      )}
      {instructions && !installed && (
        <div className={styles.instructions}>
          <p>
            {isApple
              ? 'No Safari, abra o menu Compartilhar e escolha “Adicionar à Tela de Início”. Se aparecer, ative “Abrir como App”.'
              : 'Abra o menu do navegador e procure “Instalar aplicativo” ou “Adicionar à tela inicial”. Se a opção não aparecer, continue usando o Lava On por este link.'}
          </p>
          <button type="button" onClick={() => setInstructions(false)}>
            Entendi
          </button>
        </div>
      )}
    </aside>
  );
}
