import { test, expect } from '@playwright/test';
import { closeDialog, login, today } from './helpers';

test('restaura sessão, mantém todas as telas responsivas e trata acessos diretos', async ({
  page,
}) => {
  await page.goto('/services/new');
  await expect(page).toHaveURL(/\/login$/);
  await login(page);
  const routes = [
    '/',
    '/schedule',
    '/reservations',
    '/settings',
    '/services',
    '/services/new',
    '/services/service-complete-small',
    '/settings/establishment',
    '/settings/operating',
    '/settings/account',
    '/reservations/reservation-1',
    '/schedule/' + today(),
  ];
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of routes) {
      await page.goto(route);
      await expect(page.locator('main h1')).toBeVisible();
      await expect(page.getByText('Carregando…', { exact: true })).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }
  }
  await page.goto('/services/inexistente');
  await expect(page.getByText('Serviço não encontrado.')).toBeVisible();
  await page.getByRole('button', { name: 'Voltar', exact: true }).click();
  await expect(page).toHaveURL(/\/services$/);
  await page.goto('/schedule/data-invalida');
  await expect(page.getByRole('alert')).toBeVisible();
  await page.goto('/pagina-inexistente');
  await expect(page.getByText('Esta página não foi encontrada.')).toBeVisible();
  await page.getByRole('button', { name: 'Voltar ao início' }).click();
  await expect(page).toHaveURL(/\/$/);
});

