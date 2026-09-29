import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { repositories } from '@/data/repositories/mock-repositories';
import type {
  CalendarDate,
  EstablishmentInput,
  OperatingDay,
  ReservationAction,
  ReservationFilters,
  ServiceInput,
} from '@/domain/models';
import { useActiveEstablishmentId } from '@/providers/session-provider';

export const queryKeys = {
  establishment: (id: string) => ['establishment', id] as const,
  operatingDays: (id: string) => ['operating-days', id] as const,
  services: (id: string) => ['services', id] as const,
  service: (id: string, serviceId: string) => ['services', id, serviceId] as const,
  reservations: (id: string) => ['reservations', id] as const,
  reservation: (id: string, reservationId: string) => ['reservations', id, reservationId] as const,
  schedule: (id: string) => ['schedule', id] as const,
  dashboard: (id: string) => ['dashboard', id] as const,
};

export function useEstablishment() {
  const id = useActiveEstablishmentId();
  return useQuery({
    queryKey: queryKeys.establishment(id),
    queryFn: () => repositories.establishments.getById(id),
  });
}

export function useOperatingDays() {
  const id = useActiveEstablishmentId();
  return useQuery({
    queryKey: queryKeys.operatingDays(id),
    queryFn: () => repositories.establishments.getOperatingDays(id),
  });
}

export function useUpdateEstablishment() {
  const id = useActiveEstablishmentId();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: EstablishmentInput) => repositories.establishments.update(id, input),
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.establishment(id) }),
  });
}

export function useUpdateOperatingDays() {
  const id = useActiveEstablishmentId();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (days: OperatingDay[]) => repositories.establishments.updateOperatingDays(id, days),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: queryKeys.operatingDays(id) }),
        client.invalidateQueries({ queryKey: queryKeys.schedule(id) }),
        client.invalidateQueries({ queryKey: queryKeys.dashboard(id) }),
      ]);
    },
  });
}

export function useServices() {
  const id = useActiveEstablishmentId();
  return useQuery({
    queryKey: queryKeys.services(id),
    queryFn: () => repositories.services.list(id),
  });
}

export function useService(serviceId?: string) {
  const id = useActiveEstablishmentId();
  return useQuery({
    queryKey: queryKeys.service(id, serviceId ?? ''),
    queryFn: () => repositories.services.getById(id, serviceId!),
    enabled: Boolean(serviceId),
  });
}

export function useSaveService(serviceId?: string) {
  const id = useActiveEstablishmentId();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: ServiceInput) =>
      serviceId
        ? repositories.services.update(id, serviceId, input)
        : repositories.services.create(id, input),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: queryKeys.services(id) }),
        client.invalidateQueries({ queryKey: queryKeys.dashboard(id) }),
      ]);
    },
  });
}

export function useToggleService() {
  const id = useActiveEstablishmentId();
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ serviceId, active }: { serviceId: string; active: boolean }) =>
      repositories.services.setActive(id, serviceId, active),
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.services(id) }),
  });
}

export function useReservations(filters: ReservationFilters) {
  const id = useActiveEstablishmentId();
  return useQuery({
    queryKey: [...queryKeys.reservations(id), filters],
    queryFn: () => repositories.reservations.list(id, filters),
  });
}

export function useReservation(reservationId?: string) {
  const id = useActiveEstablishmentId();
  return useQuery({
    queryKey: queryKeys.reservation(id, reservationId ?? ''),
    queryFn: () => repositories.reservations.getById(id, reservationId!),
    enabled: Boolean(reservationId),
  });
}

export function useReservationAction(reservationId: string) {
  const id = useActiveEstablishmentId();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (action: ReservationAction) =>
      repositories.reservations.performAction(id, reservationId, action),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: queryKeys.reservation(id, reservationId) }),
        client.invalidateQueries({ queryKey: queryKeys.reservations(id) }),
        client.invalidateQueries({ queryKey: queryKeys.schedule(id) }),
        client.invalidateQueries({ queryKey: queryKeys.dashboard(id) }),
      ]);
    },
  });
}

export function useSchedule(startDate: CalendarDate, days = 30) {
  const id = useActiveEstablishmentId();
  return useQuery({
    queryKey: [...queryKeys.schedule(id), startDate, days],
    queryFn: () => repositories.schedule.getRange(id, startDate, days),
  });
}

export function useDaySchedule(date?: CalendarDate) {
  const id = useActiveEstablishmentId();
  return useQuery({
    queryKey: [...queryKeys.schedule(id), 'day', date ?? ''],
    queryFn: () => repositories.schedule.getDay(id, date!),
    enabled: Boolean(date),
  });
}

export function useDashboard(date: CalendarDate) {
  const id = useActiveEstablishmentId();
  return useQuery({
    queryKey: [...queryKeys.dashboard(id), date],
    queryFn: () => repositories.dashboard.getSummary(id, date),
  });
}
