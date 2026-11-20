import crypto from "crypto";

const ITERATIONS = 210000;
const KEYLEN = 64;
const DIGEST = "sha512";

/**
 * Genera un hash seguro con sal única usando PBKDF2 nativo de Node.js
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEYLEN, DIGEST);
  return `pbkdf2:${ITERATIONS}:${salt}:${derivedKey.toString("hex")}`;
}

/**
 * Valida una contraseña contra el hash almacenado.
 * Acepta hashes PBKDF2 existentes y los generados con el costo actual.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  if (!password || !storedHash) return false;

  // 1. Formato PBKDF2 seguro
  if (storedHash.startsWith("pbkdf2:")) {
    const parts = storedHash.split(":");
    if (parts.length !== 4) return false;
    const iterations = Number(parts[1]);
    const salt = parts[2];
    const key = parts[3];

    if (!Number.isSafeInteger(iterations) || iterations < 100000 || iterations > ITERATIONS ||
        !/^[a-f0-9]{32}$/.test(salt) || !/^[a-f0-9]{128}$/.test(key)) return false;

    try {
      const derivedKey = crypto.pbkdf2Sync(password, salt, iterations, KEYLEN, DIGEST);
      const keyBuffer = Buffer.from(key, "hex");
      if (keyBuffer.length !== derivedKey.length) return false;
      return crypto.timingSafeEqual(keyBuffer, derivedKey);
    } catch {
      return false;
    }
  }

  return false;
}
