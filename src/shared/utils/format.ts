import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import type { CalendarDate, VehicleCategory } from '@/domain/models';

export function formatCurrency(valueInCents: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    valueInCents / 100,
  );
}

export function formatCalendarDate(date: CalendarDate, pattern = "EEEE, dd 'de' MMMM"): string {
  return format(parseISO(date), pattern, { locale: ptBR });
}

export function formatShortDate(date: CalendarDate): string {
  return format(parseISO(date), 'dd/MM/yyyy');
}

export function categoryLabel(category: VehicleCategory): string {
  return category === 'SMALL_CAR' ? 'Carro pequeno' : 'Carro grande';
}

export function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
