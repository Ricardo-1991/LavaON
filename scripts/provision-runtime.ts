import { randomBytes } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { connectionPool, getMigrationPool, migrate } from '../server/database.js';

// Run with an administrator connection in a private env file. Never prints credentials.
const output = process.argv[2];
if (!output || !process.env.LAVA_DATABASE_ENV || !process.env.DATABASE_URL)
  throw new Error('Informe LAVA_DATABASE_ENV, DATABASE_URL e o caminho privado de saída.');
await migrate();
const admin = getMigrationPool();
const client = await admin.connect();
const password = randomBytes(32).toString('hex');
const uri = new URL(process.env.DATABASE_URL);
uri.username = 'lava_runtime';
uri.password = password;
const runtime = connectionPool(uri.toString());
try {
  await client.query('BEGIN');
  const existing = await client.query("SELECT 1 FROM pg_roles WHERE rolname='lava_runtime'");
  if (existing.rowCount) throw new Error('O papel já existe. Nenhuma senha foi alterada.');
  // Password is generated hexadecimal, never supplied as SQL text by a caller.
  await client.query(
    `CREATE ROLE lava_runtime LOGIN PASSWORD '${password}' NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS`,
  );
  await client.query('GRANT USAGE ON SCHEMA public TO lava_runtime');
  await client.query('GRANT SELECT ON lava_environment TO lava_runtime');
  await client.query(
    'GRANT SELECT,INSERT,UPDATE,DELETE ON lava_owners,lava_states,lava_sessions,lava_public_links,lava_public_schedules,lava_booking_requests,lava_rate_limits TO lava_runtime',
  );
  // Reserve a private file before committing, so a filesystem failure cannot lose the password.
  await writeFile(output, `LAVA_DATABASE_URL=${JSON.stringify(uri.toString())}\n`, {
    mode: 0o600,
    flag: 'wx',
  });
  await client.query('COMMIT');
  const permissions = await runtime.query<{
    ddl: boolean;
    schema_create: boolean;
    marker_write: boolean;
  }>(
    "SELECT has_database_privilege(current_user,current_database(),'CREATE') AS ddl, has_schema_privilege(current_user,'public','CREATE') AS schema_create, has_table_privilege(current_user,'lava_environment','UPDATE') AS marker_write",
  );
  if (Object.values(permissions.rows[0]!).some(Boolean))
    throw new Error('Permissões excessivas detectadas. Não publique a credencial.');
  await runtime.query('SELECT name FROM lava_environment WHERE singleton=true');
  console.log('Papel de execução criado e validado, sem privilégios de esquema ou migração.');
} catch (error) {
  await client.query('ROLLBACK');
  // SQL errors can include credentials. Expose only the safe message for our own checks.
  if (error instanceof Error && !('code' in error)) console.error(error.message);
  else
    console.error('Não foi possível provisionar o papel. Confira as permissões administrativas.');
  process.exitCode = 1;
} finally {
  client.release();
  await Promise.all([admin.end(), runtime.end()]);
}
