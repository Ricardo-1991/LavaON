import { beforeAll, beforeEach, afterAll, describe, expect, test } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import { migrate, getPool } from '../../server/database';
import {
  authenticate,
  bookPublic,
  getPublicSchedule,
  ownerRequest,
} from '../../server/application';
import { handleRequest } from '../../server/http';
import { getTodayInTimeZone } from '@/domain/rules/reservations';
import { addCalendarDays } from '@/domain/rules/schedule';
import type { BookingReceipt, DaySchedule, Establishment, Service, Session } from '@/domain/models';

const connection = process.env.TEST_DATABASE_URL;
if (
  !connection ||
  !['localhost', '127.0.0.1'].includes(new URL(connection).hostname) ||
  !new URL(connection).pathname.endsWith('/lavaon_test')
) {
  throw new Error(
    'Informe TEST_DATABASE_URL de um PostgreSQL local exclusivo com banco lavaon_test. Os testes apagam somente esse banco de teste.',
  );
}
process.env.DATABASE_URL = connection;
let token: string;
let ownerId: string;
let establishmentId: string;
let service: Service;
let otherService: Service;
let server: Server;
let baseUrl: string;
const startDate = () => addCalendarDays(getTodayInTimeZone('America/Sao_Paulo'), 7);
const rpc = <T = unknown>(op: string, args: unknown[] = [], session = token) =>
  ownerRequest(session, { op, args }) as Promise<T>;
const input = (index = 0, date = startDate(), serviceId = service.id) => ({
  date,
  serviceId,
  customerName: `Cliente ${index}`,
  customerPhone: '11999999999',
  vehicleDescription: 'Honda Fit prata',
  vehiclePlate: `ABC${String(index).padStart(4, '0')}`,
  requestId: randomUUID(),
});
async function open(capacity: number, days = 1) {
  return rpc<DaySchedule[]>('schedule.createPeriod', [
    establishmentId,
    {
      startDate: startDate(),
      days: Array.from({ length: days }, (_, index) => ({
        open: index !== 2,
        capacity,
        serviceIds: [index === 1 ? otherService.id : service.id],
      })),
    },
  ]);
}
beforeAll(async () => {
  await migrate();
  server = createServer((request, response) => {
    void handleRequest(request, response);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Servidor indisponível.');
  baseUrl = `http://127.0.0.1:${address.port}`;
});
beforeEach(async () => {
  await getPool().query('TRUNCATE lava_owners, lava_rate_limits CASCADE');
  const auth = await authenticate('signUp', {
    email: 'owner@example.com',
    name: 'Proprietário',
    password: 'password-for-tests',
  });
  token = auth.token;
  ownerId = auth.session!.owner.id;
  const establishment = await rpc<Establishment>('establishments.createForOwner', [
    ownerId,
    {
      name: 'Lava On Teste',
      phone: '11999999999',
      address: {
        street: 'Rua Teste',
        number: '1',
        district: 'Centro',
        city: 'São Paulo',
        state: 'SP',
        postalCode: '01001000',
      },
    },
    Array.from({ length: 7 }, (_, weekday) => ({ weekday, open: true, capacity: 10 })),
  ]);
  establishmentId = establishment.id;
  service = await rpc<Service>('services.create', [
    establishmentId,
    { name: 'Lavagem completa', vehicleCategory: 'SMALL_CAR', priceInCents: 4000, active: true },
  ]);
  otherService = await rpc<Service>('services.create', [
    establishmentId,
    { name: 'Lavagem com cera', vehicleCategory: 'LARGE_CAR', priceInCents: 6000, active: true },
  ]);
});
afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await getPool().end();
});

