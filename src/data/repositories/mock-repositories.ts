import { addDays, format } from 'date-fns';

import { mockDatabase, type MockDatabaseState } from '@/data/mocks/storage/mock-database';
import type { Repositories } from '@/domain/contracts/repositories';
import { AppError } from '@/domain/errors';
import type {
  CalendarDate,
  EstablishmentInput,
  Reservation,
  ReservationFilters,
  ReservationStatusFilter,
  ServiceInput,
  Session,
} from '@/domain/models';
import {
  calculateDailyCapacity,
  getTodayInTimeZone,
  isCapacityConsuming,
  transitionReservation,
} from '@/domain/rules/reservations';

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function requireEstablishment(state: MockDatabaseState, establishmentId: string) {
  const establishment = state.establishments.find((item) => item.id === establishmentId);
  if (!establishment) throw new AppError('NOT_FOUND', 'Estabelecimento não encontrado.');
  const authorized =
    state.sessionOwnerId &&
    state.memberships.some(
      (membership) =>
        membership.ownerId === state.sessionOwnerId &&
        membership.establishmentId === establishmentId,
    );
  if (!authorized) {
    throw new AppError('UNAUTHORIZED', 'Você não possui acesso a este estabelecimento.');
  }
  return establishment;
}

function buildSession(state: MockDatabaseState, ownerId: string): Session {
  const owner = state.owners.find((item) => item.id === ownerId);
  if (!owner) throw new AppError('UNAUTHORIZED', 'Sessão inválida.');
  const memberships = state.memberships.filter((item) => item.ownerId === ownerId);
  return { owner, memberships, activeEstablishmentId: memberships[0]?.establishmentId ?? null };
}

function getOperatingDay(state: MockDatabaseState, establishmentId: string, date: CalendarDate) {
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  return state.operatingDays.find(
    (day) => day.establishmentId === establishmentId && day.weekday === weekday,
  );
}

function getDaySchedule(state: MockDatabaseState, establishmentId: string, date: CalendarDate) {
  requireEstablishment(state, establishmentId);
  const reservations = state.reservations
    .filter((item) => item.establishmentId === establishmentId && item.serviceDate === date)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return {
    capacity: calculateDailyCapacity(
      establishmentId,
      date,
      getOperatingDay(state, establishmentId, date),
      reservations,
    ),
    reservations,
  };
}

function matchesStatus(status: Reservation['status'], filter: ReservationStatusFilter): boolean {
  if (filter === 'ALL') return true;
  if (filter === 'FINISHED') return status === 'COMPLETED' || status === 'NO_SHOW';
  return status === filter;
}

function validateEstablishment(input: EstablishmentInput) {
  if (!input.name.trim() || !input.phone.trim() || !input.address.city.trim()) {
    throw new AppError('VALIDATION', 'Preencha os dados obrigatórios do estabelecimento.');
  }
}

function validateService(input: ServiceInput) {
  if (!input.name.trim() || !Number.isInteger(input.priceInCents) || input.priceInCents <= 0) {
    throw new AppError('VALIDATION', 'Informe nome e preço válido para o serviço.');
  }
}

