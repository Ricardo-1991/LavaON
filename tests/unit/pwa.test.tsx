import { act } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { beforeEach, expect, test, vi } from 'vitest';
import { PwaControls } from '@/pwa/pwa-controls';
import { DialogHost } from '@/shared/ui/dialog';
import { beginWrite, clearFormDirty, markFormDirty } from '@/pwa/activity';
const { update } = vi.hoisted(() => ({ update: vi.fn().mockResolvedValue(undefined) }));
vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    offlineReady: [false, vi.fn()],
    needRefresh: [true, vi.fn()],
    updateServiceWorker: update,
  }),
}));
beforeEach(() => {
  update.mockClear();
  clearFormDirty();
  history.replaceState({}, '', '/settings/account');
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
});
function mount() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/settings/account']}>
        <PwaControls />
        <DialogHost />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
test('impede atualização durante uma gravação', async () => {
  const finish = beginWrite();
  mount();
  expect(screen.getByRole('button', { name: 'Atualizar' })).toBeDisabled();
  act(finish);
  expect(screen.getByRole('button', { name: 'Atualizar' })).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: 'Atualizar' }));
  expect(update).toHaveBeenCalledWith(true);
});
test('permite continuar editando antes de atualizar', () => {
  markFormDirty();
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'Atualizar' }));
  expect(screen.getByRole('dialog')).toHaveTextContent('Há alterações ainda não salvas');
  fireEvent.click(screen.getByRole('button', { name: 'Continuar editando' }));
  expect(update).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Atualizar' }));
  fireEvent.click(screen.getByRole('dialog').querySelector('button:last-child')!);
  expect(update).toHaveBeenCalledWith(true);
});