describe('agenda compartilhada PostgreSQL', () => {
  test('publica apenas datas abertas explicitamente, com serviços diferentes por dia e sem dados de clientes', async () => {
    expect((await getPublicSchedule(establishmentId)).days).toEqual([]);
    await open(4, 7);
    await bookPublic(establishmentId, input());
    const availability = await getPublicSchedule(establishmentId);
    expect(availability.days).toHaveLength(6);
    expect(availability.days[0]).toMatchObject({ available: 3, services: [{ id: service.id }] });
    expect(availability.days[1]!.services.map((s) => s.id)).toEqual([otherService.id]);
    expect(JSON.stringify(availability)).not.toMatch(
      /Cliente 0|ABC0000|customerPhone|password|owner@example/,
    );
    expect(availability.days.some((day) => day.date === addCalendarDays(startDate(), 2))).toBe(
      false,
    );
  });
  test('20 clientes concorrentes para duas vagas criam exatamente duas reservas', async () => {
    await open(2);
    const attempts = await Promise.allSettled(
      Array.from({ length: 20 }, (_, index) => bookPublic(establishmentId, input(index))),
    );
    expect(attempts.filter((result) => result.status === 'fulfilled')).toHaveLength(2);
    expect(attempts.filter((result) => result.status === 'rejected')).toHaveLength(18);
    const day = await rpc<DaySchedule>('schedule.getDay', [establishmentId, startDate()]);
    expect(day.capacity).toMatchObject({
      pending: 2,
      consumed: 2,
      available: 0,
      inconsistent: false,
    });
    expect(day.reservations).toHaveLength(2);
  });
  test('pendência ocupa vaga; aprovação não duplica; recusa e cancelamento liberam', async () => {
    await open(2);
    const first = (await bookPublic(establishmentId, input(1))) as BookingReceipt;
    const second = (await bookPublic(establishmentId, input(2))) as BookingReceipt;
    await rpc('reservations.performAction', [establishmentId, first.id, 'ACCEPT']);
    expect((await getPublicSchedule(establishmentId)).days[0]!.available).toBe(0);
    await rpc('reservations.performAction', [establishmentId, second.id, 'REJECT']);
    expect((await getPublicSchedule(establishmentId)).days[0]!.available).toBe(1);
    await bookPublic(establishmentId, input(3));
    await rpc('reservations.performAction', [establishmentId, first.id, 'CANCEL']);
    expect((await getPublicSchedule(establishmentId)).days[0]!.available).toBe(1);
  });
  test('repetição simultânea da mesma solicitação é idempotente, inclusive sem vagas restantes', async () => {
    await open(1);
    const payload = input(1);
    const results = await Promise.all(
      Array.from({ length: 5 }, () => bookPublic(establishmentId, payload)),
    );
    expect(new Set(results.map((r) => (r as BookingReceipt).id)).size).toBe(1);
    await expect(
      bookPublic(establishmentId, { ...payload, customerName: 'Outra pessoa' }),
    ).rejects.toMatchObject({ code: 'VALIDATION' });
    expect(
      (await rpc<DaySchedule>('schedule.getDay', [establishmentId, startDate()])).reservations,
    ).toHaveLength(1);
  });
  test('valida serviço do dia, serviço inativo, dia fechado, data não publicada e dados inválidos', async () => {
    await open(4, 7);
    await expect(
      bookPublic(establishmentId, input(1, startDate(), otherService.id)),
    ).rejects.toMatchObject({ code: 'VALIDATION' });
    await expect(
      bookPublic(establishmentId, input(1, addCalendarDays(startDate(), 2))),
    ).rejects.toMatchObject({ code: 'VALIDATION' });
    await expect(
      bookPublic(establishmentId, input(1, addCalendarDays(startDate(), 20))),
    ).rejects.toMatchObject({ code: 'VALIDATION' });
    await expect(bookPublic(establishmentId, { ...input(), customerPhone: 'x' })).rejects.toThrow();
    await expect(bookPublic(establishmentId, { ...input(), vehiclePlate: 'x' })).rejects.toThrow();
    await rpc('services.setActive', [establishmentId, service.id, false]);
    await expect(bookPublic(establishmentId, input())).rejects.toMatchObject({
      code: 'VALIDATION',
    });
  });
  test('evita duplicidade de veículo na mesma data', async () => {
    await open(4);
    await bookPublic(establishmentId, input(1));
    await expect(bookPublic(establishmentId, input(1))).rejects.toMatchObject({
      code: 'VALIDATION',
    });
    expect((await getPublicSchedule(establishmentId)).days[0]!.available).toBe(3);
  });
  test('mantém isolamento, senha real e invalidação da sessão ao sair', async () => {
    await open(4);
    await expect(
      authenticate('signIn', { email: 'owner@example.com', password: 'wrong-password' }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    const auth = await authenticate('signIn', {
      email: 'owner@example.com',
      password: 'password-for-tests',
    });
    expect((await rpc<Session>('auth.getSession', [], auth.token)).owner.id).toBe(ownerId);
    const stranger = await authenticate('signUp', {
      email: 'other@example.com',
      name: 'Outro proprietário',
      password: 'another-password',
    });
    for (const [op, args] of [
      ['services.list', [establishmentId]],
      ['services.setActive', [establishmentId, service.id, false]],
      [
        'services.update',
        [
          establishmentId,
          service.id,
          { name: 'Ataque', priceInCents: 10, active: true, vehicleCategory: 'SMALL_CAR' },
        ],
      ],
      ['schedule.getDay', [establishmentId, startDate()]],
      ['auth.updateOwnerName', [ownerId, 'Ataque']],
    ] as const)
      await expect(rpc(op, [...args], stranger.token)).rejects.toMatchObject({
        code: expect.stringMatching(/UNAUTHORIZED|NOT_FOUND/),
      });
    await rpc('auth.signOut', [], auth.token);
    expect(await rpc('auth.getSession', [], auth.token)).toBeNull();
    await expect(rpc('services.list', [establishmentId], auth.token)).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
  });
  test('criação de semana conflitante é revertida por completo e dados resistem a novas sessões/migrações', async () => {
    await open(2);
    await expect(open(5, 7)).rejects.toMatchObject({ code: 'VALIDATION' });
    expect((await getPublicSchedule(establishmentId)).days).toHaveLength(1);
    const receipt = (await bookPublic(establishmentId, input())) as BookingReceipt;
    await migrate();
    const auth = await authenticate('signIn', {
      email: 'owner@example.com',
      password: 'password-for-tests',
    });
    expect(
      (await rpc<DaySchedule>('schedule.getDay', [establishmentId, startDate()], auth.token))
        .reservations[0]!.id,
    ).toBe(receipt.id);
  });
  test('HTTP protege proprietário, cookies, origem, formato e endpoints sem expor reservas', async () => {
    await open(2);
    const post = (payload: unknown, headers: Record<string, string> = {}) =>
      fetch(`${baseUrl}/api/app`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(payload),
      });
    const publicResponse = await fetch(`${baseUrl}/api/app?establishment=${establishmentId}`);
    expect(publicResponse.headers.get('cache-control')).toContain('no-store');
    expect(publicResponse.status).toBe(200);
    expect((await post({ op: 'services.list', args: [establishmentId] })).status).toBe(401);
    expect(
      (await post({ op: 'auth.getSession', args: [] }, { Origin: 'https://foreign.example' }))
        .status,
    ).toBe(403);
    expect((await post({ op: '__proto__.toString', args: [] })).status).toBe(400);
    const login = await post({
      op: 'auth.signIn',
      args: [{ email: 'owner@example.com', password: 'password-for-tests' }],
    });
    expect(login.status).toBe(200);
    expect(login.headers.get('set-cookie')).toMatch(/HttpOnly; SameSite=Lax/);
    expect((await login.json()).data.owner.email).toBe('owner@example.com');
    expect((await fetch(`${baseUrl}/api/nope`)).status).toBe(404);
    expect(
      (
        await post({
          op: 'public.book',
          args: [establishmentId, { ...input(), vehiclePlate: 'invalid' }],
        })
      ).status,
    ).toBe(400);
  });
});