export const repositories: Repositories = {
  auth: {
    async getSession() {
      return mockDatabase.read((state) =>
        state.sessionOwnerId ? buildSession(state, state.sessionOwnerId) : null,
      );
    },
    async signIn(email) {
      const normalized = email.trim().toLowerCase();
      return mockDatabase.write((state) => {
        const owner = state.owners.find((item) => item.email.toLowerCase() === normalized);
        if (!owner) {
          throw new AppError(
            'UNAUTHORIZED',
            'Conta não encontrada. Use joao@lavaon.com.br para conhecer a demonstração.',
          );
        }
        state.sessionOwnerId = owner.id;
        return buildSession(state, owner.id);
      });
    },
    async signUp(input) {
      const normalized = input.email.trim().toLowerCase();
      if (!input.name.trim() || !normalized.includes('@')) {
        throw new AppError('VALIDATION', 'Informe nome e e-mail válidos.');
      }
      return mockDatabase.write((state) => {
        if (state.owners.some((owner) => owner.email.toLowerCase() === normalized)) {
          throw new AppError('VALIDATION', 'Já existe uma conta com este e-mail.');
        }
        const owner = {
          id: createId('owner'),
          name: input.name.trim(),
          email: normalized,
          createdAt: new Date().toISOString(),
        };
        state.owners.push(owner);
        state.sessionOwnerId = owner.id;
        return buildSession(state, owner.id);
      });
    },
    async requestPasswordRecovery(email) {
      if (!email.trim().includes('@')) {
        throw new AppError('VALIDATION', 'Informe um e-mail válido.');
      }
      await mockDatabase.read(() => undefined);
    },
    async signOut() {
      await mockDatabase.write((state) => {
        state.sessionOwnerId = null;
      });
    },
    async updateOwnerName(ownerId, name) {
      if (!name.trim()) throw new AppError('VALIDATION', 'Informe seu nome.');
      return mockDatabase.write((state) => {
        const owner = state.owners.find((item) => item.id === ownerId);
        if (!owner) throw new AppError('NOT_FOUND', 'Conta não encontrada.');
        owner.name = name.trim();
        return buildSession(state, ownerId);
      });
    },
  },
  establishments: {
    async getById(establishmentId) {
      return mockDatabase.read((state) => requireEstablishment(state, establishmentId));
    },
    async createForOwner(ownerId, input, days) {
      validateEstablishment(input);
      if (days.some((day) => day.open && (!Number.isInteger(day.capacity) || day.capacity <= 0))) {
        throw new AppError('VALIDATION', 'Dias abertos precisam de capacidade positiva.');
      }
      return mockDatabase.write((state) => {
        if (!state.owners.some((owner) => owner.id === ownerId)) {
          throw new AppError('UNAUTHORIZED', 'Conta não encontrada.');
        }
        const timestamp = new Date().toISOString();
        const establishment = {
          id: createId('establishment'),
          ...input,
          name: input.name.trim(),
          phone: input.phone.trim(),
          timeZone: 'America/Sao_Paulo',
          onboardingCompleted: true,
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        state.establishments.push(establishment);
        state.memberships.push({ ownerId, establishmentId: establishment.id, role: 'OWNER' });
        state.operatingDays.push(
          ...days.map((day) => ({ ...day, establishmentId: establishment.id })),
        );
        return establishment;
      });
    },
    async update(establishmentId, input) {
      validateEstablishment(input);
      return mockDatabase.write((state) => {
        const establishment = requireEstablishment(state, establishmentId);
        Object.assign(establishment, input, { updatedAt: new Date().toISOString() });
        return establishment;
      });
    },
    async getOperatingDays(establishmentId) {
      return mockDatabase.read((state) => {
        requireEstablishment(state, establishmentId);
        return state.operatingDays
          .filter((day) => day.establishmentId === establishmentId)
          .sort((a, b) => a.weekday - b.weekday);
      });
    },
    async updateOperatingDays(establishmentId, days) {
      return mockDatabase.write((state) => {
        const establishment = requireEstablishment(state, establishmentId);
        const today = getTodayInTimeZone(establishment.timeZone);
        for (const day of days) {
          if (day.open && (!Number.isInteger(day.capacity) || day.capacity <= 0)) {
            throw new AppError('VALIDATION', 'Dias abertos precisam de capacidade positiva.');
          }
          const affectedDates = new Set(
            state.reservations
              .filter(
                (reservation) =>
                  reservation.establishmentId === establishmentId &&
                  reservation.serviceDate >= today &&
                  new Date(`${reservation.serviceDate}T12:00:00Z`).getUTCDay() === day.weekday &&
                  isCapacityConsuming(reservation.status),
              )
              .map((reservation) => reservation.serviceDate),
          );
          for (const date of affectedDates) {
            const count = state.reservations.filter(
              (reservation) =>
                reservation.establishmentId === establishmentId &&
                reservation.serviceDate === date &&
                isCapacityConsuming(reservation.status),
            ).length;
            if (!day.open || day.capacity < count) {
              throw new AppError(
                'CAPACITY_CONFLICT',
                `A configuração conflita com ${count} reserva(s) em ${date}.`,
              );
            }
          }
        }
        state.operatingDays = state.operatingDays.filter(
          (day) => day.establishmentId !== establishmentId,
        );
        state.operatingDays.push(...days.map((day) => ({ ...day, establishmentId })));
        return days.map((day) => ({ ...day, establishmentId }));
      });
    },
  },
  services: {
    async list(establishmentId) {
      return mockDatabase.read((state) => {
        requireEstablishment(state, establishmentId);
        return state.services
          .filter((service) => service.establishmentId === establishmentId)
          .sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name));
      });
    },
    async getById(establishmentId, serviceId) {
      return mockDatabase.read((state) => {
        requireEstablishment(state, establishmentId);
        const service = state.services.find(
          (item) => item.id === serviceId && item.establishmentId === establishmentId,
        );
        if (!service) throw new AppError('NOT_FOUND', 'Serviço não encontrado.');
        return service;
      });
    },
    async create(establishmentId, input) {
      validateService(input);
      return mockDatabase.write((state) => {
        requireEstablishment(state, establishmentId);
        const timestamp = new Date().toISOString();
        const service = {
          id: createId('service'),
          establishmentId,
          ...input,
          name: input.name.trim(),
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        state.services.push(service);
        return service;
      });
    },
    async update(establishmentId, serviceId, input) {
      validateService(input);
      return mockDatabase.write((state) => {
        const service = state.services.find(
          (item) => item.id === serviceId && item.establishmentId === establishmentId,
        );
        if (!service) throw new AppError('NOT_FOUND', 'Serviço não encontrado.');
        Object.assign(service, input, {
          name: input.name.trim(),
          updatedAt: new Date().toISOString(),
        });
        return service;
      });
    },
    async setActive(establishmentId, serviceId, active) {
      return mockDatabase.write((state) => {
        const service = state.services.find(
          (item) => item.id === serviceId && item.establishmentId === establishmentId,
        );
        if (!service) throw new AppError('NOT_FOUND', 'Serviço não encontrado.');
        service.active = active;
        service.updatedAt = new Date().toISOString();
        return service;
      });
    },
  },
  reservations: {
    async list(establishmentId, filters: ReservationFilters = {}) {
      return mockDatabase.read((state) => {
        const establishment = requireEstablishment(state, establishmentId);
        const today = getTodayInTimeZone(establishment.timeZone);
        const period = filters.period ?? 'ALL';
        const status = filters.status ?? 'ALL';
        const page = filters.page ?? 1;
        const pageSize = filters.pageSize ?? 30;
        const matchesPeriod = (reservation: Reservation) => {
          if (period === 'TODAY') return reservation.serviceDate === today;
          if (period === 'UPCOMING') return reservation.serviceDate > today;
          if (period === 'HISTORY') return reservation.serviceDate < today;
          if (period === 'DATE') return reservation.serviceDate === filters.date;
          return true;
        };
        const items = state.reservations
          .filter(
            (reservation) =>
              reservation.establishmentId === establishmentId &&
              matchesPeriod(reservation) &&
              matchesStatus(reservation.status, status),
          )
          .sort(
            (a, b) =>
              a.serviceDate.localeCompare(b.serviceDate) || a.createdAt.localeCompare(b.createdAt),
          );
        const start = (page - 1) * pageSize;
        return { items: items.slice(start, start + pageSize), total: items.length, page, pageSize };
      });
    },
    async getById(establishmentId, reservationId) {
      return mockDatabase.read((state) => {
        requireEstablishment(state, establishmentId);
        const reservation = state.reservations.find(
          (item) => item.id === reservationId && item.establishmentId === establishmentId,
        );
        if (!reservation) throw new AppError('NOT_FOUND', 'Reserva não encontrada.');
        return reservation;
      });
    },
    async performAction(establishmentId, reservationId, action) {
      return mockDatabase.write((state) => {
        const establishment = requireEstablishment(state, establishmentId);
        const index = state.reservations.findIndex(
          (item) => item.id === reservationId && item.establishmentId === establishmentId,
        );
        if (index < 0) throw new AppError('NOT_FOUND', 'Reserva não encontrada.');
        try {
          const updated = transitionReservation(
            state.reservations[index]!,
            action,
            getTodayInTimeZone(establishment.timeZone),
          );
          state.reservations[index] = updated;
          return updated;
        } catch (error) {
          throw new AppError(
            'INVALID_TRANSITION',
            error instanceof Error ? error.message : 'Transição inválida.',
          );
        }
      });
    },
  },
  schedule: {
    async getRange(establishmentId, startDate, days) {
      return mockDatabase.read((state) => {
        requireEstablishment(state, establishmentId);
        const start = new Date(`${startDate}T12:00:00Z`);
        return Array.from({ length: days }, (_, index) =>
          getDaySchedule(state, establishmentId, format(addDays(start, index), 'yyyy-MM-dd')),
        );
      });
    },
    async getDay(establishmentId, date) {
      return mockDatabase.read((state) => getDaySchedule(state, establishmentId, date));
    },
  },
  dashboard: {
    async getSummary(establishmentId, date) {
      return mockDatabase.read((state) => {
        requireEstablishment(state, establishmentId);
        const day = getDaySchedule(state, establishmentId, date);
        const pendingReservations = state.reservations
          .filter(
            (reservation) =>
              reservation.establishmentId === establishmentId && reservation.status === 'PENDING',
          )
          .sort((a, b) => a.serviceDate.localeCompare(b.serviceDate));
        const upcomingReservations = state.reservations
          .filter(
            (reservation) =>
              reservation.establishmentId === establishmentId &&
              reservation.status === 'CONFIRMED' &&
              reservation.serviceDate > date,
          )
          .sort((a, b) => a.serviceDate.localeCompare(b.serviceDate))
          .slice(0, 4);
        return {
          date,
          capacity: day.capacity,
          pendingReservations,
          confirmedReservations: day.reservations.filter((item) => item.status === 'CONFIRMED'),
          upcomingReservations,
          activeServiceCount: state.services.filter(
            (service) => service.establishmentId === establishmentId && service.active,
          ).length,
        };
      });
    },
  },
};
