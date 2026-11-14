import { beforeAll, beforeEach, afterAll, describe, expect, test, vi } from 'vitest';
import { randomUUID, randomBytes, scryptSync } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import {
  migrate,
  getPool,
  getMigrationPool,
  connectionPool,
  migration,
  ensureDatabaseEnvironment,
} from '../../server/database';
import {
  authenticate,
  bookPublic,
  getPublicSchedule,
  ownerRequest,
  changePassword,
} from '../../server/application';
import maintenance from '../../api/maintenance';
import { exportEncryptedBackup, restoreEncryptedBackup } from '../../server/backup';
import { handleRequest } from '../../server/http';
import { verifyBrowser } from '../../server/bot-protection';
import { digest } from '../../server/auth';
import { AppError } from '@/domain/errors';
import { getTodayInTimeZone } from '@/domain/rules/reservations';
import { addCalendarDays } from '@/domain/rules/schedule';
import type { BookingReceipt, DaySchedule, Establishment, Service, Session } from '@/domain/models';

vi.mock('../../server/bot-protection', () => ({ verifyBrowser: vi.fn().mockResolvedValue(undefined) }));

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
    void (request.url?.startsWith('/api/maintenance')
      ? maintenance(request, response)
      : handleRequest(request, response));
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
  await getMigrationPool().end();
});

