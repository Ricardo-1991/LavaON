import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { PoolClient } from 'pg';
import type { IncomingMessage } from 'node:http';
import { AppError } from '../src/domain/errors.js';
import { getPool } from './database.js';

const scrypt = promisify(scryptCallback);
export const digest = (value: string) => createHash('sha256').update(value).digest('hex');
export const cookieName = 'lava_session';
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const key = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${key.toString('hex')}`;
}
export async function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const key = (await scrypt(password, salt, 64)) as Buffer;
  const expected = Buffer.from(hash, 'hex');
  return expected.length === key.length && timingSafeEqual(expected, key);
}
export function readToken(request: IncomingMessage) {
  return (
    request.headers.cookie
      ?.split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${cookieName}=`))
      ?.slice(cookieName.length + 1) ?? ''
  );
}
export async function ownerForToken(client: PoolClient, token: string) {
  const result = await client.query<{ owner_id: string }>(
    'SELECT owner_id FROM lava_sessions WHERE token_hash = $1 AND expires_at > now()',
    [digest(token)],
  );
  return result.rows[0]?.owner_id ?? null;
}
export async function createSession(client: PoolClient, ownerId: string) {
  const token = randomBytes(32).toString('hex');
  await client.query(
    "INSERT INTO lava_sessions(token_hash, owner_id, expires_at) VALUES($1, $2, now() + interval '30 days')",
    [digest(token), ownerId],
  );
  return token;
}
export function sessionCookie(token: string, secure: boolean) {
  return `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${token ? 30 * 86400 : 0}${secure ? '; Secure' : ''}`;
}
// A separate committed statement also counts failed requests. Keys contain hashes, never emails/IPs.
export async function rateLimit(key: string, maximum: number, seconds: number) {
  const result = await getPool().query<{ count: number }>(
    `
    INSERT INTO lava_rate_limits(key, count, expires_at) VALUES($1, 1, now() + $2 * interval '1 second')
    ON CONFLICT(key) DO UPDATE SET count = CASE WHEN lava_rate_limits.expires_at <= now() THEN 1 ELSE lava_rate_limits.count + 1 END,
    expires_at = CASE WHEN lava_rate_limits.expires_at <= now() THEN EXCLUDED.expires_at ELSE lava_rate_limits.expires_at END
    RETURNING count`,
    [digest(key), seconds],
  );
  if (result.rows[0]!.count > maximum)
    throw new AppError(
      'VALIDATION',
      'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
    );
}
