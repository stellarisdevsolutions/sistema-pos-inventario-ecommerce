"use server";

import { adminActionError } from "@/lib/admin-action-error";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import type { PgUpdateSetSource } from "drizzle-orm/pg-core";
import { userFormSchema, userUpdateSchema, type UserFormInput } from "@/lib/validations/user";
import { requireRole } from "@/lib/auth/session";
import { encodeSupervisorPin } from "@/lib/auth/supervisor-pin";
import { hashPassword } from "@/lib/auth/password";
import { formatBusinessDate } from "@/lib/business-date";

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
      columns: { passwordHash: false },
      orderBy: (u, { asc }) => [asc(u.id)],
    });

    let adminsCount = 0;
    let cashiersCount = 0;
    let activeUsersCount = 0;

    const formatted: UserListItem[] = list.map((u) => {
      if (u.isActive) activeUsersCount += 1;
      if (u.role === "admin" || u.role === "manager") adminsCount += 1;
      if (u.role === "cashier") cashiersCount += 1;

      const dateStr = u.createdAt ? formatBusinessDate(u.createdAt) : "Reciente";

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        phone: u.phone,
        hasPin: Boolean(u.pin && u.pin.trim().length >= 4),
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
  } catch (error) {
    return {
      success: false,
      users: [],
      kpis: { totalUsers: 0, adminsCount: 0, cashiersCount: 0, activeUsersCount: 0 },
      error: adminActionError(error, "Error al cargar usuarios."),
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

    const existing = await db.query.users.findFirst({
      where: eq(schema.users.email, parsed.email),
    });

    if (existing) {
      return { success: false, error: "Ya existe un usuario con este correo electrónico." };
    }

    const passwordHash = hashPassword(parsed.password);
    const cleanPin = parsed.pin ? encodeSupervisorPin(parsed.pin) : null;

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
  } catch (error) {
    return { success: false, error: adminActionError(error, "Error al crear usuario.") };
  }
}

/**
 * 3. Actualizar datos, rol, contraseña o PIN de un usuario
 */
export async function updateUserAction(
  userId: number,
  input: Partial<UserFormInput> & { clearPin?: boolean }
): Promise<{ success: boolean; error?: string }> {
  try {
    const actor = await requireRole(["admin"]);
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return { success: false, error: "ID de usuario inválido." };
    }
    const parsed = userUpdateSchema.parse(input);
    if (actor.id === userId && (parsed.isActive === false || (parsed.role && parsed.role !== "admin"))) {
      return { success: false, error: "No puedes quitar tus propios permisos de administrador." };
    }

    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, userId),
    });

    if (!user) {
      return { success: false, error: "El usuario no fue encontrado." };
    }

    const updates: PgUpdateSetSource<typeof schema.users> = {};

    if (parsed.name !== undefined) updates.name = parsed.name.trim();
    if (parsed.email !== undefined && parsed.email !== user.email) {
      const existing = await db.query.users.findFirst({
        where: eq(schema.users.email, parsed.email.trim().toLowerCase()),
      });
      if (existing) {
        return { success: false, error: "El correo ya está en uso por otro usuario." };
      }
      updates.email = parsed.email.trim().toLowerCase();
    }
    if (parsed.role !== undefined) updates.role = parsed.role;
    if (parsed.phone !== undefined) updates.phone = parsed.phone ? parsed.phone.trim() : null;
    if (parsed.isActive !== undefined) updates.isActive = parsed.isActive;
    if (parsed.clearPin) {
      updates.pin = null;
    } else if (parsed.pin !== undefined && parsed.pin !== "") {
      updates.pin = parsed.pin ? encodeSupervisorPin(parsed.pin) : null;
    }
    if (parsed.password && parsed.password.trim().length >= 8) {
      updates.passwordHash = hashPassword(parsed.password.trim());
    }

    const shouldRevokeSessions =
      Boolean(updates.passwordHash) ||
      updates.email !== undefined ||
      (updates.role !== undefined && updates.role !== user.role) ||
      updates.isActive === false;
    if (shouldRevokeSessions) {
      updates.sessionVersion = sql`${schema.users.sessionVersion} + 1`;
    }

    if (Object.keys(updates).length === 0) return { success: true };
    await db.update(schema.users).set(updates).where(eq(schema.users.id, userId));

    safeRevalidatePath("/admin/usuarios");
    safeRevalidatePath("/admin/ventas");
    safeRevalidatePath("/admin/cajas");

    return { success: true };
  } catch (error) {
    return { success: false, error: adminActionError(error, "Error al actualizar usuario.") };
  }
}

/**
 * 4. Activar o desactivar usuario
 */
export async function toggleUserStatusAction(
  userId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const actor = await requireRole(["admin"]);
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return { success: false, error: "ID de usuario inválido." };
    }

    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, userId),
    });

    if (!user) {
      return { success: false, error: "Usuario no encontrado." };
    }

    if (user.id === actor.id) {
      return {
        success: false,
        error: "No puedes desactivar tu propia cuenta.",
      };
    }

    const nextIsActive = !user.isActive;
    await db
      .update(schema.users)
      .set({
        isActive: nextIsActive,
        ...(nextIsActive ? {} : { sessionVersion: sql`${schema.users.sessionVersion} + 1` }),
      })
      .where(eq(schema.users.id, userId));

    safeRevalidatePath("/admin/usuarios");
    safeRevalidatePath("/admin/ventas");
    safeRevalidatePath("/admin/cajas");

    return { success: true };
  } catch (error) {
    return { success: false, error: adminActionError(error, "No se pudo completar la operación.") };
  }
}
