import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import type { Pool } from 'pg';
import { z } from 'zod';

const columns = {
  lava_owners: ['id', 'email', 'password_hash', 'created_at'],
  lava_states: ['owner_id', 'schema_version', 'data', 'updated_at'],
  lava_public_links: ['establishment_id', 'owner_id'],
  lava_public_schedules: ['establishment_id', 'data'],
  lava_booking_requests: [
    'establishment_id',
    'request_id',
    'payload_hash',
    'receipt',
    'client_hash',
    'created_at',
  ],
} as const;
const snapshot = z.object({
  version: z.literal(1),
  createdAt: z.string(),
  tables: z.record(z.string(), z.array(z.record(z.string(), z.unknown()))),
});
const magic = Buffer.from('LAVA01');
function backupKey(value: string) {
  const key = Buffer.from(value, 'base64');
  if (key.length !== 32) throw new Error('A chave do backup deve conter 32 bytes em base64.');
  return key;
}
export async function exportEncryptedBackup(pool: Pool, key: string) {
  const secret = backupKey(key);
  const client = await pool.connect();
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const tables: Record<string, unknown[]> = {};
    for (const [table, fields] of Object.entries(columns))
      tables[table] = (await client.query(`SELECT ${fields.join(',')} FROM ${table}`)).rows;
    const plaintext = Buffer.from(
      JSON.stringify({ version: 1, createdAt: new Date().toISOString(), tables }),
    );
    if (plaintext.length > 32 * 1024 * 1024)
      throw new Error('Use backup PostgreSQL administrado para bases acima de 32 MB.');
    await client.query('COMMIT');
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', secret, iv);
    cipher.setAAD(magic);
    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    plaintext.fill(0);
    return Buffer.concat([magic, iv, cipher.getAuthTag(), encrypted]);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
export async function restoreEncryptedBackup(pool: Pool, key: string, archive: Buffer) {
  if (
    archive.length < 34 ||
    archive.length > 33 * 1024 * 1024 ||
    !archive.subarray(0, 6).equals(magic)
  )
    throw new Error('Arquivo de backup inválido.');
  const decipher = createDecipheriv('aes-256-gcm', backupKey(key), archive.subarray(6, 18));
  decipher.setAAD(magic);
  decipher.setAuthTag(archive.subarray(18, 34));
  const plaintext = Buffer.concat([decipher.update(archive.subarray(34)), decipher.final()]);
  let data: z.infer<typeof snapshot>;
  try {
    data = snapshot.parse(JSON.parse(plaintext.toString('utf8')));
  } finally {
    plaintext.fill(0);
  }
  if (Object.keys(data.tables).sort().join(',') !== Object.keys(columns).sort().join(','))
    throw new Error('Estrutura de backup incompatível.');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `LOCK TABLE ${Object.keys(columns).join(',')},lava_sessions IN ACCESS EXCLUSIVE MODE`,
    );
    for (const table of [...Object.keys(columns), 'lava_sessions']) {
      const result = await client.query(`SELECT 1 FROM ${table} LIMIT 1`);
      if (result.rowCount)
        throw new Error(
          'Restauração permitida somente em banco vazio. Nenhum cadastro foi substituído.',
        );
    }
    for (const [table, fields] of Object.entries(columns)) {
      for (const row of data.tables[table]!) {
        if (Object.keys(row).some((field) => !(fields as readonly string[]).includes(field)))
          throw new Error('Coluna de backup incompatível.');
        await client.query(
          `INSERT INTO ${table}(${fields.join(',')}) VALUES(${fields.map((_, i) => `$${i + 1}`).join(',')})`,
          fields.map((field) => row[field]),
        );
      }
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
