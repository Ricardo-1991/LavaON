import type { IncomingMessage, ServerResponse } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { ensureDatabaseEnvironment } from '../server/database.js';
import { cleanupExpiredSecurityRecords } from '../server/maintenance.js';
export default async function maintenance(request: IncomingMessage, response: ServerResponse) {
  response.setHeader('Cache-Control', 'private, no-store');
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  const expected = process.env.CRON_SECRET;
  const token = request.headers.authorization?.replace(/^Bearer /, '');
  if (
    !expected ||
    !token ||
    Buffer.byteLength(token) !== Buffer.byteLength(expected) ||
    !timingSafeEqual(Buffer.from(token), Buffer.from(expected))
  ) {
    response.statusCode = 401;
    response.end(JSON.stringify({ message: 'Acesso não autorizado.' }));
    return;
  }
  if (request.method !== 'GET') {
    response.statusCode = 405;
    response.end('{}');
    return;
  }
  try {
    await ensureDatabaseEnvironment();
    await cleanupExpiredSecurityRecords();
    response.end(JSON.stringify({ status: 'ok' }));
  } catch {
    response.statusCode = 503;
    response.end(JSON.stringify({ message: 'Não foi possível concluir a manutenção.' }));
  }
}
