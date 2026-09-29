import AsyncStorage from '@react-native-async-storage/async-storage';

import { repositories } from '@/data/repositories/mock-repositories';
import { AppError } from '@/domain/errors';
import { getTodayInTimeZone } from '@/domain/rules/reservations';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
}));

describe('repositórios mockados', () => {
  beforeAll(async () => {
    await AsyncStorage.clear();
    await repositories.auth.signIn('joao@lavaon.com.br');
  });

  test('isola os dados de estabelecimentos de outro proprietário', async () => {
    await expect(repositories.establishments.getById('establishment-joao')).resolves.toMatchObject({
      name: 'Lava Jato do João',
    });
    await expect(repositories.establishments.getById('establishment-pedro')).rejects.toMatchObject<
      Partial<AppError>
    >({ code: 'UNAUTHORIZED' });
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
