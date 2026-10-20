import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { repositories } from '@/data/repositories/mock-repositories';
import type { Session, SignUpInput } from '@/domain/models';

interface SessionContextValue {
  session: Session | null;
  ready: boolean;
  error: string | null;
  signIn(email: string): Promise<void>;
  signUp(input: SignUpInput): Promise<void>;
  signOut(): Promise<void>;
  refreshSession(): Promise<void>;
  updateOwnerName(name: string): Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const refreshSession = useCallback(async () => {
    try {
      setSession(await repositories.auth.getSession());
      setError(null);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Não foi possível acessar os dados locais.',
      );
    }
  }, []);

  useEffect(() => {
    let active = true;
    void repositories.auth
      .getSession()
      .then((restoredSession) => {
        if (active) setSession(restoredSession);
      })
      .catch((cause: unknown) => {
        if (active)
          setError(
            cause instanceof Error ? cause.message : 'Não foi possível acessar os dados locais.',
          );
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      session,
      ready,
      error,
      async signIn(email) {
        setSession(await repositories.auth.signIn(email));
        queryClient.clear();
      },
      async signUp(input) {
        setSession(await repositories.auth.signUp(input));
        queryClient.clear();
      },
      async signOut() {
        await repositories.auth.signOut();
        queryClient.clear();
        setSession(null);
      },
      refreshSession,
      async updateOwnerName(name) {
        if (!session) return;
        setSession(await repositories.auth.updateOwnerName(session.owner.id, name));
      },
    }),
    [queryClient, ready, error, refreshSession, session],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession deve ser usado dentro de SessionProvider.');
  return context;
}

export function useActiveEstablishmentId(): string {
  const { session } = useSession();
  if (!session?.activeEstablishmentId) {
    throw new Error('Não existe estabelecimento ativo.');
  }
  return session.activeEstablishmentId;
}
