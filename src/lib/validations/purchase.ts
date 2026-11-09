import { z } from "zod";

export const purchaseItemSchema = z.object({
  productId: z.number().int().positive("Debes seleccionar un producto valido"),
  quantity: z.number().int().positive("La cantidad debe ser al menos 1 unidad"),
  unitCost: z.number().min(0, "El costo unitario no puede ser negativo"),
});

export const purchaseFormSchema = z.object({
  supplierId: z.number().int().positive("Selecciona un proveedor valido"),
  invoiceNumber: z
    .string()
    .trim()
    .max(60, "El numero de factura no debe superar los 60 caracteres")
    .optional()
    .nullable(),
  paymentMethod: z.enum(["cash", "card", "transfer", "other"]).default("transfer"),
  paymentStatus: z.enum(["paid", "pending", "partial"]).optional().default("paid"),
  status: z.enum(["received", "pending", "cancelled"]).optional().default("received"),
  notes: z
    .string()
    .trim()
    .max(500, "Las notas no deben superar los 500 caracteres")
    .optional()
    .nullable(),
  items: z
    .array(purchaseItemSchema)
    .min(1, "Debes agregar al menos un producto a la orden de compra"),
});

export type PurchaseItemInput = z.infer<typeof purchaseItemSchema>;
export type PurchaseFormInput = z.infer<typeof purchaseFormSchema>;
