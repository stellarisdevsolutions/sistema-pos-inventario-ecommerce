import { db } from "@/db";
import * as schema from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import {
  type SessionUser,
  type UserRole,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  encodeSessionToken,
  decodeSessionToken,
} from "./session-edge";

export type { SessionUser, UserRole };
export { SESSION_COOKIE_NAME, encodeSessionToken, decodeSessionToken };

/**
 * Guarda la sesión del usuario en una cookie HTTP-Only segura
 */
export async function createSession(user: SessionUser): Promise<void> {
  const token = await encodeSessionToken(user);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

/**
 * Obtiene el usuario autenticado actual desde la cookie de sesión
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;
    const claims = await decodeSessionToken(token);
    if (!claims) return null;

    const user = await db.query.users.findFirst({
      where: (users, { and, eq }) => and(eq(users.id, claims.id), eq(users.isActive, true)),
      columns: { id: true, name: true, email: true, role: true, phone: true, sessionVersion: true },
    });
    if (!user || user.role !== claims.role) return null;
    if ((claims.sessionVersion ?? 1) !== user.sessionVersion) return null;
    return user;
  } catch {
    return null;
  }
}

/**
 * Destruye la sesión activa invalidando el token y eliminando la cookie
 */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    const claims = await decodeSessionToken(token);
    if (claims) {
      await db
        .update(schema.users)
        .set({ sessionVersion: sql`${schema.users.sessionVersion} + 1` })
        .where(and(eq(schema.users.id, claims.id), eq(schema.users.sessionVersion, claims.sessionVersion ?? 1)));
    }
  }
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export class AdminAccessError extends Error {}

/**
 * Guardia de servidor: Requiere sesión activa o lanza un error
 */
export async function requireAuth(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new AdminAccessError("No autorizado: Debes iniciar sesión para continuar.");
  }
  return user;
}

/**
 * Guardia de servidor: Requiere uno de los roles permitidos
 */
export async function requireRole(allowedRoles: UserRole[]): Promise<SessionUser> {
  const user = await requireAuth();
  if (!allowedRoles.includes(user.role)) {
    throw new AdminAccessError(
      `Acceso denegado: Tu rol (${user.role}) no tiene permisos para realizar esta operación.`
    );
  }
  return user;
}
