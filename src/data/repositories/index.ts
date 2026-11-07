import type { Repositories } from '@/domain/contracts/repositories';
import { AppError, type AppErrorCode } from '@/domain/errors';
import { beginWrite, clearFormDirty } from '@/pwa/activity';

// Local demonstration stays explicit; production never silently falls back to local data.
export const isSharedMode = import.meta.env.VITE_DATA_MODE === 'server';
export async function apiRequest<T>(op: string, args: unknown[]): Promise<T> {
  const mutating = !/\.(getSession|getById|getOperatingDays|list|getRange|getDay|getSummary)$/.test(
    op,
  );
  const finish = mutating ? beginWrite() : () => {};
  try {
    const response = await fetch('/api/app', {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ op, args }),
    });
    const result = (await response.json()) as { data: T; code?: AppErrorCode; message?: string };
    if (!response.ok)
      throw new AppError(
        result.code ?? 'PERSISTENCE',
        result.message ?? 'Não foi possível concluir a operação.',
      );
    if (mutating) clearFormDirty();
    return result.data;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      'PERSISTENCE',
      'Não foi possível conectar. Confira sua internet e tente novamente.',
    );
  } finally {
    finish();
  }
}
function remoteGroup(group: keyof Repositories) {
  return new Proxy(
    {},
    {
      get:
        (_target, method: string) =>
        (...args: unknown[]) => {
          if (group === 'auth' && method === 'signIn')
            return apiRequest('auth.signIn', [{ email: args[0], password: args[1] }]);
          if (group === 'auth' && method === 'requestPasswordRecovery')
            throw new AppError(
              'VALIDATION',
              'A recuperação por e-mail ainda não está disponível. Contate o responsável pelo Lava On.',
            );
          if (group === 'reservations' && method === 'list' && !args[1]) args[1] = {};
          return apiRequest(`${group}.${method}`, args);
        },
    },
  );
}
const remoteRepositories = Object.fromEntries(
  ['auth', 'establishments', 'services', 'reservations', 'schedule', 'dashboard'].map((group) => [
    group,
    remoteGroup(group as keyof Repositories),
  ]),
) as unknown as Repositories;
export const repositories: Repositories = isSharedMode
  ? remoteRepositories
  : (await import('./mock-repositories')).repositories;
