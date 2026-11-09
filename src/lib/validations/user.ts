import { z } from "zod";

export const userRoleEnumSchema = z.enum(["admin", "manager", "cashier", "warehouse"]);

export const userFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(100, "El nombre no debe superar los 100 caracteres"),
  email: z
    .string()
    .trim()
    .email("Ingresa un correo electrónico válido")
    .toLowerCase(),
  password: z
    .string()
    .min(6, "La contraseña debe tener al menos 6 caracteres")
    .max(100, "La contraseña no debe superar los 100 caracteres")
    .optional()
    .or(z.literal("")),
  pin: z
    .string()
    .trim()
    .regex(/^[0-9]{4,6}$/, "El PIN debe tener entre 4 y 6 dígitos numéricos")
    .optional()
    .nullable()
    .or(z.literal("")),
  role: userRoleEnumSchema.default("cashier"),
  phone: z
    .string()
    .trim()
    .max(30, "El teléfono no debe superar los 30 caracteres")
    .optional()
    .nullable()
    .or(z.literal("")),
  isActive: z.boolean().default(true),
});

export type UserFormInput = z.infer<typeof userFormSchema>;
