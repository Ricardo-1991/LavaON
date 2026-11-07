import { Pool, type PoolClient } from 'pg';

let pool: Pool | undefined;
export function getPool() {
  const connectionString = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!connectionString) throw new Error('PostgreSQL não configurado.');
  return (pool ??= new Pool({
    connectionString,
    max: 5,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 10_000,
    allowExitOnIdle: true,
  }));
}

// Additive schema. Never replaces an existing owner's data or imports local demo records.
export const migration = `
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
CREATE TABLE IF NOT EXISTS lava_rate_limits (
 key text PRIMARY KEY, count integer NOT NULL, expires_at timestamptz NOT NULL
);
`;

export async function migrate() {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT pg_advisory_xact_lock(hashtext('lava-on-schema-v1'))");
    await client.query(migration);
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
