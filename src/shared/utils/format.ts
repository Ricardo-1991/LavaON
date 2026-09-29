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
