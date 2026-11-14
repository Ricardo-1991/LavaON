import { Pool, type PoolClient } from 'pg';
import { AppError } from '../src/domain/errors.js';

let pool: Pool | undefined;
let migrationPool: Pool | undefined;
export function getPool() {
  const connectionString =
    process.env.LAVA_DATABASE_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!connectionString) throw new Error('PostgreSQL não configurado.');
  return (pool ??= connectionPool(connectionString));
}
export function getMigrationPool() {
  const connectionString = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!connectionString) throw new Error('Credencial de migração PostgreSQL não configurada.');
  return (migrationPool ??= connectionPool(connectionString));
}
export function connectionPool(connectionString: string) {
  return new Pool({
    connectionString: secureConnectionString(connectionString),
    max: 5,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 10_000,
    allowExitOnIdle: true,
  });
}

// Additive schema. Never replaces an existing owner's data or imports local demo records.
export const migration = `
CREATE TABLE IF NOT EXISTS lava_environment ( singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton), name text NOT NULL );
CREATE TABLE IF NOT EXISTS lava_owners (
 id text PRIMARY KEY, email text NOT NULL UNIQUE, password_hash text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS lava_states (
 owner_id text PRIMARY KEY REFERENCES lava_owners(id) ON DELETE CASCADE,
 schema_version integer NOT NULL DEFAULT 1 CHECK(schema_version = 1),
 data jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS lava_sessions (
 token_hash text PRIMARY KEY, owner_id text NOT NULL REFERENCES lava_owners(id) ON DELETE CASCADE,
 expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS lava_sessions_expiry ON lava_sessions(expires_at);
CREATE TABLE IF NOT EXISTS lava_public_links (
 establishment_id text PRIMARY KEY, owner_id text NOT NULL REFERENCES lava_owners(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS lava_booking_requests (
 establishment_id text NOT NULL REFERENCES lava_public_links(establishment_id) ON DELETE CASCADE,
 request_id text NOT NULL, payload_hash text NOT NULL, receipt jsonb NOT NULL,
 PRIMARY KEY(establishment_id, request_id)
);
ALTER TABLE lava_booking_requests ADD COLUMN IF NOT EXISTS client_hash text;
ALTER TABLE lava_booking_requests ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
CREATE INDEX IF NOT EXISTS lava_booking_client ON lava_booking_requests(establishment_id, client_hash, created_at);
CREATE TABLE IF NOT EXISTS lava_public_schedules (
 establishment_id text PRIMARY KEY REFERENCES lava_public_links(establishment_id) ON DELETE CASCADE, data jsonb NOT NULL
);
CREATE TABLE IF NOT EXISTS lava_rate_limits (
 key text PRIMARY KEY, count integer NOT NULL, expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS lava_rate_expiry ON lava_rate_limits(expires_at);
`;

export async function migrate() {
  const client = await getMigrationPool().connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT pg_advisory_xact_lock(hashtext('lava-on-schema-v1'))");
    await client.query(migration);
    const marker = await client.query<{ name: string }>(
      'SELECT name FROM lava_environment WHERE singleton=true',
    );
    const environment = expectedDatabaseEnvironment();
    if (marker.rows[0] && marker.rows[0].name !== environment)
      throw new Error('O banco pertence a outro ambiente. Migração cancelada.');
    await client.query(
      'INSERT INTO lava_environment(singleton,name) VALUES(true,$1) ON CONFLICT DO NOTHING',
      [environment],
    );
    const { publicAvailability } = await import('../src/domain/rules/public-booking.js');
    const states = await client.query<{
      data: import('../src/domain/models/state.js').ApplicationState;
    }>('SELECT data FROM lava_states');
    for (const { data } of states.rows)
      for (const establishment of data.establishments) {
        await client.query(
          'INSERT INTO lava_public_schedules(establishment_id,data) VALUES($1,$2::jsonb) ON CONFLICT(establishment_id) DO UPDATE SET data=EXCLUDED.data',
          [establishment.id, JSON.stringify(publicAvailability(data, establishment.id))],
        );
      }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function transaction<T>(operation: (client: PoolClient) => Promise<T>) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    await client.query("SET LOCAL statement_timeout = '12s'");
    const result = await operation(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

function secureConnectionString(value: string) {
  const url = new URL(value);
  if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
    url.searchParams.set('sslmode', 'verify-full');
  return url.toString();
}
export function expectedDatabaseEnvironment() {
  return (
    process.env.VERCEL_ENV ??
    process.env.LAVA_DATABASE_ENV ??
    (process.env.TEST_DATABASE_URL ? 'test' : 'development')
  );
}
export async function ensureDatabaseEnvironment(database = getPool()) {
  const result = await database.query<{ name: string }>(
    'SELECT name FROM lava_environment WHERE singleton=true',
  );
  if (result.rows[0]?.name !== expectedDatabaseEnvironment())
    throw new AppError(
      'PERSISTENCE',
      'O banco não corresponde a este ambiente. A operação foi bloqueada para proteger os dados.',
    );
}
