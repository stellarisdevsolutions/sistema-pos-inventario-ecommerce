import { z } from "zod";

const hasMaxTwoDecimals = (amount: number) =>
  Math.abs(amount * 100 - Math.round(amount * 100)) < 1e-6;

export const openShiftSchema = z.object({
  cashRegisterId: z.number().int().positive("Debes seleccionar una caja registradora válida"),
  userId: z.number().int().positive("Debes asignar un cajero al turno"),
  initialCash: z
    .number()
    .min(0, "El fondo inicial no puede ser negativo")
    .max(9_999_999_999.99, "El fondo inicial supera el límite admitido")
    .refine(hasMaxTwoDecimals, "Usa hasta dos decimales")
    .default(0),
  notes: z
    .string()
    .trim()
    .max(300, "Las observaciones no deben superar los 300 caracteres")
    .optional()
    .nullable(),
});

export const submitCashCountSchema = z.object({
  shiftId: z.number().int().positive("Identificador de turno inválido"),
  actualCash: z
    .number()
    .min(0, "El conteo físico de dinero en gaveta no puede ser negativo")
    .max(9_999_999_999.99)
    .refine(hasMaxTwoDecimals, "Usa hasta dos decimales"),
});

export const closeShiftSchema = submitCashCountSchema.pick({ shiftId: true }).extend({
  mode: z.enum(["approve", "direct"]).optional(),
  actualCash: z
    .number()
    .min(0, "El conteo físico de dinero en gaveta no puede ser negativo")
    .max(9_999_999_999.99)
    .refine(hasMaxTwoDecimals, "Usa hasta dos decimales")
    .optional(),
  expectedCash: z
    .number()
    .finite()
    .min(-9_999_999_999.99)
    .max(9_999_999_999.99)
    .refine(hasMaxTwoDecimals, "Usa hasta dos decimales")
    .optional(),
  actualTransfer: z
    .number()
    .min(0, "El monto verificado de QR no puede ser negativo")
    .max(9_999_999_999.99)
    .refine(hasMaxTwoDecimals, "Usa hasta dos decimales")
    .optional(),
  expectedTransfer: z
    .number()
    .finite()
    .min(-9_999_999_999.99)
    .max(9_999_999_999.99)
    .refine(hasMaxTwoDecimals, "Usa hasta dos decimales")
    .optional(),
  actualCard: z
    .number()
    .min(0, "El monto verificado de tarjeta no puede ser negativo")
    .max(9_999_999_999.99)
    .refine(hasMaxTwoDecimals, "Usa hasta dos decimales")
    .optional(),
  expectedCard: z
    .number()
    .finite()
    .min(-9_999_999_999.99)
    .max(9_999_999_999.99)
    .refine(hasMaxTwoDecimals, "Usa hasta dos decimales")
    .optional(),
  notes: z
    .string()
    .trim()
    .max(500, "La nota del supervisor no debe superar los 500 caracteres")
    .optional()
    .nullable(),
});

export const requestCashRecountSchema = z.object({
  shiftId: z.number().int().positive("Identificador de turno inválido"),
  reason: z
    .string()
    .trim()
    .min(3, "Indica el motivo del reconteo (mínimo 3 caracteres)")
    .max(300, "El motivo del reconteo no debe superar los 300 caracteres"),
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
    .toUpperCase()
    .regex(/^[A-Z0-9_-]+$/, "El código solo puede incluir letras, números, guiones o guion bajo"),
  location: z
    .string()
    .trim()
    .max(120, "La ubicación no debe superar los 120 caracteres")
    .optional()
    .nullable(),
});

export const updateCashRegisterSchema = createCashRegisterSchema.extend({
  id: z.number().int().positive("Identificador de caja inválido"),
});

export const toggleCashRegisterArchiveSchema = z.object({
  id: z.number().int().positive("Identificador de caja inválido"),
  archive: z.boolean(),
});

export const deleteCashRegisterSchema = z.object({
  id: z.number().int().positive("Identificador de caja inválido"),
});

export type OpenShiftInput = z.infer<typeof openShiftSchema>;
export type SubmitCashCountInput = z.infer<typeof submitCashCountSchema>;
export type CloseShiftInput = z.infer<typeof closeShiftSchema>;
export type RequestCashRecountInput = z.infer<typeof requestCashRecountSchema>;
export type CreateCashRegisterInput = z.infer<typeof createCashRegisterSchema>;
export type UpdateCashRegisterInput = z.infer<typeof updateCashRegisterSchema>;
export type ToggleCashRegisterArchiveInput = z.infer<typeof toggleCashRegisterArchiveSchema>;
export type DeleteCashRegisterInput = z.infer<typeof deleteCashRegisterSchema>;
