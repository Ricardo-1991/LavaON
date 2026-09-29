import type {
  CalendarDate,
  DailyCapacity,
  OperatingDay,
  Reservation,
  ReservationAction,
  ReservationStatus,
} from '@/domain/models';

export const RESERVATION_STATUS_META: Record<
  ReservationStatus,
  { label: string; tone: 'warning' | 'info' | 'danger' | 'success' | 'neutral' }
> = {
  PENDING: { label: 'Pendente', tone: 'warning' },
  CONFIRMED: { label: 'Confirmada', tone: 'info' },
  REJECTED: { label: 'Recusada', tone: 'danger' },
  CANCELLED: { label: 'Cancelada', tone: 'neutral' },
  COMPLETED: { label: 'Concluída', tone: 'success' },
  NO_SHOW: { label: 'Não compareceu', tone: 'danger' },
};

export const RESERVATION_ACTION_LABELS: Record<ReservationAction, string> = {
  ACCEPT: 'Aceitar reserva',
  REJECT: 'Recusar reserva',
  CANCEL: 'Cancelar reserva',
  COMPLETE: 'Marcar como concluída',
  MARK_NO_SHOW: 'Marcar falta',
};

const transitions: Record<
  ReservationStatus,
  Partial<Record<ReservationAction, ReservationStatus>>
> = {
  PENDING: { ACCEPT: 'CONFIRMED', REJECT: 'REJECTED', CANCEL: 'CANCELLED' },
  CONFIRMED: { CANCEL: 'CANCELLED', COMPLETE: 'COMPLETED', MARK_NO_SHOW: 'NO_SHOW' },
  REJECTED: {},
  CANCELLED: {},
  COMPLETED: {},
  NO_SHOW: {},
};

export function getTodayInTimeZone(timeZone: string, instant = new Date()): CalendarDate {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant);
}

export function isCapacityConsuming(status: ReservationStatus): boolean {
  return status === 'PENDING' || status === 'CONFIRMED' || status === 'COMPLETED';
}

export function getAllowedReservationActions(
  reservation: Reservation,
  today: CalendarDate,
): ReservationAction[] {
  if (reservation.status === 'PENDING') {
    return reservation.serviceDate < today ? ['REJECT', 'CANCEL'] : ['ACCEPT', 'REJECT', 'CANCEL'];
  }

  if (reservation.status === 'CONFIRMED') {
    return reservation.serviceDate <= today ? ['COMPLETE', 'MARK_NO_SHOW', 'CANCEL'] : ['CANCEL'];
  }

  return [];
}

export function transitionReservation(
  reservation: Reservation,
  action: ReservationAction,
  today: CalendarDate,
): Reservation {
  if (!getAllowedReservationActions(reservation, today).includes(action)) {
    throw new Error('Esta ação não é permitida para o estado ou data da reserva.');
  }

  const nextStatus = transitions[reservation.status][action];
  if (!nextStatus) {
    throw new Error('Transição de reserva inválida.');
  }

  return { ...reservation, status: nextStatus, updatedAt: new Date().toISOString() };
}

export function calculateDailyCapacity(
  establishmentId: string,
  date: CalendarDate,
  operatingDay: OperatingDay | undefined,
  reservations: Reservation[],
): DailyCapacity {
  const counts: Record<ReservationStatus, number> = {
    PENDING: 0,
    CONFIRMED: 0,
    REJECTED: 0,
    CANCELLED: 0,
    COMPLETED: 0,
    NO_SHOW: 0,
  };

  for (const reservation of reservations) {
    counts[reservation.status] += 1;
  }

  const open = operatingDay?.open ?? false;
  const capacity = open ? Math.max(0, operatingDay?.capacity ?? 0) : 0;
  const consumed = counts.PENDING + counts.CONFIRMED + counts.COMPLETED;
  const inconsistent = (!open && consumed > 0) || consumed > capacity;

  return {
    establishmentId,
    date,
    open,
    capacity,
    pending: counts.PENDING,
    confirmed: counts.CONFIRMED,
    completed: counts.COMPLETED,
    noShow: counts.NO_SHOW,
    cancelled: counts.CANCELLED,
    rejected: counts.REJECTED,
    consumed,
    available: Math.max(0, capacity - consumed),
    inconsistent,
  };
}
