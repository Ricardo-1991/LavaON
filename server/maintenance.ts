import { getPool } from './database.js';
// Bounded housekeeping of authentication metadata only; no customer record is deleted.
let lastRun = 0;
let running: Promise<void> | null = null;
export function cleanupExpiredSecurityRecords() {
  if (Date.now() - lastRun < 3600000) return Promise.resolve();
  if (running) return running;
  running = (async () => {
    await getPool().query(
      'DELETE FROM lava_sessions WHERE token_hash IN (SELECT token_hash FROM lava_sessions WHERE expires_at < now() ORDER BY expires_at LIMIT 1000)',
    );
    await getPool().query(
      "DELETE FROM lava_rate_limits WHERE key IN (SELECT key FROM lava_rate_limits WHERE expires_at < now() - interval '1 day' ORDER BY expires_at LIMIT 1000)",
    );
    lastRun = Date.now();
  })().finally(() => {
    running = null;
  });
  return running;
}
