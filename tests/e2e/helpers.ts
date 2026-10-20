import { expect, type Page } from '@playwright/test';
export async function login(page: Page) {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toBeVisible();
}
export async function closeDialog(page: Page) {
  await page.getByRole('dialog').getByRole('button', { name: 'OK', exact: true }).click();
}
export function today() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
}
