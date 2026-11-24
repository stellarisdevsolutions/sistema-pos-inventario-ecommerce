export const USER_ROLES = ["admin", "manager", "cashier", "warehouse"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export interface SessionUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  phone?: string | null;
  sessionVersion?: number;
}

export const SESSION_COOKIE_NAME = "aura_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export class SessionConfigurationError extends Error {}

async function signingKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || new TextEncoder().encode(secret).length < 32) {
    throw new SessionConfigurationError("Configura SESSION_SECRET con al menos 32 bytes aleatorios.");
  }

  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function encodeSessionToken(user: SessionUser): Promise<string> {
  const payload = Buffer.from(JSON.stringify({
    v: 1,
    id: user.id,
    role: user.role,
    ...(user.sessionVersion !== undefined ? { sv: user.sessionVersion } : {}),
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
  })).toString("base64url");
  const signature = await crypto.subtle.sign("HMAC", await signingKey(), Buffer.from(payload));
  return `${payload}.${Buffer.from(signature).toString("hex")}`;
}

export async function decodeSessionToken(
  token: string
): Promise<(Pick<SessionUser, "id" | "role"> & { sessionVersion?: number }) | null> {
  if (typeof token !== "string" || token.length > 512) return null;

  const [payload, signature, extra] = token.split(".");
  if (extra !== undefined || !/^[\w-]+$/.test(payload) || !/^[0-9a-f]{64}$/.test(signature ?? "")) {
    return null;
  }

  try {
    const valid = await crypto.subtle.verify(
      "HMAC",
      await signingKey(),
      Buffer.from(signature, "hex"),
      Buffer.from(payload)
    );
    if (!valid) return null;

    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (
      claims.v !== 1 || !Number.isSafeInteger(claims.id) || claims.id <= 0 ||
      !USER_ROLES.includes(claims.role) ||
      (claims.sv !== undefined && (!Number.isSafeInteger(claims.sv) || claims.sv < 1)) ||
      !Number.isSafeInteger(claims.exp) || claims.exp <= Math.floor(Date.now() / 1000)
    ) return null;

    return claims.sv !== undefined
      ? { id: claims.id, role: claims.role, sessionVersion: claims.sv }
      : { id: claims.id, role: claims.role };
  } catch {
    return null;
  }
}
