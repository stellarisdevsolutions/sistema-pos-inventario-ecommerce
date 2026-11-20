"use server";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { createSession, destroySession, getCurrentUser, type SessionUser } from "@/lib/auth/session";
import { verifyDemoLogin } from "@/lib/auth/demo-login";
import { verifyPassword } from "@/lib/auth/password";
import { revalidatePath } from "next/cache";

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
    if (typeof email !== "string" || email.length > 254 ||
        typeof password !== "string" || password.length > 100) {
      return { success: false, error: "Credenciales inválidas." };
    }
    const cleanEmail = email.toLowerCase().trim();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      return { success: false, error: "Debes ingresar tu correo y contraseña." };
    }

    // 1. Buscar usuario en la base de datos
    const user = await db.query.users.findFirst({
      where: eq(schema.users.email, cleanEmail),
    });

    if (!user?.isActive || (
      !verifyPassword(cleanPassword, user.passwordHash) &&
      !verifyDemoLogin(user.email, cleanPassword, user.passwordHash)
    )) {
      return { success: false, error: "Credenciales inválidas." };
    }

    // 4. Crear sesión
    const sessionUser: SessionUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone || null,
    };

    await createSession(sessionUser);

    // 5. Determinar ruta de aterrizaje según el rol de negocio
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
    console.error("Error en loginAction:", error instanceof Error ? error.name : "Unknown error");
    return {
      success: false,
      error: "Ocurrió un error inesperado al iniciar sesión.",
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
