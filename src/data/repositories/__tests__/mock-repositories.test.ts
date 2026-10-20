import { beforeAll, describe, expect, test } from 'vitest';

import { repositories } from '@/data/repositories/mock-repositories';
import { getTodayInTimeZone } from '@/domain/rules/reservations';

describe('repositórios mockados', () => {
  beforeAll(async () => {
    await repositories.auth.signIn('joao@lavaon.com.br');
  });

  test('isola os dados de estabelecimentos de outro proprietário', async () => {
    await expect(repositories.establishments.getById('establishment-joao')).resolves.toMatchObject({
      name: 'Lava Jato do João',
    });
    await expect(repositories.establishments.getById('establishment-pedro')).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
  });

  test('aceitar uma pendência não consome capacidade duas vezes', async () => {
    const today = getTodayInTimeZone('America/Sao_Paulo');
    const before = await repositories.schedule.getDay('establishment-joao', today);
    await repositories.reservations.performAction('establishment-joao', 'reservation-1', 'ACCEPT');
    const after = await repositories.schedule.getDay('establishment-joao', today);
    expect(after.capacity.consumed).toBe(before.capacity.consumed);
    expect(after.capacity.pending).toBe(before.capacity.pending - 1);
    expect(after.capacity.confirmed).toBe(before.capacity.confirmed + 1);
  });

  test('marcar falta libera uma unidade de capacidade', async () => {
    const today = getTodayInTimeZone('America/Sao_Paulo');
    const before = await repositories.schedule.getDay('establishment-joao', today);
    await repositories.reservations.performAction(
      'establishment-joao',
      'reservation-2',
      'MARK_NO_SHOW',
    );
    const after = await repositories.schedule.getDay('establishment-joao', today);
    expect(after.capacity.consumed).toBe(before.capacity.consumed - 1);
    expect(after.capacity.available).toBe(before.capacity.available + 1);
  });
});
