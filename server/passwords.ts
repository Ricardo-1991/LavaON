import { randomBytes, scrypt as derive, timingSafeEqual } from 'node:crypto';
const scrypt = (
  password: string,
  salt: string,
  length: number,
  options: { N: number; r: number; p: number; maxmem: number },
) =>
  new Promise<Buffer>((resolve, reject) =>
    derive(password, salt, length, options, (error, key) => (error ? reject(error) : resolve(key))),
  );
const cost = { N: 65536, r: 8, p: 2, maxmem: 96 * 1024 * 1024 };
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const key = (await scrypt(password, salt, 64, cost)) as Buffer;
  return `scrypt$1$${cost.N}$${cost.r}$${cost.p}$${salt}$${key.toString('hex')}`;
}
export function needsPasswordUpgrade(stored: string) {
  return !stored.startsWith(`scrypt$1$${cost.N}$${cost.r}$${cost.p}$`);
}
export async function verifyPassword(password: string, stored: string) {
  let salt: string, encoded: string, options: typeof cost | undefined;
  if (stored.startsWith('scrypt$')) {
    const parts = stored.split('$');
    if (
      parts.length !== 7 ||
      parts[1] !== '1' ||
      Number(parts[2]) !== cost.N ||
      Number(parts[3]) !== cost.r ||
      Number(parts[4]) !== cost.p
    )
      return false;
    salt = parts[5]!;
    encoded = parts[6]!;
    options = cost;
  } else {
    const parts = stored.split(':');
    if (parts.length !== 2) return false;
    salt = parts[0]!;
    encoded = parts[1]!;
  }
  if (!/^[a-f0-9]{32}$/.test(salt) || !/^[a-f0-9]{128}$/.test(encoded)) return false;
  const key = (await scrypt(
    password,
    salt,
    64,
    options ?? { N: 16384, r: 8, p: 1, maxmem: 32 * 1024 * 1024 },
  )) as Buffer;
  const expected = Buffer.from(encoded, 'hex');
  return timingSafeEqual(expected, key);
}
