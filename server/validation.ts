import { z } from 'zod';
import { isCalendarDate } from '../src/domain/rules/schedule.js';

const text = z.string().trim().min(1).max(200);
const id = z.string().min(1).max(150);
const date = z.string().refine(isCalendarDate, 'Informe uma data válida.');
const capacity = z.number().int().min(0).max(10000);
const address = z.object({
  street: text,
  number: text,
  district: text,
  city: text,
  state: z.string().length(2),
  postalCode: text,
  complement: z.string().max(200).optional(),
});
const establishment = z.object({ name: text, phone: text, address });
const category = z.enum(['SMALL_CAR', 'LARGE_CAR']);
const service = z.object({
  name: text,
  vehicleCategory: category,
  priceInCents: z.number().int().positive().max(100000000),
  active: z.boolean(),
});
const operating = z.object({
  weekday: z.union([
    z.literal(0),
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
    z.literal(6),
  ]),
  open: z.boolean(),
  capacity,
});
const operatingWeek = z
  .array(operating)
  .length(7)
  .refine(
    (days) => new Set(days.map((d) => d.weekday)).size === 7,
    'Informe os sete dias da semana.',
  );
const filters = z
  .object({
    period: z.enum(['ALL', 'TODAY', 'UPCOMING', 'HISTORY', 'DATE']).optional(),
    status: z.enum(['ALL', 'PENDING', 'CONFIRMED', 'FINISHED', 'CANCELLED', 'REJECTED']).optional(),
    date: date.optional(),
    page: z.number().int().positive().max(100000).optional(),
    pageSize: z.number().int().positive().max(100).optional(),
  })
  .optional();
const operation = <T extends z.ZodType>(op: string, args: T) =>
  z.object({ op: z.literal(op), args });
export const ownerOperation = z.union([
  operation('auth.getSession', z.tuple([])),
  operation('auth.signOut', z.tuple([])),
  operation('auth.updateOwnerName', z.tuple([id, text])),
  operation('establishments.getById', z.tuple([id])),
  operation('establishments.createForOwner', z.tuple([id, establishment, operatingWeek])),
  operation('establishments.update', z.tuple([id, establishment])),
  operation('establishments.getOperatingDays', z.tuple([id])),
  operation(
    'establishments.updateOperatingDays',
    z.tuple([
      id,
      z
        .array(operating.extend({ establishmentId: id }))
        .length(7)
        .refine((days) => new Set(days.map((d) => d.weekday)).size === 7),
    ]),
  ),
  operation('services.list', z.tuple([id])),
  operation('services.getById', z.tuple([id, id])),
  operation('services.create', z.tuple([id, service])),
  operation('services.update', z.tuple([id, id, service])),
  operation('services.setActive', z.tuple([id, id, z.boolean()])),
  operation('reservations.list', z.tuple([id, filters])),
  operation('reservations.getById', z.tuple([id, id])),
  operation(
    'reservations.performAction',
    z.tuple([id, id, z.enum(['ACCEPT', 'REJECT', 'CANCEL', 'COMPLETE', 'MARK_NO_SHOW'])]),
  ),
  operation('schedule.getRange', z.tuple([id, date, z.number().int().positive().max(366)])),
  operation('schedule.getDay', z.tuple([id, date])),
  operation(
    'schedule.createPeriod',
    z.tuple([
      id,
      z.object({
        startDate: date,
        days: z
          .array(z.object({ open: z.boolean(), capacity, serviceIds: z.array(id).max(100) }))
          .min(1)
          .max(7),
      }),
    ]),
  ),
  operation('dashboard.getSummary', z.tuple([id, date])),
]);
export const credentials = z.object({
  email: z
    .email()
    .max(254)
    .transform((s) => s.toLowerCase()),
  password: z.string().min(8).max(128),
});
export const registration = credentials.extend({ name: text.min(3) });
export { publicBooking } from '../src/domain/validation/booking.js';
