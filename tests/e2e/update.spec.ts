import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtempSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, extname, resolve } from 'node:path';
import { closeDialog } from './helpers';

test('atualiza entre builds, protege formulário e preserva IndexedDB', async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== 'chromium',
    'A atualização de service worker é validada uma vez em Chromium.',
  );
  test.setTimeout(90_000);
  const temporary = mkdtempSync(join(tmpdir(), 'lava-on-update-'));
  let active = join(temporary, 'v1');
  for (const version of ['v1', 'v2'])
    execFileSync(
      process.execPath,
      ['node_modules/vite/bin/vite.js', 'build', '--outDir', join(temporary, version)],
      { env: { ...process.env, VITE_APP_VERSION: version }, stdio: 'pipe' },
    );
  const mime: Record<string, string> = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.webmanifest': 'application/manifest+json',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
  };
  const server = createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
    const candidate = resolve(active, '.' + pathname);
    const file =
      candidate.startsWith(active) && existsSync(candidate) && extname(candidate)
        ? candidate
        : join(active, 'index.html');
    response.setHeader('Content-Type', mime[extname(file)] ?? 'application/octet-stream');
    response.setHeader('Cache-Control', 'no-store');
    response.end(readFileSync(file));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Servidor indisponível');
  const origin = `http://127.0.0.1:${address.port}`;
  try {
    await page.goto(origin + '/login');
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(page.getByRole('navigation')).toBeVisible();
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    await page.goto(origin + '/settings/account');
    await page.getByLabel('Nome', { exact: true }).fill('Alteração protegida');
    active = join(temporary, 'v2');
    await page.evaluate(async () => {
      await (await navigator.serviceWorker.getRegistration())?.update();
    });
    await expect(page.getByText('Nova versão disponível.')).toBeVisible();
    await page.getByRole('button', { name: 'Depois', exact: true }).click();
    await expect(page.getByLabel('Nome', { exact: true })).toHaveValue('Alteração protegida');
    // Settings makes the deferred update discoverable again.
    await page.goto(origin + '/settings');
    await expect(page.getByText('Nova versão disponível.')).toBeVisible();
    await page.getByRole('button', { name: /Conta Perfil/ }).click();
    await page.getByLabel('Nome', { exact: true }).fill('Alteração protegida');
    await page.getByRole('button', { name: 'Atualizar', exact: true }).click();
    await expect(page.getByRole('dialog')).toContainText('Há alterações ainda não salvas');
    await page.getByRole('dialog').getByRole('button', { name: 'Continuar editando' }).click();
    await page.getByRole('button', { name: 'Salvar nome' }).click();
    await closeDialog(page);
    await page.getByRole('button', { name: 'Atualizar', exact: true }).click();
    await page.waitForFunction(() => document.documentElement.dataset.version === 'v2');
    await expect(page.getByLabel('Nome', { exact: true })).toHaveValue('Alteração protegida');
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    rmSync(temporary, { recursive: true, force: true });
  }
});
