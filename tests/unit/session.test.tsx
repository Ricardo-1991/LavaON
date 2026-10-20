import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { SessionProvider, useSession } from '@/providers/session-provider';
import { repositories } from '@/data/repositories/mock-repositories';

function Probe() {
  const { error, ready, refreshSession } = useSession();
  return (
    <>
      <p>{ready ? (error ?? 'Dados disponíveis') : 'Preparando'}</p>
      <button onClick={() => void refreshSession()}>Tentar novamente</button>
    </>
  );
}
test('falha ao restaurar sessão é visível e permite tentar novamente', async () => {
  const mock = vi
    .spyOn(repositories.auth, 'getSession')
    .mockRejectedValueOnce(new Error('Armazenamento indisponível'))
    .mockResolvedValueOnce(null);
  render(
    <QueryClientProvider client={new QueryClient()}>
      <SessionProvider>
        <Probe />
      </SessionProvider>
    </QueryClientProvider>,
  );
  expect(await screen.findByText('Armazenamento indisponível')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
  expect(await screen.findByText('Dados disponíveis')).toBeVisible();
  mock.mockRestore();
});
