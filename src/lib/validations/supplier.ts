import { z } from "zod";

export const supplierFormSchema = z.object({
  name: z
    .string()
    .min(2, "La razón social o nombre de la empresa debe tener al menos 2 caracteres.")
    .max(150, "El nombre es demasiado largo."),
  contactName: z.string().max(100, "El nombre de contacto es demasiado largo.").optional().nullable(),
  taxId: z.string().max(50, "El NIT o identificación fiscal es demasiado largo.").optional().nullable(),
  email: z
    .string()
    .email("Ingresa un correo electrónico válido.")
    .optional()
    .nullable()
    .or(z.literal("")),
  phone: z.string().max(50, "El teléfono es demasiado largo.").optional().nullable(),
  address: z.string().max(250, "La dirección es demasiado larga.").optional().nullable(),
  notes: z.string().max(500, "Las notas son demasiado extensas.").optional().nullable(),
  isActive: z.boolean().default(true),
});

export type SupplierFormInput = z.infer<typeof supplierFormSchema>;
