import { z } from "zod";

/**
 * Convierte un texto a slug amigable para URLs (ej: "Reloj Watch X1 Pro" -> "reloj-watch-x1-pro")
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remueve acentos y tildes
    .replace(/[^a-z0-9\s-]/g, "")     // Remueve caracteres no alfanuméricos
    .replace(/\s+/g, "-")            // Reemplaza espacios con guiones
    .replace(/-+/g, "-")             // Evita guiones múltiples
    .replace(/^-+|-+$/g, "");        // Elimina guiones al inicio o final
}

/**
 * Genera un código SKU interno aleatorio en caso de que el usuario no ingrese uno
 */
export function generateInternalSku(prefix = "PROD"): string {
  const random = Math.random().toString(36).substring(2, 7).toUpperCase();
  const timestamp = Date.now().toString(36).substring(3, 7).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Esquema de validación para los datos ingresados en el formulario de Crear/Editar Producto
 */
export const productFormSchema = z.object({
  name: z
    .string().trim()
    .min(2, "El nombre comercial debe tener al menos 2 caracteres.")
    .max(180, "El nombre no puede superar los 180 caracteres."),
  description: z.string().optional().default(""),
  mainImage: z
    .string()
    .optional()
    .nullable(),
  additionalImages: z
    .array(z.string())
    .max(6, "Puedes cargar hasta un máximo de 6 fotos adicionales.")
    .default([]),

  // Precios en Bolivianos (Bs)
  price: z.coerce
    .number({ message: "El precio de venta debe ser un número válido." })
    .min(0.01, "El precio de venta al público debe ser mayor a 0 Bs.").max(9999999999.99),
  costPrice: z.coerce
    .number({ message: "El costo unitario debe ser un número válido." })
    .min(0, "El costo de adquisición no puede ser negativo.").max(9999999999.99)
    .default(0),

  // Relaciones maestras (IDs de categoría, marca y proveedor)
  categoryId: z.coerce.number().int().positive().optional().nullable(),
  brandId: z.coerce.number().int().positive().optional().nullable(),
  supplierId: z.coerce.number().int().positive().optional().nullable(),

  // Control de Stock Físico
  initialStock: z.coerce
    .number()
    .int("El stock inicial debe ser un número entero.")
    .min(0, "El stock inicial no puede ser negativo.").max(2147483647)
    .default(0),
  minStock: z.coerce
    .number()
    .int("El umbral de alerta debe ser un número entero.")
    .min(1, "El umbral mínimo de stock debe ser al menos 1 unidad.")
    .default(5),

  // Estados y Visibilidad Multicanal
  isActive: z
    .boolean()
    .default(true)
    .describe("Estado operativo maestro: si es true, el producto está habilitado para cobro en mostrador POS."),
  isVisibleWeb: z
    .boolean()
    .default(true)
    .describe("Visibilidad en eCommerce: si es true y está activo, se muestra a clientes en el catálogo web."),
  isFeatured: z
    .boolean()
    .default(false)
    .describe("Destacado: si es true, se exhibe en la sección principal de la tienda online."),

  sku: z.string().trim().max(60).optional().nullable(),
  barcode: z.string().trim().max(60).optional().nullable(),
  modelCode: z.string().trim().max(60).regex(/^[A-Za-z0-9_-]*$/, "El grupo admite letras, números, guiones y guiones bajos.").optional().nullable(),
  variant: z.string().trim().max(100).optional().nullable(),
  variantSelector: z.string().trim().max(60).optional().nullable(),
  variantColor: z.string().trim().regex(/^(#[0-9a-fA-F]{6})?$/, "Escribe un color hexadecimal válido.").optional().nullable(),
}).refine(data => Boolean(data.modelCode) === Boolean(data.variant),
  { path: ["variant"], message: "Completa el grupo y la variante juntos." })
  .refine(data => Boolean(data.variant) || !data.variantColor && !data.variantSelector,
    { path: ["variant"], message: "El selector y el color requieren una variante." });

export type ProductFormInput = z.infer<typeof productFormSchema>;

/**
 * Esquema de inserción preparado para la base de datos (PostgreSQL / Drizzle ORM)
 * Normaliza los datos del formulario antes de guardarlos en el catálogo
 */
export const productDbInsertSchema = productFormSchema.transform((data) => {
  return {
    name: data.name.trim(),
    slug: slugify(data.name) || `producto-${Date.now()}`,
    modelCode: data.modelCode?.toUpperCase() || null,
    variant: data.variant || null,
    variantColor: data.variantColor || null,
    sku: data.sku && data.sku.trim() !== "" ? data.sku.trim() : null,
    barcode: data.barcode && data.barcode.trim() !== "" ? data.barcode.trim() : null,
    description: data.description.trim() || null,
    price: data.price.toFixed(2),
    costPrice: data.costPrice.toFixed(2),
    stock: data.initialStock,
    minStock: data.minStock,
    imageUrl: data.mainImage || null,
    images: data.additionalImages || [],
    categoryId: data.categoryId || null,
    brandId: data.brandId || null,
    supplierId: data.supplierId || null,
    isActive: data.isActive,
    isVisibleWeb: data.isActive ? data.isVisibleWeb : false, // Si está inactivo, nunca se muestra en la web
    isFeatured: data.isActive && data.isVisibleWeb ? data.isFeatured : false,
  };
});

export type ProductDbInsert = z.output<typeof productDbInsertSchema>;
