import { afterEach, expect, test, vi } from 'vitest';
import { apiRequest } from '@/data/repositories';
import { clearFormDirty, hasPendingWrites, hasUnsavedChanges, markFormDirty } from '@/pwa/activity';
afterEach(() => {
  vi.unstubAllGlobals();
  clearFormDirty();
  window.history.replaceState({}, '', '/');
});
test('protege formulário público enquanto grava e só limpa alterações após sucesso confirmado', async () => {
  window.history.replaceState({}, '', '/book/test-establishment');
  markFormDirty();
  let resolve!: (response: Response) => void;
  vi.stubGlobal(
    'fetch',
    vi.fn(
      () =>
        new Promise<Response>((done) => {
          resolve = done;
        }),
    ),
  );
  const request = apiRequest('public.book', []);
  expect(hasPendingWrites()).toBe(true);
  expect(hasUnsavedChanges()).toBe(true);
  resolve(new Response(JSON.stringify({ data: { id: 'receipt' } }), { status: 200 }));
  await expect(request).resolves.toEqual({ id: 'receipt' });
  expect(hasPendingWrites()).toBe(false);
  expect(hasUnsavedChanges()).toBe(false);
});
test('falha de rede preserva alterações e libera bloqueio de gravação para permitir nova tentativa', async () => {
  window.history.replaceState({}, '', '/book/test-establishment');
  markFormDirty();
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
  await expect(apiRequest('public.book', [])).rejects.toThrow('Confira sua internet');
  expect(hasPendingWrites()).toBe(false);
  expect(hasUnsavedChanges()).toBe(true);
});
