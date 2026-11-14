import { registration } from '../server/validation.js';
import { hashPassword } from '../server/passwords.js';
import { ensureDatabaseEnvironment, getMigrationPool } from '../server/database.js';

// Operator-only tool; never exposed through the API or public recovery form.
if (!process.argv.includes('--identity-verified'))
  throw new Error(
    'Verifique a identidade do proprietário fora do aplicativo antes de recuperar o acesso.',
  );
const email = registration.shape.email.parse(process.env.LAVA_RECOVERY_EMAIL);
const password = registration.shape.password.parse(process.env.LAVA_RECOVERY_PASSWORD);
const pool = getMigrationPool();
const client = await pool.connect();
try {
  await ensureDatabaseEnvironment(pool);
  const hash = await hashPassword(password);
  await client.query('BEGIN');
  const owner = await client.query<{ id: string }>(
    'UPDATE lava_owners SET password_hash=$2 WHERE email=$1 RETURNING id',
    [email, hash],
  );
  if (!owner.rows[0]) throw new Error('Conta não encontrada.');
  await client.query('DELETE FROM lava_sessions WHERE owner_id=$1', [owner.rows[0].id]);
  await client.query('COMMIT');
  console.log('Acesso recuperado. Todas as sessões anteriores foram revogadas.');
} catch {
  await client.query('ROLLBACK');
  console.error('Não foi possível recuperar o acesso. Nenhum dado pessoal foi exibido.');
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
