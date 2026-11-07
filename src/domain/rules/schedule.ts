import { AppError } from '../errors.js';
import type { CalendarDate, SchedulePeriodInput } from '../models/index.js';

export function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function addCalendarDays(date: CalendarDate, days: number): CalendarDate {
  if (!isCalendarDate(date)) throw new AppError('VALIDATION', 'Informe uma data válida.');
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function getSchedulePeriod(input: SchedulePeriodInput, today: CalendarDate) {
  if (!isCalendarDate(input.startDate)) {
    throw new AppError('VALIDATION', 'Informe uma data válida.');
  }
  if (input.startDate < today) {
    throw new AppError('VALIDATION', 'Escolha hoje ou uma data futura para abrir a agenda.');
  }
  if (input.days.length !== 1 && input.days.length !== 7) {
    throw new AppError('VALIDATION', 'Crie um dia ou uma semana de sete dias.');
  }
  if (!input.days.some((day) => day.open)) {
    throw new AppError('VALIDATION', 'Abra pelo menos um dia para receber agendamentos.');
  }
  return input.days.map((day, index) => {
    if (
      typeof day.open !== 'boolean' ||
      (day.open && (!Number.isSafeInteger(day.capacity) || day.capacity <= 0))
    ) {
      throw new AppError(
        'VALIDATION',
        'Dias abertos precisam de uma quantidade inteira e positiva de vagas.',
      );
    }
    if (
      day.open &&
      (!Array.isArray(day.serviceIds) ||
        !day.serviceIds.length ||
        day.serviceIds.some((id) => typeof id !== 'string'))
    ) {
      throw new AppError('VALIDATION', 'Selecione os serviços de cada dia aberto.');
    }
    return {
      date: addCalendarDays(input.startDate, index),
      open: day.open,
      capacity: day.open ? day.capacity : 0,
      serviceIds: day.open ? [...new Set(day.serviceIds)] : [],
    };
  });
}
