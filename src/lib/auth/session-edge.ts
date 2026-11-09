export type UserRole = "admin" | "manager" | "cashier" | "warehouse";

export interface SessionUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  pin?: string | null;
  phone?: string | null;
}

export const SESSION_COOKIE_NAME = "aura_session";
export const SESSION_SECRET = process.env.SESSION_SECRET || "aura-secret-session-key-production-bolivia-2026";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 días

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBuffer(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

/**
 * Firma con Web Crypto HMAC-SHA256 (Compatible con Edge Runtime y Node.js)
 */
export async function signWithWebCrypto(data: string, secret = SESSION_SECRET): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return bufferToHex(signature);
}

/**
 * Codifica y firma los datos de sesión en un token seguro
 */
export async function encodeSessionToken(user: SessionUser): Promise<string> {
  const json = JSON.stringify({
    ...user,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
  });

  // Codificar base64url compatible con Edge y Node
  const b64 = Buffer.from(json, "utf-8").toString("base64url");
  const signature = await signWithWebCrypto(b64);
  return `${b64}.${signature}`;
}

/**
 * Decodifica y verifica la integridad del token de sesión en Edge Runtime o Node.js
 */
export async function decodeSessionToken(token: string): Promise<SessionUser | null> {
  if (!token || !token.includes(".")) return null;
  const [b64, signature] = token.split(".");
  if (!b64 || !signature) return null;

  try {
    const expectedSignature = await signWithWebCrypto(b64);
    if (signature.length !== expectedSignature.length) return null;

    // Comparación segura
    const a = hexToBuffer(signature);
    const b = hexToBuffer(expectedSignature);
    let diff = 0;
    for (let i = 0; i < a.length; i++) {
      diff |= a[i] ^ b[i];
    }
    if (diff !== 0) return null;

    const json = Buffer.from(b64, "base64url").toString("utf-8");
    const payload = JSON.parse(json);

    // Verificar expiración
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return {
      id: Number(payload.id),
      name: String(payload.name),
      email: String(payload.email),
      role: payload.role as UserRole,
      pin: payload.pin || null,
      phone: payload.phone || null,
    };
  } catch {
    return null;
  }
}
