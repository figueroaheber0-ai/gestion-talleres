import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedValue: string): boolean {
  const [salt, storedHash] = storedValue.split(':');

  if (!salt || !storedHash) {
    return false;
  }

  const derivedHash = scryptSync(password, salt, 64);
  const storedHashBuffer = Buffer.from(storedHash, 'hex');

  return (
    derivedHash.length === storedHashBuffer.length &&
    timingSafeEqual(derivedHash, storedHashBuffer)
  );
}

export function generateSessionToken(): string {
  return randomBytes(32).toString('hex');
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
