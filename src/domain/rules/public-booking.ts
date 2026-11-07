import { AppError } from '../errors.js';
import type { BookingReceipt, PublicBookingInput, PublicSchedule } from '../models/index.js';
import type { ApplicationState } from '../models/state.js';
import { getTodayInTimeZone, isCapacityConsuming } from './reservations.js';

export function publicAvailability(
  state: ApplicationState,
  establishmentId: string,
): PublicSchedule {
  const establishment = state.establishments.find((item) => item.id === establishmentId);
  if (!establishment)
    throw new AppError('NOT_FOUND', 'Agenda não encontrada. Confira o link com o estabelecimento.');
  const today = getTodayInTimeZone(establishment.timeZone);
  return {
    establishment: {
      id: establishment.id,
      name: establishment.name,
      phone: establishment.phone,
      address: establishment.address,
    },
    days: state.scheduleDays
      .filter((day) => day.establishmentId === establishmentId && day.open && day.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((day) => {
        const consumed = state.reservations.filter(
          (r) =>
            r.establishmentId === establishmentId &&
            r.serviceDate === day.date &&
            isCapacityConsuming(r.status),
        ).length;
        return {
          date: day.date,
          capacity: day.capacity,
          available: Math.max(0, day.capacity - consumed),
          services: state.services.filter(
            (service) =>
              service.establishmentId === establishmentId &&
              service.active &&
              day.serviceIds?.includes(service.id),
          ),
        };
      }),
  };
}

// Call only inside a transaction holding the owner's state row lock.
export function createPublicBooking(
  state: ApplicationState,
  establishmentId: string,
  input: PublicBookingInput,
): BookingReceipt {
  const day = publicAvailability(state, establishmentId).days.find(
    (day) => day.date === input.date,
  );
  const service = day?.services.find((service) => service.id === input.serviceId);
  if (!day || !service)
    throw new AppError('VALIDATION', 'Este dia ou serviço não está disponível para agendamento.');
  if (!day.available)
    throw new AppError(
      'CAPACITY_CONFLICT',
      'As vagas deste dia acabaram. Escolha outro dia disponível.',
    );
  if (
    state.reservations.some(
      (r) =>
        r.establishmentId === establishmentId &&
        r.serviceDate === input.date &&
        r.snapshot.vehiclePlate === input.vehiclePlate &&
        isCapacityConsuming(r.status),
    )
  ) {
    throw new AppError(
      'VALIDATION',
      'Este veículo já possui uma reserva para esse dia. Entre em contato com o estabelecimento.',
    );
  }
  const customer = {
    id: crypto.randomUUID(),
    establishmentId,
    name: input.customerName,
    phone: input.customerPhone,
  };
  const vehicle = {
    id: crypto.randomUUID(),
    establishmentId,
    customerId: customer.id,
    description: input.vehicleDescription,
    plate: input.vehiclePlate,
    category: service.vehicleCategory,
  };
  const reservation = {
    id: crypto.randomUUID(),
    establishmentId,
    customerId: customer.id,
    vehicleId: vehicle.id,
    serviceId: service.id,
    serviceDate: input.date,
    status: 'PENDING' as const,
    snapshot: {
      customerName: customer.name,
      customerPhone: customer.phone,
      vehicleDescription: vehicle.description,
      vehiclePlate: vehicle.plate,
      vehicleCategory: vehicle.category,
      serviceName: service.name,
      priceInCents: service.priceInCents,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  state.customers.push(customer);
  state.vehicles.push(vehicle);
  state.reservations.push(reservation);
  return {
    id: reservation.id,
    serviceDate: reservation.serviceDate,
    serviceName: service.name,
    priceInCents: service.priceInCents,
    status: 'PENDING',
  };
}
