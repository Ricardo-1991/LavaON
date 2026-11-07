import { beforeAll, beforeEach, describe, expect, test } from 'vitest';
import { mockDatabase, type MockDatabaseState } from '@/data/mocks/storage/mock-database';
import { repositories } from '@/data/repositories/mock-repositories';
import { getTodayInTimeZone } from '@/domain/rules/reservations';
import { addCalendarDays } from '@/domain/rules/schedule';

const establishmentId = 'establishment-joao';
const today = () => getTodayInTimeZone('America/Sao_Paulo');
const date = (offset: number) => addCalendarDays(today(), offset);
let baseline: MockDatabaseState;
beforeAll(async () => {
  baseline = await mockDatabase.read((state) => state);
});
beforeEach(async () => {
  await mockDatabase.write((state) =>
    Object.assign(state, structuredClone(baseline), { sessionOwnerId: 'owner-joao' }),
  );
});

describe('criação de dias e semanas', () => {
  test('abre uma data fechada sem alterar o funcionamento das outras semanas', async () => {
    expect((await repositories.schedule.getDay(establishmentId, date(3))).capacity.open).toBe(
      false,
    );
    const [created] = await repositories.schedule.createPeriod(establishmentId, {
      startDate: date(3),
      days: [{ serviceIds: ['service-complete-small'], open: true, capacity: 9 }],
    });
    expect(created!.capacity).toMatchObject({ open: true, capacity: 9, available: 9 });
    expect(created!.configuration).toMatchObject({ date: date(3), capacity: 9 });
    expect((await repositories.schedule.getDay(establishmentId, date(10))).capacity.open).toBe(
      false,
    );
    expect(
      (await repositories.dashboard.getSummary(establishmentId, date(3))).capacity.capacity,
    ).toBe(9);
  });
  test('salva os sete dias com capacidades independentes e dias fechados', async () => {
    const days = Array.from({ length: 7 }, (_, index) => ({
      serviceIds: ['service-complete-small'],
      open: index !== 4,
      capacity: index + 5,
    }));
    const created = await repositories.schedule.createPeriod(establishmentId, {
      startDate: date(21),
      days,
    });
    expect(created.map((day) => day.capacity.capacity)).toEqual([5, 6, 7, 8, 0, 10, 11]);
    expect(created[4]!.capacity.open).toBe(false);
    expect(await mockDatabase.read((state) => state.scheduleDays.length)).toBe(7);
  });
  test('duplicidade rejeita toda a semana e preserva a agenda existente', async () => {
    await repositories.schedule.createPeriod(establishmentId, {
      startDate: date(44),
      days: [{ serviceIds: ['service-complete-small'], open: true, capacity: 17 }],
    });
    await expect(
      repositories.schedule.createPeriod(establishmentId, {
        startDate: date(42),
        days: Array.from({ length: 7 }, () => ({
          serviceIds: ['service-complete-small'],
          open: true,
          capacity: 8,
        })),
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION' });
    expect(await mockDatabase.read((state) => state.scheduleDays)).toHaveLength(1);
    expect((await repositories.schedule.getDay(establishmentId, date(44))).capacity.capacity).toBe(
      17,
    );
  });
  test('não permite capacidade abaixo das reservas já existentes', async () => {
    const before = await repositories.schedule.getDay(establishmentId, today());
    await expect(
      repositories.schedule.createPeriod(establishmentId, {
        startDate: today(),
        days: [
          {
            serviceIds: ['service-complete-small'],
            open: true,
            capacity: before.capacity.consumed - 1,
          },
        ],
      }),
    ).rejects.toMatchObject({ code: 'CAPACITY_CONFLICT' });
    expect(await mockDatabase.read((state) => state.scheduleDays)).toHaveLength(0);
    const [created] = await repositories.schedule.createPeriod(establishmentId, {
      startDate: today(),
      days: [
        { serviceIds: ['service-complete-small'], open: true, capacity: before.capacity.consumed },
      ],
    });
    expect(created!.capacity.available).toBe(0);
    expect(created!.reservations).toEqual(before.reservations);
  });
  test('não fecha datas com reservas e reverte os outros dias do período', async () => {
    const days = Array.from({ length: 7 }, () => ({
      serviceIds: ['service-complete-small'],
      open: true,
      capacity: 15,
    }));
    days[1] = { serviceIds: [], open: false, capacity: 0 };
    await expect(
      repositories.schedule.createPeriod(establishmentId, { startDate: today(), days }),
    ).rejects.toMatchObject({ code: 'CAPACITY_CONFLICT' });
    expect(await mockDatabase.read((state) => state.scheduleDays)).toHaveLength(0);
  });
  test('bloqueia acesso a outro estabelecimento', async () => {
    await expect(
      repositories.schedule.createPeriod('establishment-pedro', {
        startDate: date(7),
        days: [{ serviceIds: ['service-complete-small'], open: true, capacity: 10 }],
      }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });
  test('duas criações simultâneas não duplicam a mesma data', async () => {
    const input = {
      startDate: date(12),
      days: [{ serviceIds: ['service-complete-small'], open: true, capacity: 10 }],
    };
    const attempts = await Promise.allSettled([
      repositories.schedule.createPeriod(establishmentId, input),
      repositories.schedule.createPeriod(establishmentId, input),
    ]);
    expect(attempts.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(attempts.filter((result) => result.status === 'rejected')).toHaveLength(1);
    expect(await mockDatabase.read((state) => state.scheduleDays)).toHaveLength(1);
  });
  test('a agenda personalizada mantém capacidade quando o padrão semanal muda', async () => {
    await repositories.schedule.createPeriod(establishmentId, {
      startDate: today(),
      days: [{ serviceIds: ['service-complete-small'], open: true, capacity: 20 }],
    });
    const days = await repositories.establishments.getOperatingDays(establishmentId);
    const weekday = new Date(`${today()}T12:00:00Z`).getUTCDay();
    await repositories.establishments.updateOperatingDays(
      establishmentId,
      days.map((day) => (day.weekday === weekday ? { ...day, capacity: 2 } : day)),
    );
    expect((await repositories.schedule.getDay(establishmentId, today())).capacity.capacity).toBe(
      20,
    );
  });
});
