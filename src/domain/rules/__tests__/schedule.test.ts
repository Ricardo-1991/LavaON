import { describe, expect, test } from 'vitest';
import { addCalendarDays, getSchedulePeriod, isCalendarDate } from '@/domain/rules/schedule';

const today = '2026-11-06';
describe('abertura de agendas', () => {
  test('valida datas reais e soma dias atravessando meses e anos', () => {
    expect(isCalendarDate('2026-02-30')).toBe(false);
    expect(isCalendarDate('2028-02-29')).toBe(true);
    expect(isCalendarDate('06/11/2026')).toBe(false);
    expect(addCalendarDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addCalendarDays('2028-02-28', 1)).toBe('2028-02-29');
  });
  test('abre sete dias consecutivos e zera capacidade de dias fechados', () => {
    const days = Array.from({ length: 7 }, (_, index) => ({
      serviceIds: ['service-complete-small'],
      open: index !== 2,
      capacity: 12,
    }));
    const period = getSchedulePeriod({ startDate: '2026-12-29', days }, today);
    expect(period).toHaveLength(7);
    expect(period[0]!.date).toBe('2026-12-29');
    expect(period[6]!.date).toBe('2027-01-04');
    expect(period[2]).toEqual({ date: '2026-12-31', open: false, capacity: 0, serviceIds: [] });
  });
  test('rejeita data passada, inválida e períodos incompletos', () => {
    expect(() =>
      getSchedulePeriod(
        {
          startDate: '2026-11-05',
          days: [{ serviceIds: ['service-complete-small'], open: true, capacity: 5 }],
        },
        today,
      ),
    ).toThrow('hoje ou uma data futura');
    expect(() =>
      getSchedulePeriod(
        {
          startDate: '2026-02-30',
          days: [{ serviceIds: ['service-complete-small'], open: true, capacity: 5 }],
        },
        today,
      ),
    ).toThrow('data válida');
    expect(() =>
      getSchedulePeriod(
        {
          startDate: today,
          days: [
            { serviceIds: ['service-complete-small'], open: true, capacity: 5 },
            { serviceIds: ['service-complete-small'], open: true, capacity: 5 },
          ],
        },
        today,
      ),
    ).toThrow('sete dias');
  });
  test.each([0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
    'rejeita a capacidade %s',
    (capacity) => {
      expect(() =>
        getSchedulePeriod(
          {
            startDate: today,
            days: [{ serviceIds: ['service-complete-small'], open: true, capacity }],
          },
          today,
        ),
      ).toThrow('inteira e positiva');
    },
  );
  test('exige pelo menos um dia aberto', () => {
    expect(() =>
      getSchedulePeriod(
        {
          startDate: today,
          days: Array.from({ length: 7 }, () => ({ serviceIds: [], open: false, capacity: 0 })),
        },
        today,
      ),
    ).toThrow('pelo menos um dia');
  });
});
