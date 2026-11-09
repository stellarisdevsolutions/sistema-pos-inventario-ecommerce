"use server";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { createSession, destroySession, getCurrentUser, type SessionUser, type UserRole } from "@/lib/auth/session";
import { verifyPassword, hashPassword } from "@/lib/auth/password";
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
    const cleanEmail = email.toLowerCase().trim();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      return { success: false, error: "Debes ingresar tu correo y contraseña." };
    }

    // 1. Buscar usuario en la base de datos
    const user = await db.query.users.findFirst({
      where: eq(schema.users.email, cleanEmail),
    });

    if (!user) {
      return { success: false, error: "Credenciales inválidas. Verifica tu correo." };
    }

    if (!user.isActive) {
      return {
        success: false,
        error: "Tu cuenta de usuario se encuentra suspendida o inactiva. Contacta al Administrador.",
      };
    }

    // 2. Verificar contraseña
    const isPasswordValid = verifyPassword(cleanPassword, user.passwordHash);
    if (!isPasswordValid) {
      return { success: false, error: "Contraseña incorrecta." };
    }

    // 3. Si la contraseña almacenada era formato legacy, actualizar a PBKDF2 de inmediato
    if (!user.passwordHash.startsWith("pbkdf2:")) {
      try {
        const secureHash = hashPassword(cleanPassword);
        await db
          .update(schema.users)
          .set({ passwordHash: secureHash })
          .where(eq(schema.users.id, user.id));
      } catch (e) {
        console.error("Error al migrar hash de contraseña:", e);
      }
    }

    // 4. Crear sesión
    const sessionUser: SessionUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as UserRole,
      pin: user.pin || null,
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
  } catch (error: any) {
    console.error("Error en loginAction:", error);
    return {
      success: false,
      error: error.message || "Ocurrió un error inesperado al iniciar sesión.",
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
    return { success: true };
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
