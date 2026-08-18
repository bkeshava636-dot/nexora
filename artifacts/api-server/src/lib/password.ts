import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;

/** Hashes a plaintext password into a `salt:hash` string (both hex-encoded). */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `${salt}:${hash}`;
}

/** Verifies a plaintext password against a `salt:hash` string produced by {@link hashPassword}. */
export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) return false;

  const hashBuffer = Buffer.from(hash, "hex");
  const candidateBuffer = scryptSync(password, salt, KEY_LENGTH);

  return hashBuffer.length === candidateBuffer.length && timingSafeEqual(hashBuffer, candidateBuffer);
}
