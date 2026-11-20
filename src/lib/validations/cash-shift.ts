import { z } from "zod";

export const openShiftSchema = z.object({
  cashRegisterId: z.number().int().positive("Debes seleccionar una caja registradora válida"),
  userId: z.number().int().positive("Debes asignar un cajero al turno"),
  initialCash: z
    .number()
    .min(0, "El fondo inicial no puede ser negativo")
    .default(0),
  notes: z
    .string()
    .trim()
    .max(300, "Las observaciones no deben superar los 300 caracteres")
    .optional()
    .nullable(),
});

export const closeShiftSchema = z.object({
  shiftId: z.number().int().positive("Identificador de turno inválido"),
  actualCash: z
    .number()
    .min(0, "El conteo físico de dinero en gaveta no puede ser negativo"),
  notes: z
    .string()
    .trim()
    .max(500, "La nota del supervisor no debe superar los 500 caracteres")
    .optional()
    .nullable(),
});

export const createCashRegisterSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "El nombre de la caja debe tener al menos 2 caracteres")
    .max(80, "El nombre no debe superar los 80 caracteres"),
  code: z
    .string()
    .trim()
    .min(2, "El código debe tener al menos 2 caracteres")
    .max(20, "El código no debe superar los 20 caracteres")
    .toUpperCase(),
  location: z
    .string()
    .trim()
    .max(120, "La ubicación no debe superar los 120 caracteres")
    .optional()
    .nullable(),
});

export type OpenShiftInput = z.infer<typeof openShiftSchema>;
export type CloseShiftInput = z.infer<typeof closeShiftSchema>;
export type CreateCashRegisterInput = z.infer<typeof createCashRegisterSchema>;