describe('correções de segurança', () => {
  test('bot rejeitado e credenciais inválidas não esgotam o limite do e-mail da vítima', async () => {
    const post = (input: unknown) => fetch(`${baseUrl}/api/app`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({op:'auth.signIn',args:[input]})});
    vi.mocked(verifyBrowser).mockRejectedValueOnce(new AppError('FORBIDDEN','Acesso rejeitado.'));
    expect((await post({email:'owner@example.com',password:'password-for-tests'})).status).toBe(403);
    expect((await post({email:'owner@example.com'})).status).toBe(400);
    const key=digest(`auth-email:${digest('owner@example.com')}`);
    expect((await getPool().query('SELECT count FROM lava_rate_limits WHERE key=$1',[key])).rowCount).toBe(0);
    expect((await post({email:'owner@example.com',password:'password-for-tests'})).status).toBe(200);
    expect((await getPool().query('SELECT count FROM lava_rate_limits WHERE key=$1',[key])).rows[0].count).toBe(1);
  });
  test('login preserva contas antigas e atualiza seu hash somente com a senha correta', async () => {
    const salt = randomBytes(16).toString('hex');
    const legacy = `${salt}:${scryptSync('password-for-tests', salt, 64).toString('hex')}`;
    await getPool().query('UPDATE lava_owners SET password_hash=$1 WHERE id=$2', [legacy, ownerId]);
    await expect(
      authenticate('signIn', { email: 'owner@example.com', password: 'wrong-password' }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    expect(
      (await getPool().query('SELECT password_hash FROM lava_owners WHERE id=$1', [ownerId]))
        .rows[0].password_hash,
    ).toBe(legacy);
    const login = await authenticate('signIn', {
      email: 'owner@example.com',
      password: 'password-for-tests',
    });
    expect(login.session!.owner.id).toBe(ownerId);
    expect(
      (await getPool().query('SELECT password_hash FROM lava_owners WHERE id=$1', [ownerId]))
        .rows[0].password_hash,
    ).toMatch(/^scrypt\$1\$65536\$8\$2\$/);
  });
  test('alterar senha exige senha atual, rotaciona o token e revoga todos os acessos anteriores', async () => {
    const other = await authenticate('signIn', {
      email: 'owner@example.com',
      password: 'password-for-tests',
    });
    await expect(
      changePassword('', {
        currentPassword: 'password-for-tests',
        newPassword: 'replacement-password',
      }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    await expect(
      changePassword(token, { currentPassword: 'incorrect', newPassword: 'replacement-password' }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    expect(await rpc('auth.getSession', [], other.token)).not.toBeNull();
    const changed = await changePassword(token, {
      currentPassword: 'password-for-tests',
      newPassword: 'replacement-password',
    });
    expect(await rpc('auth.getSession', [], token)).toBeNull();
    expect(await rpc('auth.getSession', [], other.token)).toBeNull();
    expect(await rpc('auth.getSession', [], changed.token)).not.toBeNull();
    await expect(
      authenticate('signIn', { email: 'owner@example.com', password: 'password-for-tests' }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    const fresh = await authenticate('signIn', {
      email: 'owner@example.com',
      password: 'replacement-password',
    });
    await rpc('auth.signOutAll', [], changed.token);
    expect(await rpc('auth.getSession', [], fresh.token)).toBeNull();
  });
  test('marca do ambiente bloqueia banco incorreto e não é reescrita por migração', async () => {
    vi.stubEnv('VERCEL_ENV', 'preview');
    try {
      await expect(ensureDatabaseEnvironment()).rejects.toMatchObject({ code: 'PERSISTENCE' });
      await expect(migrate()).rejects.toThrow('outro ambiente');
      expect((await getPool().query('SELECT name FROM lava_environment')).rows[0].name).toBe(
        'test',
      );
    } finally {
      vi.unstubAllEnvs();
    }
    await expect(ensureDatabaseEnvironment()).resolves.toBeUndefined();
  });
  test('limites por telefone e IP são atômicos e repetição idempotente não consome novo limite', async () => {
    await open(15);
    const samePhone = await Promise.allSettled(
      Array.from({ length: 8 }, (_, i) => bookPublic(establishmentId, input(i))),
    );
    expect(samePhone.filter((r) => r.status === 'fulfilled')).toHaveLength(2);
    const unique = (i: number) => ({
      ...input(i + 20),
      customerPhone: `1198888${String(i).padStart(4, '0')}`,
    });
    const payload = unique(1);
    const receipt = await bookPublic(establishmentId, payload, { ip: '192.0.2.1' });
    await bookPublic(establishmentId, unique(2), { ip: '192.0.2.1' });
    await bookPublic(establishmentId, unique(3), { ip: '192.0.2.1' });
    await expect(bookPublic(establishmentId, unique(4), { ip: '192.0.2.1' })).rejects.toMatchObject(
      { code: 'RATE_LIMITED' },
    );
    expect(await bookPublic(establishmentId, payload, { ip: '192.0.2.1' })).toEqual(receipt);
    expect((await getPublicSchedule(establishmentId)).days[0]!.available).toBe(10);
  });
  test('HTTP responde 429 e consulta pública tem limite próprio sem expor estado privado', async () => {
    await open(4);
    for (let i = 0; i < 2; i++) await bookPublic(establishmentId, input(i));
    const limited = await fetch(`${baseUrl}/api/app`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ op: 'public.book', args: [establishmentId, input(3)] }),
    });
    expect(limited.status).toBe(429);
    expect(limited.headers.get('retry-after')).toBe('900');
    await getPool().query(
      "UPDATE lava_states SET data=jsonb_set(data,'{customers}','[]') WHERE owner_id=$1",
      [ownerId],
    );
    const projection = await getPublicSchedule(establishmentId);
    expect(JSON.stringify(projection)).not.toMatch(/Cliente|ABC000|customerPhone|owner@example/);
    for (let i = 0; i < 120; i++)
      expect((await fetch(`${baseUrl}/api/app?establishment=${establishmentId}`)).status).toBe(200);
    expect((await fetch(`${baseUrl}/api/app?establishment=${establishmentId}`)).status).toBe(429);
  });
  test('somente proprietário anonimiza reserva encerrada e preserva serviço, valor, histórico e capacidade', async () => {
    await open(2);
    const payload = input();
    const receipt = (await bookPublic(establishmentId, payload)) as BookingReceipt;
    await expect(
      rpc('reservations.anonymizePersonalData', [establishmentId, receipt.id]),
    ).rejects.toMatchObject({ code: 'VALIDATION' });
    await rpc('reservations.performAction', [establishmentId, receipt.id, 'REJECT']);
    const stranger = await authenticate('signUp', {
      name: 'Outro proprietário',
      email: 'stranger@example.com',
      password: 'stranger-password',
    });
    await expect(
      rpc('reservations.anonymizePersonalData', [establishmentId, receipt.id], stranger.token),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    const redacted = await rpc<import('@/domain/models').Reservation>(
      'reservations.anonymizePersonalData',
      [establishmentId, receipt.id],
    );
    expect(redacted).toMatchObject({
      id: receipt.id,
      status: 'REJECTED',
      anonymizedAt: expect.any(String),
      snapshot: {
        customerName: 'Cliente anonimizado',
        customerPhone: '',
        vehiclePlate: '',
        serviceName: service.name,
        priceInCents: 4000,
      },
    });
    const stored = JSON.stringify(
      (await getPool().query('SELECT data FROM lava_states WHERE owner_id=$1', [ownerId])).rows[0]
        .data,
    );
    expect(stored).not.toMatch(/Cliente 0|ABC0000|Honda Fit/);
    expect((await getPublicSchedule(establishmentId)).days[0]!.available).toBe(2);
    expect(await rpc('reservations.anonymizePersonalData', [establishmentId, receipt.id])).toEqual(
      redacted,
    );
    expect(
      (
        await getPool().query(
          'SELECT payload_hash FROM lava_booking_requests WHERE request_id=$1',
          [payload.requestId],
        )
      ).rows[0].payload_hash,
    ).toBe('anonymized');
  });
  test('manutenção é autenticada e remove somente metadados de segurança expirados', async () => {
    await open(2);
    await bookPublic(establishmentId, input());
    await getPool().query("INSERT INTO lava_sessions VALUES('expired',$1,now()-interval '1 day')", [
      ownerId,
    ]);
    await getPool().query(
      "INSERT INTO lava_rate_limits VALUES('expired',1,now()-interval '2 days'),('live',1,now()+interval '1 hour')",
    );
    vi.stubEnv('CRON_SECRET', 'local-test-secret');
    try {
      expect((await fetch(`${baseUrl}/api/maintenance`)).status).toBe(401);
      expect(
        (
          await fetch(`${baseUrl}/api/maintenance`, {
            headers: { Authorization: 'Bearer wrong-secret' },
          })
        ).status,
      ).toBe(401);
      expect(
        (
          await fetch(`${baseUrl}/api/maintenance`, {
            headers: { Authorization: 'Bearer local-test-secret' },
          })
        ).status,
      ).toBe(200);
      expect(
        (await getPool().query("SELECT 1 FROM lava_sessions WHERE token_hash='expired'")).rowCount,
      ).toBe(0);
      expect((await getPool().query('SELECT key FROM lava_rate_limits ORDER BY key')).rows).toEqual(
        [{ key: 'live' }],
      );
      expect(await rpc('auth.getSession')).not.toBeNull();
      expect((await getPublicSchedule(establishmentId)).days[0]!.available).toBe(1);
    } finally {
      vi.unstubAllEnvs();
    }
  });
  test('backup criptografado restaura em banco vazio e recusa chave incorreta, alteração e sobrescrita', async () => {
    await open(2);
    await bookPublic(establishmentId, input());
    const key = randomBytes(32).toString('base64');
    const archive = await exportEncryptedBackup(getPool(), key);
    expect(archive.includes(Buffer.from('Cliente 0'))).toBe(false);
    const targetUrl = new URL(connection!);
    targetUrl.pathname = '/lavaon_restore_test';
    const target = connectionPool(targetUrl.toString());
    await getPool().query('CREATE DATABASE lavaon_restore_test');
    try {
      await target.query(migration);
      await target.query("INSERT INTO lava_environment VALUES(true,'test')");
      await expect(
        restoreEncryptedBackup(target, randomBytes(32).toString('base64'), archive),
      ).rejects.toThrow();
      const corrupted = Buffer.from(archive);
      corrupted[corrupted.length - 1]! ^= 1;
      await expect(restoreEncryptedBackup(target, key, corrupted)).rejects.toThrow();
      expect((await target.query('SELECT count(*) FROM lava_owners')).rows[0].count).toBe('0');
      await restoreEncryptedBackup(target, key, archive);
      const restored = (
        await target.query('SELECT data FROM lava_states WHERE owner_id=$1', [ownerId])
      ).rows[0].data;
      expect(restored.reservations[0].snapshot.customerName).toBe('Cliente 0');
      expect((await target.query('SELECT count(*) FROM lava_sessions')).rows[0].count).toBe('0');
      await expect(restoreEncryptedBackup(target, key, archive)).rejects.toThrow('banco vazio');
    } finally {
      await target.end();
      await getPool().query('DROP DATABASE lavaon_restore_test');
    }
  });
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
