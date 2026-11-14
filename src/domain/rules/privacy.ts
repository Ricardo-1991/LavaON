import { AppError } from '../errors.js';
import type { ApplicationState } from '../models/state.js';
export function anonymizeReservation(
  state: ApplicationState,
  establishmentId: string,
  reservationId: string,
) {
  const reservation = state.reservations.find(
    (r) => r.id === reservationId && r.establishmentId === establishmentId,
  );
  if (!reservation) throw new AppError('NOT_FOUND', 'Reserva não encontrada.');
  if (reservation.status === 'PENDING' || reservation.status === 'CONFIRMED')
    throw new AppError(
      'VALIDATION',
      'Finalize, recuse ou cancele a reserva antes de remover os dados pessoais.',
    );
  if (reservation.anonymizedAt) return reservation;
  reservation.snapshot = {
    ...reservation.snapshot,
    customerName: 'Cliente anonimizado',
    customerPhone: '',
    vehicleDescription: 'Veículo anonimizado',
    vehiclePlate: '',
  };
  reservation.anonymizedAt = new Date().toISOString();
  reservation.updatedAt = reservation.anonymizedAt;
  // Demo records may reuse customer/vehicle IDs. Do not erase another active record.
  if (
    !state.reservations.some(
      (r) => r.id !== reservationId && r.customerId === reservation.customerId && !r.anonymizedAt,
    )
  ) {
    const customer = state.customers.find(
      (c) => c.id === reservation.customerId && c.establishmentId === establishmentId,
    );
    if (customer) {
      customer.name = 'Cliente anonimizado';
      customer.phone = '';
    }
  }
  if (
    !state.reservations.some(
      (r) => r.id !== reservationId && r.vehicleId === reservation.vehicleId && !r.anonymizedAt,
    )
  ) {
    const vehicle = state.vehicles.find(
      (v) => v.id === reservation.vehicleId && v.establishmentId === establishmentId,
    );
    if (vehicle) {
      vehicle.description = 'Veículo anonimizado';
      vehicle.plate = '';
    }
  }
  return reservation;
}
