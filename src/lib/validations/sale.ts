import { z } from "zod";

export const saleItemSchema = z.object({
  productId: z.number().int().positive("Debes seleccionar un producto válido"),
  quantity: z.number().int().positive("La cantidad debe ser al menos 1 unidad"),
  unitPrice: z.number().min(0, "El precio unitario no puede ser negativo"),
});

export const saleFormSchema = z.object({
  customerId: z.number().int().positive().optional().nullable(),
  customerName: z
    .string()
    .trim()
    .min(1, "El nombre del cliente no puede estar vacío")
    .max(120, "El nombre del cliente no debe superar los 120 caracteres")
    .default("Público General"),
  customerTaxId: z
    .string()
    .trim()
    .max(40, "El NIT / CI no debe superar los 40 caracteres")
    .optional()
    .nullable(),
  paymentMethod: z.enum(["cash", "card", "transfer", "other"]).default("cash"),
  cashGiven: z.number().min(0, "El monto recibido no puede ser negativo").optional().nullable(),
  changeGiven: z.number().min(0, "El cambio no puede ser negativo").optional().nullable(),
  discountAmount: z.number().min(0, "El descuento no puede ser negativo").default(0),
  notes: z
    .string()
    .trim()
    .max(500, "Las notas no deben superar los 500 caracteres")
    .optional()
    .nullable(),
  cashShiftId: z.number().int().positive().optional().nullable(),
  isAdministrativeSale: z.boolean().default(false),
  userId: z.number().int().positive().default(1),
  channel: z.enum(["pos", "online"]).default("pos"),
  items: z
    .array(saleItemSchema)
    .min(1, "Debes agregar al menos un producto a la venta"),
});

export type SaleItemInput = z.infer<typeof saleItemSchema>;
export type SaleFormInput = z.infer<typeof saleFormSchema>;
