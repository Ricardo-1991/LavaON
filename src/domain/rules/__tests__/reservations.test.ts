import type { OperatingDay, Reservation } from '@/domain/models';
import {
  calculateDailyCapacity,
  getAllowedReservationActions,
  isCapacityConsuming,
  transitionReservation,
} from '@/domain/rules/reservations';

const baseReservation: Reservation = {
  id: 'reservation-1',
  establishmentId: 'establishment-1',
  customerId: 'customer-1',
  vehicleId: 'vehicle-1',
  serviceId: 'service-1',
  serviceDate: '2026-09-13',
  status: 'PENDING',
  snapshot: {
    customerName: 'Cliente',
    customerPhone: '(11) 99999-9999',
    vehicleDescription: 'Carro prata',
    vehiclePlate: 'ABC1D23',
    vehicleCategory: 'SMALL_CAR',
    serviceName: 'Lavagem',
    priceInCents: 4000,
  },
  createdAt: '2026-09-12T12:00:00.000Z',
  updatedAt: '2026-09-12T12:00:00.000Z',
};

const operatingDay: OperatingDay = {
  establishmentId: 'establishment-1',
  weekday: 0,
  open: true,
  capacity: 15,
};

describe('regras de reservas', () => {
  test('define todas as transições permitidas no MVP', () => {
    expect(getAllowedReservationActions(baseReservation, '2026-09-13')).toEqual([
      'ACCEPT',
      'REJECT',
      'CANCEL',
    ]);
    expect(
      getAllowedReservationActions({ ...baseReservation, status: 'CONFIRMED' }, '2026-09-13'),
    ).toEqual(['COMPLETE', 'MARK_NO_SHOW', 'CANCEL']);
    expect(
      getAllowedReservationActions({ ...baseReservation, status: 'COMPLETED' }, '2026-09-13'),
    ).toEqual([]);
  });

  test('não aceita pendência passada nem finaliza reserva futura', () => {
    expect(getAllowedReservationActions(baseReservation, '2026-09-14')).toEqual([
      'REJECT',
      'CANCEL',
    ]);
    expect(
      getAllowedReservationActions(
        { ...baseReservation, status: 'CONFIRMED', serviceDate: '2026-09-14' },
        '2026-09-13',
      ),
    ).toEqual(['CANCEL']);
  });

  test('executa uma transição válida e rejeita uma inválida', () => {
    expect(transitionReservation(baseReservation, 'ACCEPT', '2026-09-13').status).toBe('CONFIRMED');
    expect(() => transitionReservation(baseReservation, 'COMPLETE', '2026-09-13')).toThrow(
      'não é permitida',
    );
  });

  test('pendentes, confirmadas e concluídas consomem capacidade', () => {
    expect(isCapacityConsuming('PENDING')).toBe(true);
    expect(isCapacityConsuming('CONFIRMED')).toBe(true);
    expect(isCapacityConsuming('COMPLETED')).toBe(true);
    expect(isCapacityConsuming('NO_SHOW')).toBe(false);
    expect(isCapacityConsuming('CANCELLED')).toBe(false);
    expect(isCapacityConsuming('REJECTED')).toBe(false);
  });

  test('mantém concluídas e libera faltas no cálculo diário', () => {
    const reservations: Reservation[] = [
      ...Array.from({ length: 8 }, (_, index) => ({
        ...baseReservation,
        id: `confirmed-${index}`,
        status: 'CONFIRMED' as const,
      })),
      ...Array.from({ length: 2 }, (_, index) => ({
        ...baseReservation,
        id: `pending-${index}`,
        status: 'PENDING' as const,
      })),
      ...Array.from({ length: 3 }, (_, index) => ({
        ...baseReservation,
        id: `completed-${index}`,
        status: 'COMPLETED' as const,
      })),
      { ...baseReservation, id: 'no-show', status: 'NO_SHOW' },
    ];
    const result = calculateDailyCapacity(
      'establishment-1',
      '2026-09-13',
      operatingDay,
      reservations,
    );
    expect(result.consumed).toBe(13);
    expect(result.available).toBe(2);
    expect(result.noShow).toBe(1);
  });

  test('nunca expõe disponibilidade negativa em dados inconsistentes', () => {
    const reservations = Array.from({ length: 16 }, (_, index) => ({
      ...baseReservation,
      id: `reservation-${index}`,
    }));
    const result = calculateDailyCapacity(
      'establishment-1',
      '2026-09-13',
      operatingDay,
      reservations,
    );
    expect(result.available).toBe(0);
    expect(result.inconsistent).toBe(true);
  });
});
