import { expect, test, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { getTodayInTimeZone } from '../../src/domain/rules/reservations';
import { addCalendarDays } from '../../src/domain/rules/schedule';
const day = addCalendarDays(getTodayInTimeZone('America/Sao_Paulo'), 14);
const shortDate = (value: string) => value.split('-').reverse().join('/');
async function closeDialog(page: Page) {
  await page.getByRole('dialog').getByRole('button', { name: 'OK', exact: true }).click();
}
async function rpc(page: Page, op: string, args: unknown[]) {
  const response = await page.request.post('/api/app', { data: { op, args } });
  expect(response.ok()).toBe(true);
  return (await response.json()).data;
}
test('proprietário publica semana; cliente em outro navegador solicita; recusa libera vaga', async ({
  page,
  browser,
  browserName,
}) => {
  const email = `e2e-${randomUUID()}@example.com`;
  await page.goto('/sign-up');
  await page.getByLabel('Seu nome').fill('Proprietário Teste');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha', { exact: true }).fill('password-for-e2e');
  await page.getByRole('button', { name: 'Criar conta', exact: true }).click();
  await expect(page.getByText('CONFIGURAÇÃO 1 DE 3')).toBeVisible();
  for (const [label, value] of Object.entries({
    'Nome do estabelecimento': 'Lava Jato Compartilhado',
    Telefone: '11999991111',
    Rua: 'Rua Teste',
    Número: '1',
    Bairro: 'Centro',
    Cidade: 'São Paulo',
    UF: 'SP',
    CEP: '01001000',
  }))
    await page.getByLabel(label, { exact: true }).fill(value);
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByRole('button', { name: 'Revisar', exact: true }).click();
  await page.getByRole('button', { name: 'Concluir configuração' }).click();
  await expect(page.getByText('Lava Jato Compartilhado', { exact: true })).toBeVisible();
  for (const [name, price] of [
    ['Lavagem completa', '40'],
    ['Lavagem com cera', '60'],
  ]) {
    await page.goto('/services/new');
    await page.getByLabel('Nome', { exact: true }).fill(name!);
    await page.getByLabel('Preço em reais').fill(price!);
    await page.getByRole('button', { name: 'Salvar serviço' }).click();
    await closeDialog(page);
  }
  await page.goto('/schedule/new-week');
  await page.getByLabel('Data inicial da semana').fill(day);
  const first = page.getByRole('region', { name: shortDate(day), exact: true });
  const secondDate = addCalendarDays(day, 1);
  const second = page.getByRole('region', { name: shortDate(secondDate), exact: true });
  // Open precisely two days, each with one independent offered service.
  for (let index = 0; index < 7; index++) {
    const toggle = page.getByRole('switch', {
      name: `Abrir ${shortDate(addCalendarDays(day, index))}`,
      exact: true,
    });
    await toggle.setChecked(index < 2);
  }
  await page.getByLabel(`Vagas de ${shortDate(day)}`).fill('1');
  await page.getByLabel(`Vagas de ${shortDate(secondDate)}`).fill('2');
  await first.getByRole('checkbox', { name: /Lavagem com cera/ }).uncheck();
  await second.getByRole('checkbox', { name: /Lavagem completa/ }).uncheck();
  if (browserName === 'chromium') await page.evaluate(() => window.scrollTo(0, 0));
  if (browserName === 'chromium')
    await page.screenshot({ path: 'docs/visual-reference/shared/new-week.png', fullPage: true });
  await page.getByRole('button', { name: 'Criar semana', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Semana criada');
  await closeDialog(page);
  const link = await page.getByLabel('Link público', { exact: true }).inputValue();
  const customerContext = await browser.newContext({ viewport: { width: 320, height: 800 } });
  const customer = await customerContext.newPage();
  try {
    await customer.goto(link);
    await expect(
      customer.getByRole('heading', { name: 'Lava Jato Compartilhado', exact: true }),
    ).toBeVisible();
    await expect(customer.getByRole('navigation', { name: 'Navegação principal' })).toHaveCount(0);
    await expect(
      customer.getByRole('button', { name: new RegExp(shortDate(addCalendarDays(day, 2))) }),
    ).toHaveCount(0);
    await customer.getByRole('button', { name: new RegExp(shortDate(day)) }).click();
    await expect(customer.getByRole('radio', { name: /Lavagem com cera/ })).toHaveCount(0);
    await customer.getByRole('radio', { name: /Lavagem completa/ }).check();
    await customer.getByLabel('Seu nome', { exact: true }).fill('Cliente público');
    await customer.getByLabel('Telefone com DDD').fill('11988887777');
    await customer.getByLabel('Modelo e cor do veículo').fill('Honda Fit prata');
    await customer.getByLabel('Placa do veículo').fill('ABC1D23');
    for (const width of [320, 768, 1440]) {
      await customer.setViewportSize({ width, height: 900 });
      if (browserName === 'chromium')
        await customer.screenshot({
          path: `docs/visual-reference/shared/public-booking-${width}.png`,
          fullPage: true,
        });
      expect(
        await customer.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      ).toBe(true);
    }
    await customerContext.setOffline(true);
    await expect(
      customer.getByRole('button', { name: 'Solicitar agendamento', exact: true }),
    ).toBeDisabled();
    await expect(customer.getByText(/Você está sem internet/)).toBeVisible();
    await customerContext.setOffline(false);
    await customer.getByRole('button', { name: 'Solicitar agendamento', exact: true }).click();
    await expect(customer.getByText('Solicitação enviada!', { exact: true })).toBeVisible();
    const session = await rpc(page, 'auth.getSession', []);
    const reservations = await rpc(page, 'reservations.list', [
      session.activeEstablishmentId,
      { period: 'ALL' },
    ]);
    expect(reservations.items).toHaveLength(1);
    await page.goto(`/reservations/${reservations.items[0].id}`);
    await expect(page.getByText('Cliente público', { exact: true })).toBeVisible();
    await expect(page.getByText('Pendente', { exact: true })).toBeVisible();
    await customer.goto(link);
    await expect(customer.getByRole('button', { name: new RegExp(shortDate(day)) })).toBeDisabled();
    await page.getByRole('button', { name: 'Recusar reserva', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Confirmar', exact: true }).click();
    await closeDialog(page);
    await customer.reload();
    await expect(customer.getByRole('button', { name: new RegExp(shortDate(day)) })).toBeEnabled();
    await page.reload();
    await expect(page.getByText('Recusada', { exact: true })).toBeVisible();
    await page.goto('/schedule');
    await page.getByRole('button', { name: 'Novo dia', exact: true }).click();
    await page.getByLabel('Data do atendimento').fill(addCalendarDays(day, 20));
    await page.getByLabel(`Vagas de ${shortDate(addCalendarDays(day, 20))}`).fill('3');
    await page.getByRole('button', { name: 'Criar dia', exact: true }).click();
    await expect(page.getByRole('dialog')).toContainText('Dia criado');
    await closeDialog(page);
    await expect(page.getByText('3', { exact: true }).first()).toBeVisible();
  } finally {
    await customerContext.close();
  }
});
