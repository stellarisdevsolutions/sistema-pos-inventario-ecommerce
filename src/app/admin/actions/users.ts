"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, desc, and, count } from "drizzle-orm";
import { userFormSchema, type UserFormInput } from "@/lib/validations/user";
import { requireRole } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Si se ejecuta fuera de contexto Next.js (tests/scripts), no bloquea
  }
}

export type UserListItem = {
  id: number;
  name: string;
  email: string;
  role: "admin" | "manager" | "cashier" | "warehouse";
  phone: string | null;
  hasPin: boolean;
  pin: string | null;
  isActive: boolean;
  createdAt: string;
};

export type UsersKpisSummary = {
  totalUsers: number;
  adminsCount: number;
  cashiersCount: number;
  activeUsersCount: number;
};

/**
 * 1. Obtiene la lista completa de usuarios del sistema con métricas clave
 */
export async function getUsersAction(): Promise<{
  success: boolean;
  users: UserListItem[];
  kpis: UsersKpisSummary;
  error?: string;
}> {
  try {
    await requireRole(["admin"]);

    const list = await db.query.users.findMany({
      orderBy: (u, { asc }) => [asc(u.id)],
    });

    let adminsCount = 0;
    let cashiersCount = 0;
    let activeUsersCount = 0;

    const formatted: UserListItem[] = list.map((u) => {
      if (u.isActive) activeUsersCount += 1;
      if (u.role === "admin" || u.role === "manager") adminsCount += 1;
      if (u.role === "cashier") cashiersCount += 1;

      const dateStr = u.createdAt ? new Date(u.createdAt).toLocaleDateString("es-BO") : "Reciente";

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        phone: u.phone,
        hasPin: Boolean(u.pin && u.pin.trim().length >= 4),
        pin: u.pin,
        isActive: u.isActive,
        createdAt: dateStr,
      };
    });

    return {
      success: true,
      users: formatted,
      kpis: {
        totalUsers: list.length,
        adminsCount,
        cashiersCount,
        activeUsersCount,
      },
    };
  } catch (error: any) {
    console.error("Error al obtener usuarios:", error);
    return {
      success: false,
      users: [],
      kpis: { totalUsers: 0, adminsCount: 0, cashiersCount: 0, activeUsersCount: 0 },
      error: error.message || "Error al cargar usuarios.",
    };
  }
}

/**
 * 2. Registrar un nuevo usuario (Cajero, Supervisor, Almacenero o Admin)
 */
export async function createUserAction(input: UserFormInput): Promise<{
  success: boolean;
  userId?: number;
  error?: string;
}> {
  try {
    await requireRole(["admin"]);

    const parsed = userFormSchema.parse(input);

    // 1. Validar que el email no esté duplicado
    const existing = await db.query.users.findFirst({
      where: eq(schema.users.email, parsed.email),
    });

    if (existing) {
      return { success: false, error: "Ya existe un usuario con este correo electrónico." };
    }

    const rawPassword = parsed.password && parsed.password.trim().length >= 6
      ? parsed.password.trim()
      : "aura123456";

    const passwordHash = hashPassword(rawPassword);

    const cleanPin = parsed.pin && parsed.pin.trim() ? parsed.pin.trim() : null;

    const [newUser] = await db
      .insert(schema.users)
      .values({
        name: parsed.name,
        email: parsed.email,
        passwordHash,
        pin: cleanPin,
        role: parsed.role,
        phone: parsed.phone || null,
        isActive: parsed.isActive ?? true,
      })
      .returning();

    safeRevalidatePath("/admin/usuarios");
    safeRevalidatePath("/admin/ventas");
    safeRevalidatePath("/admin/cajas");

    return { success: true, userId: newUser.id };
  } catch (error: any) {
    console.error("Error al crear usuario:", error);
    return { success: false, error: error.message || "Error al crear usuario." };
  }
}

/**
 * 3. Actualizar datos, rol, contraseña o PIN de un usuario
 */
export async function updateUserAction(
  userId: number,
  input: Partial<UserFormInput>
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireRole(["admin"]);

    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, userId),
    });

    if (!user) {
      return { success: false, error: "El usuario no fue encontrado." };
    }

    const updates: any = {};

    if (input.name !== undefined) updates.name = input.name.trim();
    if (input.email !== undefined && input.email !== user.email) {
      const existing = await db.query.users.findFirst({
        where: eq(schema.users.email, input.email.trim().toLowerCase()),
      });
      if (existing) {
        return { success: false, error: "El correo ya está en uso por otro usuario." };
      }
      updates.email = input.email.trim().toLowerCase();
    }
    if (input.role !== undefined) updates.role = input.role;
    if (input.phone !== undefined) updates.phone = input.phone ? input.phone.trim() : null;
    if (input.isActive !== undefined) updates.isActive = input.isActive;
    if (input.pin !== undefined) {
      updates.pin = input.pin && input.pin.trim() ? input.pin.trim() : null;
    }
    if (input.password && input.password.trim().length >= 6) {
      updates.passwordHash = hashPassword(input.password.trim());
    }

    await db.update(schema.users).set(updates).where(eq(schema.users.id, userId));

    safeRevalidatePath("/admin/usuarios");
    safeRevalidatePath("/admin/ventas");
    safeRevalidatePath("/admin/cajas");

    return { success: true };
  } catch (error: any) {
    console.error("Error al actualizar usuario:", error);
    return { success: false, error: error.message || "Error al actualizar usuario." };
  }
}

/**
 * 4. Activar o desactivar usuario
 */
export async function toggleUserStatusAction(
  userId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireRole(["admin"]);

    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, userId),
    });

    if (!user) {
      return { success: false, error: "Usuario no encontrado." };
    }

    // No permitir desactivar al usuario admin #1 si es el único
    if (user.id === 1 && user.role === "admin") {
      return {
        success: false,
        error: "No se puede desactivar al Administrador Principal del sistema.",
      };
    }

    await db
      .update(schema.users)
      .set({ isActive: !user.isActive })
      .where(eq(schema.users.id, userId));

    safeRevalidatePath("/admin/usuarios");
    safeRevalidatePath("/admin/ventas");
    safeRevalidatePath("/admin/cajas");

    return { success: true };
  } catch (error: any) {
    console.error("Error al cambiar estado de usuario:", error);
    return { success: false, error: error.message };
  }
}

/**
 * 5. Validar PIN de supervisor para autorizaciones de mostrador (Devoluciones, anulaciones, descuentos)
 */
export async function verifySupervisorPinAction(
  pin: string
): Promise<{ success: boolean; supervisor?: { id: number; name: string; role: string }; error?: string }> {
  try {
    const cleanPin = pin.trim();
    if (!cleanPin || cleanPin.length < 4) {
      return { success: false, error: "El PIN debe tener al menos 4 dígitos numéricos." };
    }

    const supervisor = await db.query.users.findFirst({
      where: and(
        eq(schema.users.pin, cleanPin),
        eq(schema.users.isActive, true)
      ),
    });

    if (!supervisor || (supervisor.role !== "admin" && supervisor.role !== "manager")) {
      return {
        success: false,
        error: "PIN incorrecto o el usuario no posee rol de Administrador/Supervisor autorizado.",
      };
    }

    return {
      success: true,
      supervisor: {
        id: supervisor.id,
        name: supervisor.name,
        role: supervisor.role,
      },
    };
  } catch (error: any) {
    console.error("Error al verificar PIN de supervisor:", error);
    return { success: false, error: "Error al validar PIN de autorización." };
  }
}
