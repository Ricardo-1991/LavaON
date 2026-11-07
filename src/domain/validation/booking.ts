import { z } from 'zod';
import { isCalendarDate } from '../rules/schedule.js';
const text = z.string().trim().min(1).max(200);
const id = z.string().min(1).max(150);
const date = z.string().refine(isCalendarDate, 'Informe uma data válida.');
export const publicBooking = z.object({
  date,
  serviceId: id,
  customerName: text.min(3),
  customerPhone: z
    .string()
    .trim()
    .max(30)
    .refine(
      (value) => /^\+?[\d\s().-]+$/.test(value) && value.replace(/\D/g, '').length >= 10,
      'Informe um telefone válido com DDD.',
    ),
  vehicleDescription: text.min(3),
  vehiclePlate: z
    .string()
    .trim()
    .transform((v) => v.replace(/[-\s]/g, '').toUpperCase())
    .refine((v) => /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(v), 'Informe uma placa válida.'),
  requestId: z.uuid(),
});
