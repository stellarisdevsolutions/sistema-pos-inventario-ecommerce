import { z } from "zod";

export const purchaseItemSchema = z.object({
  productId: z.number().int().positive("Debes seleccionar un producto valido"),
  quantity: z.number().int().positive("La cantidad debe ser al menos 1 unidad").max(2_147_483_647),
  unitCost: z.number().min(0, "El costo unitario no puede ser negativo").max(99999999.99),
});

export const purchaseFormSchema = z.object({
  requestId: z.uuid().optional(),
  supplierId: z.number().int().positive("Selecciona un proveedor valido"),
  invoiceNumber: z
    .string()
    .trim()
    .max(60, "El numero de factura no debe superar los 60 caracteres")
    .optional()
    .nullable(),
  paymentMethod: z.enum(["cash", "card", "transfer", "other"]).default("transfer"),
  paymentStatus: z.enum(["paid", "pending", "partial"]).optional().default("paid"),
  status: z.enum(["received", "pending"]).optional().default("received"),
  notes: z
    .string()
    .trim()
    .max(500, "Las notas no deben superar los 500 caracteres")
    .optional()
    .nullable(),
  items: z
    .array(purchaseItemSchema)
    .min(1, "Debes agregar al menos un producto a la orden de compra")
    .max(200)
    .refine((items) => new Set(items.map((item) => item.productId)).size === items.length,
      "Cada producto debe aparecer una sola vez en la compra."),
});

export type PurchaseItemInput = z.infer<typeof purchaseItemSchema>;
export type PurchaseFormInput = z.infer<typeof purchaseFormSchema>;

const positiveInteger = z.number().int().min(1).max(2147483647);

export const purchaseReturnSchema = z.object({
  purchaseId: positiveInteger,
  requestId: z.uuid(),
  reason: z.string().trim().min(1, "Indica el motivo de la devolución.").max(500),
  creditNoteReference: z.string().trim().max(60).optional(),
  items: z.array(z.object({ purchaseItemId: positiveInteger, quantity: positiveInteger }))
    .min(1, "Indica cuántas unidades vas a devolver.")
    .max(200)
    .refine((items) => new Set(items.map(item => item.purchaseItemId)).size === items.length,
      "Cada línea de compra debe aparecer una sola vez."),
});

export type PurchaseReturnInput = z.infer<typeof purchaseReturnSchema>;
