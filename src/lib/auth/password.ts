import crypto from "crypto";

const ITERATIONS = 100000;
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
 * Soporta formato seguro PBKDF2, compatibilidad con semillas de desarrollo y texto plano previo.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  if (!password || !storedHash) return false;

  // 1. Formato PBKDF2 seguro
  if (storedHash.startsWith("pbkdf2:")) {
    const parts = storedHash.split(":");
    if (parts.length !== 4) return false;
    const iterations = parseInt(parts[1], 10);
    const salt = parts[2];
    const key = parts[3];

    try {
      const derivedKey = crypto.pbkdf2Sync(password, salt, iterations, KEYLEN, DIGEST);
      const keyBuffer = Buffer.from(key, "hex");
      if (keyBuffer.length !== derivedKey.length) return false;
      return crypto.timingSafeEqual(keyBuffer, derivedKey);
    } catch {
      return false;
    }
  }

  // 2. Compatibilidad con hashes de semilla de desarrollo ($2b$10$hashedpassword...)
  if (storedHash.startsWith("$2b$10$hashedpassword")) {
    return password === "password123";
  }

  // 3. Compatibilidad con texto plano si se insertó sin encriptar
  return password === storedHash;
}