test('cadastro conclui as três etapas do onboarding', async ({ page }) => {
  await page.goto('/sign-up');
  await page.getByLabel('Seu nome').fill('Maria Souza');
  await page.getByLabel('E-mail').fill('maria@lavaon.com.br');
  await page.getByLabel('Senha', { exact: true }).fill('demo');
  await page.getByRole('button', { name: 'Criar conta', exact: true }).click();
  await expect(page.getByText('CONFIGURAÇÃO 1 DE 3')).toBeVisible();
  for (const [label, value] of Object.entries({
    'Nome do estabelecimento': 'Lava Jato da Maria',
    Telefone: '11999991111',
    Rua: 'Rua das Palmeiras',
    Número: '120',
    Bairro: 'Centro',
    Cidade: 'São Paulo',
    UF: 'SP',
    CEP: '01001000',
  }))
    await page.getByLabel(label, { exact: true }).fill(value);
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(page.getByText('CONFIGURAÇÃO 2 DE 3')).toBeVisible();
  await page.getByLabel('Capacidade de Segunda-feira').fill('0');
  await page.getByRole('button', { name: 'Revisar', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await closeDialog(page);
  await page.getByLabel('Capacidade de Segunda-feira').fill('15');
  await page.getByRole('button', { name: 'Revisar', exact: true }).click();
  await expect(page.getByText('CONFIGURAÇÃO 3 DE 3')).toBeVisible();
  await page.getByRole('button', { name: 'Concluir configuração' }).click();
  await expect(page.getByText('Lava Jato da Maria', { exact: true })).toBeVisible();
  await expect(page.getByText('Cadastre seu primeiro serviço')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Lava Jato da Maria', { exact: true })).toBeVisible();
});

test('ações de reserva, confirmações, filtros e datas futuras', async ({ page }) => {
  await login(page);
  await page.goto('/reservations/reservation-1');
  await page.getByRole('button', { name: 'Aceitar reserva', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Reserva atualizada');
  await closeDialog(page);
  await expect(page.getByText('Confirmada', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Cancelar reserva', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Voltar' }).click();
  await expect(page.getByText('Confirmada', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Cancelar reserva', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar' }).click();
  await closeDialog(page);
  await expect(page.getByText('Cancelada', { exact: true })).toBeVisible();
  await page.goto('/reservations/reservation-4');
  await expect(page.getByRole('button', { name: 'Concluir serviço', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Marcar falta', exact: true })).toHaveCount(0);
  await page.goto('/reservations?status=PENDING');
  await expect(page.getByRole('button', { name: 'Pendentes', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: 'Histórico', exact: true }).click();
  await expect(page.getByText('Marina Alves', { exact: true })).toBeVisible();
});

test('serviços validam preço, persistem e permitem alternar sem abrir edição', async ({ page }) => {
  await login(page);
  await page.goto('/services/new');
  await page.getByLabel('Nome', { exact: true }).fill('Lavagem premium');
  await page.getByLabel('Preço em reais').fill('0');
  await page.getByRole('button', { name: 'Salvar serviço' }).click();
  await expect(page.getByRole('dialog')).toContainText('Preço inválido');
  await closeDialog(page);
  await page.getByLabel('Preço em reais').fill('89,90');
  await page.getByRole('button', { name: 'Carro grande' }).click();
  await page.getByRole('button', { name: 'Salvar serviço' }).click();
  await closeDialog(page);
  await expect(page).toHaveURL(/\/services$/);
  await expect(page.getByRole('link', { name: /Lavagem premium/ })).toContainText('R$ 89,90');
  await page.getByRole('switch', { name: 'Desativar Lavagem premium' }).click();
  await expect(page).toHaveURL(/\/services$/);
  await expect(page.getByRole('switch', { name: 'Ativar Lavagem premium' })).not.toBeChecked();
  await page.reload();
  await expect(page.getByRole('switch', { name: 'Ativar Lavagem premium' })).not.toBeChecked();
  await page.getByRole('link', { name: /Lavagem premium/ }).click();
  await expect(page.getByLabel('Nome', { exact: true })).toHaveValue('Lavagem premium');
});

test('ajustes salvam perfil e estabelecimento e impedem capacidade inválida', async ({ page }) => {
  await login(page);
  await page.goto('/settings/account');
  await page.getByLabel('Nome', { exact: true }).fill('João Atualizado');
  await page.getByRole('button', { name: 'Salvar nome' }).click();
  await closeDialog(page);
  await page.reload();
  await expect(page.getByLabel('Nome', { exact: true })).toHaveValue('João Atualizado');
  await page.goto('/settings/establishment');
  await page.getByLabel('Nome', { exact: true }).fill('Lava Jato Atualizado');
  await page.getByRole('button', { name: 'Salvar alterações' }).click();
  await closeDialog(page);
  await page.goto('/');
  await expect(page.getByText('Lava Jato Atualizado', { exact: true })).toBeVisible();
  await page.goto('/settings/operating');
  const weekday = [
    'Domingo',
    'Segunda-feira',
    'Terça-feira',
    'Quarta-feira',
    'Quinta-feira',
    'Sexta-feira',
    'Sábado',
  ][new Date(today() + 'T12:00:00Z').getUTCDay()];
  await page.getByLabel(`Capacidade de ${weekday}`).fill('0');
  await page.getByRole('button', { name: 'Salvar funcionamento' }).click();
  await expect(page.getByRole('dialog')).toContainText('Capacidade inválida');
  await closeDialog(page);
  await page.getByLabel(`Capacidade de ${weekday}`).fill('1');
  await page.getByRole('button', { name: 'Salvar funcionamento' }).click();
  await expect(page.getByRole('dialog')).toContainText('Não foi possível salvar');
  await closeDialog(page);
  await page.getByLabel(`Capacidade de ${weekday}`).fill('20');
  await page.getByRole('button', { name: 'Salvar funcionamento' }).click();
  await expect(page.getByRole('dialog')).toContainText('Funcionamento salvo');
  await closeDialog(page);
  await page.goto('/settings/account');
  await page.getByRole('button', { name: 'Sair da conta', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Sair', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto('/reservations');
  await expect(page).toHaveURL(/\/login$/);
});

test('recuperação simulada, Enter no formulário e instruções de instalação', async ({ page }) => {
  await page.goto('/forgot-password');
  await page.getByLabel('E-mail').fill('joao@lavaon.com.br');
  await page.getByLabel('E-mail').press('Enter');
  await expect(page.getByRole('dialog')).toContainText('Solicitação registrada');
  await closeDialog(page);
  await page.goto('/login');
  await page.getByRole('button', { name: 'Adicionar Lava On ao dispositivo' }).click();
  await expect(page.getByRole('button', { name: 'Entendi' })).toBeVisible();
  await page.getByRole('button', { name: 'Entendi' }).click();
  await page.getByLabel('Senha', { exact: true }).press('Enter');
  await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toBeVisible();
});

test('dados e rotas ainda não visitadas funcionam offline', async ({ page, context }) => {
  await login(page);
  await page.waitForFunction(() => !!navigator.serviceWorker?.controller);
  await context.setOffline(true);
  await page.goto('/services/new');
  await page.getByLabel('Nome', { exact: true }).fill('Lavagem offline');
  await page.getByLabel('Preço em reais').fill('45,00');
  await page.getByRole('button', { name: 'Salvar serviço' }).click();
  await closeDialog(page);
  await page.reload();
  await expect(page.getByRole('link', { name: /Lavagem offline/ })).toBeVisible();
  await page.goto('/reservations/reservation-1');
  await page.getByRole('button', { name: 'Aceitar reserva', exact: true }).click();
  await closeDialog(page);
  await page.reload();
  await expect(page.getByText('Confirmada', { exact: true })).toBeVisible();
  await page.goto('/settings/account');
  await page.getByLabel('Nome', { exact: true }).fill('João Offline');
  await page.getByRole('button', { name: 'Salvar nome' }).click();
  await closeDialog(page);
  await page.reload();
  await expect(page.getByLabel('Nome', { exact: true })).toHaveValue('João Offline');
  await context.setOffline(false);
});

test('toque e orientação horizontal preservam a navegação', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
  });
  const page = await context.newPage();
  try {
    await page.goto('http://127.0.0.1:4173/login');
    await page.getByRole('button', { name: 'Entrar', exact: true }).tap();
    await expect(page.getByRole('navigation')).toBeVisible();
    await page.getByRole('link', { name: 'Agenda', exact: true }).tap();
    await expect(
      page.getByText('Capacidade diária dos próximos 30 dias.', { exact: true }),
    ).toBeVisible();
    await page.setViewportSize({ width: 844, height: 390 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.getByRole('link', { name: 'Ajustes', exact: true }).tap();
    await page.getByRole('button', { name: /Conta Perfil/ }).tap();
    await page.getByLabel('Nome', { exact: true }).fill('Nome pelo toque');
    await page.getByRole('button', { name: 'Salvar nome' }).tap();
    await closeDialog(page);
    await expect(page.getByLabel('Nome', { exact: true })).toHaveValue('Nome pelo toque');
  } finally {
    await context.close();
  }
});
