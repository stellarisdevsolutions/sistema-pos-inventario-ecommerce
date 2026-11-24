"use server";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { DrizzleQueryError, eq } from "drizzle-orm";
import { createSession, destroySession, getCurrentUser, type SessionUser } from "@/lib/auth/session";
import { SessionConfigurationError } from "@/lib/auth/session-edge";
import { verifyDemoLogin } from "@/lib/auth/demo-login";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { checkRateLimit, recordFailedAttempt, resetRateLimit } from "@/lib/auth/rate-limit";
import { revalidatePath } from "next/cache";

const DUMMY_PASSWORD_HASH = hashPassword("aura-timing-equalizer-dummy-secret");
const LOGIN_MAX_ATTEMPTS = 10;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

export interface LoginResult {
  success: boolean;
  error?: string;
  user?: SessionUser;
  redirectTo?: string;
}

/**
 * Autentica credenciales reales contra PostgreSQL y establece la cookie de sesión
 */
export async function loginAction(email: string, password: string): Promise<LoginResult> {
  try {
    if (
      typeof email !== "string" ||
      email.length > 254 ||
      typeof password !== "string" ||
      password.length > 128
    ) {
      return { success: false, error: "Credenciales inválidas." };
    }
    const cleanEmail = email.toLowerCase().trim();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      return { success: false, error: "Debes ingresar tu correo y contraseña." };
    }

    const rateKey = `login:${cleanEmail}`;
    const limit = checkRateLimit(rateKey, LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_MS);
    if (!limit.allowed) {
      return {
        success: false,
        error: "Demasiados intentos fallidos. Intenta de nuevo en unos minutos.",
      };
    }

    const user = await db.query.users.findFirst({
      where: eq(schema.users.email, cleanEmail),
    });

    if (!user?.isActive) {
      verifyPassword(cleanPassword, DUMMY_PASSWORD_HASH);
      recordFailedAttempt(rateKey, LOGIN_WINDOW_MS);
      return { success: false, error: "Credenciales inválidas." };
    }

    const passwordValid =
      verifyPassword(cleanPassword, user.passwordHash) ||
      verifyDemoLogin(user.email, cleanPassword, user.passwordHash);

    if (!passwordValid) {
      recordFailedAttempt(rateKey, LOGIN_WINDOW_MS);
      return { success: false, error: "Credenciales inválidas." };
    }

    resetRateLimit(rateKey);

    const sessionUser: SessionUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone || null,
      sessionVersion: user.sessionVersion,
    };

    await createSession(sessionUser);

    let redirectTo = "/admin";
    if (user.role === "cashier") {
      redirectTo = "/admin/ventas";
    } else if (user.role === "warehouse") {
      redirectTo = "/admin/inventario";
    }

    try {
      revalidatePath("/admin", "layout");
    } catch {}

    return {
      success: true,
      user: sessionUser,
      redirectTo,
    };
  } catch (error) {
    console.error("Error en loginAction:", error instanceof Error ? error.constructor.name : "Unknown error");
    if (process.env.NODE_ENV === "development") {
      if (error instanceof SessionConfigurationError) {
        return {
          success: false,
          error: error.message || "Configura SESSION_SECRET con una clave aleatoria de al menos 32 bytes.",
        };
      }
      if (error instanceof DrizzleQueryError) {
        return {
          success: false,
          error: "No se pudo consultar la base de datos. Revisa DATABASE_URL y que el esquema esté aplicado.",
        };
      }
    }
    return {
      success: false,
      error: "No se pudo iniciar sesión. Intenta nuevamente.",
    };
  }
}

/**
 * Cierra la sesión activa y elimina la cookie
 */
export async function logoutAction(): Promise<{ success: boolean }> {
  try {
    await destroySession();
    try {
      revalidatePath("/admin", "layout");
    } catch {}
    return { success: true };
  } catch (error) {
    console.error("Error al cerrar sesión:", error);
    return { success: false };
  }
}

/**
 * Obtiene el usuario autenticado actual desde el servidor
 */
export async function getCurrentUserAction(): Promise<{ success: boolean; user: SessionUser | null }> {
  try {
    const user = await getCurrentUser();
    return { success: true, user };
  } catch {
    return { success: false, user: null };
  }
}
