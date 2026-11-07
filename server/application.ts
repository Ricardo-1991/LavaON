import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import type { ApplicationState, StateDatabase } from '../src/domain/models/state.js';
import type { Owner } from '../src/domain/models/index.js';
import { AppError } from '../src/domain/errors.js';
import { createRepositories } from '../src/data/repositories/create-repositories.js';
import { publicAvailability, createPublicBooking } from '../src/domain/rules/public-booking.js';
import { createSession, digest, hashPassword, ownerForToken, verifyPassword } from './auth.js';
import { transaction } from './database.js';
import { credentials, registration, ownerOperation, publicBooking } from './validation.js';

export function emptyState(owner: Owner): ApplicationState {
  return {
    schemaVersion: 1,
    sessionOwnerId: owner.id,
    owners: [owner],
    establishments: [],
    memberships: [],
    customers: [],
    vehicles: [],
    services: [],
    operatingDays: [],
    scheduleDays: [],
    reservations: [],
  };
}
async function loadState(client: PoolClient, ownerId: string, lock: boolean) {
  const result = await client.query<{ data: ApplicationState; schema_version: number }>(
    `SELECT data, schema_version FROM lava_states WHERE owner_id = $1${lock ? ' FOR UPDATE' : ''}`,
    [ownerId],
  );
  const row = result.rows[0];
  if (!row) throw new AppError('NOT_FOUND', 'Conta não encontrada.');
  if (row.schema_version !== 1 || row.data.schemaVersion !== 1)
    throw new AppError(
      'PERSISTENCE',
      'Versão dos dados incompatível. Nenhum cadastro foi apagado.',
    );
  row.data.sessionOwnerId = ownerId;
  return row.data;
}
async function saveState(client: PoolClient, ownerId: string, state: ApplicationState) {
  // Session identity comes from the cookie, never from the persisted document or caller.
  await client.query('UPDATE lava_states SET data=$2::jsonb, updated_at=now() WHERE owner_id=$1', [
    ownerId,
    JSON.stringify({ ...state, sessionOwnerId: null }),
  ]);
  for (const establishment of state.establishments) {
    await client.query(
      'INSERT INTO lava_public_links(establishment_id,owner_id) VALUES($1,$2) ON CONFLICT DO NOTHING',
      [establishment.id, ownerId],
    );
  }
}
export async function authenticate(action: 'signIn' | 'signUp', input: unknown) {
  const data = action === 'signUp' ? registration.parse(input) : credentials.parse(input);
  // Expensive password work happens before acquiring a row lock.
  const newHash = action === 'signUp' ? await hashPassword(data.password) : undefined;
  return transaction(async (client) => {
    let ownerId: string;
    if (action === 'signUp') {
      const owner = {
        id: randomUUID(),
        email: data.email,
        name: registration.parse(input).name,
        createdAt: new Date().toISOString(),
      };
      const inserted = await client.query(
        'INSERT INTO lava_owners(id,email,password_hash) VALUES($1,$2,$3) ON CONFLICT(email) DO NOTHING RETURNING id',
        [owner.id, owner.email, newHash],
      );
      if (!inserted.rowCount)
        throw new AppError(
          'VALIDATION',
          'Não foi possível criar a conta com este e-mail. Tente entrar ou use outro e-mail.',
        );
      await client.query('INSERT INTO lava_states(owner_id,data) VALUES($1,$2::jsonb)', [
        owner.id,
        JSON.stringify(emptyState(owner)),
      ]);
      ownerId = owner.id;
    } else {
      const found = await client.query<{ id: string; password_hash: string }>(
        'SELECT id,password_hash FROM lava_owners WHERE email=$1',
        [data.email],
      );
      const row = found.rows[0];
      // Run scrypt even for an unknown email to avoid a quick account-existence check.
      const valid = await verifyPassword(
        data.password,
        row?.password_hash ?? `${'0'.repeat(32)}:${'0'.repeat(128)}`,
      );
      if (!row || !valid) throw new AppError('UNAUTHORIZED', 'E-mail ou senha inválidos.');
      ownerId = row.id;
    }
    const state = await loadState(client, ownerId, false);
    const repositories = createRepositories({
      read: async (reader) => reader(state),
      write: async (writer) => writer(state),
    });
    return {
      token: await createSession(client, ownerId),
      session: await repositories.auth.getSession(),
    };
  });
}

export async function ownerRequest(token: string, payload: unknown) {
  const operation = ownerOperation.parse(payload);
  return transaction(async (client) => {
    const ownerId = await ownerForToken(client, token);
    if (!ownerId) {
      if (operation.op === 'auth.getSession' || operation.op === 'auth.signOut') return null;
      throw new AppError('UNAUTHORIZED', 'Entre novamente para continuar.');
    }
    if (operation.op === 'auth.signOut') {
      await client.query('DELETE FROM lava_sessions WHERE token_hash=$1', [digest(token)]);
      return null;
    }
    const state = await loadState(client, ownerId, true);
    let changed = false;
    const database: StateDatabase = {
      read: async (reader) => reader(state),
      write: async (writer) => {
        const result = writer(state);
        changed = true;
        return result;
      },
    };
    const repositories = createRepositories(database);
    const [group, method] = operation.op.split('.') as [keyof typeof repositories, string];
    // The validated allowlist above excludes signIn/signUp and arbitrary properties.
    const methods = repositories[group] as unknown as Record<
      string,
      (...args: unknown[]) => Promise<unknown>
    >;
    const result = await methods[method]!(...operation.args);
    if (changed) await saveState(client, ownerId, state);
    return result ?? null;
  });
}
async function publicOwner(client: PoolClient, establishmentId: string) {
  const result = await client.query<{ owner_id: string }>(
    'SELECT owner_id FROM lava_public_links WHERE establishment_id=$1',
    [establishmentId],
  );
  if (!result.rows[0])
    throw new AppError('NOT_FOUND', 'Agenda não encontrada. Confira o link com o estabelecimento.');
  return result.rows[0].owner_id;
}
export async function getPublicSchedule(establishmentId: string) {
  return transaction(async (client) =>
    publicAvailability(
      await loadState(client, await publicOwner(client, establishmentId), false),
      establishmentId,
    ),
  );
}
export async function bookPublic(establishmentId: string, payload: unknown) {
  const input = publicBooking.parse(payload);
  return transaction(async (client) => {
    const ownerId = await publicOwner(client, establishmentId);
    const state = await loadState(client, ownerId, true);
    const payloadHash = digest(JSON.stringify(input));
    const previous = await client.query<{ payload_hash: string; receipt: unknown }>(
      'SELECT payload_hash,receipt FROM lava_booking_requests WHERE establishment_id=$1 AND request_id=$2',
      [establishmentId, input.requestId],
    );
    if (previous.rows[0]) {
      if (previous.rows[0].payload_hash !== payloadHash)
        throw new AppError(
          'VALIDATION',
          'Solicitação já utilizada com outros dados. Reabra o formulário.',
        );
      return previous.rows[0].receipt;
    }
    const receipt = createPublicBooking(state, establishmentId, input);
    await saveState(client, ownerId, state);
    await client.query(
      'INSERT INTO lava_booking_requests(establishment_id,request_id,payload_hash,receipt) VALUES($1,$2,$3,$4::jsonb)',
      [establishmentId, input.requestId, payloadHash, JSON.stringify(receipt)],
    );
    return receipt;
  });
}
