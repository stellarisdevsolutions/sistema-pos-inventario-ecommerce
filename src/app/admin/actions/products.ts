"use server";

import { adminActionError } from "@/lib/admin-action-error";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { automaticModelCode, automaticSku, createCatalogProductsQuery, type CatalogEntry } from "@/db/operations/catalog";
import { extendModelOptions, modelDimensions } from "@/lib/model-variants";
import { deleteUnusedProductQuery, hasNoProductHistory } from "@/db/operations/catalog";
import { productName } from "@/lib/product-name";
import { inventoryAdjustmentQuery } from "@/db/operations/inventory-adjustment";
import {
  businessDate,
  formatBusinessDate,
  formatBusinessDateTime,
  formatBusinessTime,
} from "@/lib/business-date";
import { z } from "zod";
import * as schema from "@/db/schema";
import { and, asc, eq, inArray, ne, sql } from "drizzle-orm";
import {
  productFormSchema,
  productOptionsSchema,
  productOptionConfigSchema,
  categoryInputSchema,
  brandInputSchema,
  type ProductOptionInput,
  type ProductOptionConfig,
  productDbInsertSchema,
  slugify,
  type ProductFormInput,
} from "@/lib/validations/product";
import { requireRole } from "@/lib/auth/session";

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Si se ejecuta fuera del contexto de una petición Next.js (ej. tests o scripts), no bloquea
  }
}

export type ActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

function refreshCatalog() {
  for (const path of ["/admin", "/admin/inventario", "/admin/ventas", "/admin/compras/nueva", "/catalogo", "/"]) safeRevalidatePath(path);
}

const eligibility = hasNoProductHistory(sql`"products"."id"`).as("can_hard_delete");

export async function deleteProductAction(id: number): Promise<ActionResult> {
  try {
    await requireRole(["admin", "manager", "warehouse"]);
    const [, , result] = await db.batch([
      db.execute(sql`SELECT code FROM product_models WHERE code = (SELECT model_code FROM products WHERE id = ${id}) FOR UPDATE`),
      db.execute(sql`SELECT id FROM products WHERE id = ${id} FOR UPDATE`),
      db.execute(deleteUnusedProductQuery(id)),
    ]);
    if (!result.rows.length) return { success: false, error: "El producto ya no existe o tiene historial comercial. Puedes archivarlo para conservar sus movimientos." };
    refreshCatalog();
    return { success: true };
  } catch (error) {
    return { success: false, error: adminActionError(error, "No se pudo eliminar el producto. Actualiza su ficha.") };
  }
}

/**
 * Obtiene todos los productos de la base de datos para la tabla de inventario
 */
export async function getInventoryProducts() {
  try {
    await requireRole(["admin", "manager", "warehouse"]);

    const prods = await db.query.products.findMany({
      extras: { canHardDelete: eligibility },
      with: {
        category: true,
        brand: true,
        supplier: true,
        model: true,
      },
      orderBy: (p, { desc }) => [desc(p.id)],
    });

    if (prods.length === 0) return [];

    return prods.map((p) => {
      const effectiveMainImage = p.imageUrl || p.model?.imageUrl || null;
      const modelGallery = p.model?.images ?? [];
      const rawGallery = modelGallery.length > 0 ? modelGallery : (p.images ?? []);
      const images = [
        ...new Set(
          [p.imageUrl, p.model?.imageUrl, ...rawGallery].filter(
            (img): img is string => Boolean(img && img.trim())
          )
        ),
      ];

      return {
        id: p.id,
        canHardDelete: p.canHardDelete,
        name: productName(p),
        slug: p.slug,
        sku: p.sku || `PROD-${p.id.toString().padStart(4, "0")}`,
        barcode: p.barcode || "-",
        category: p.category?.name || "Sin categoría",
        price: parseFloat(p.price) || 0,
        costPrice: parseFloat(p.costPrice) || 0,
        stock: p.stock,
        minStock: p.minStock,
        status: (p.stock === 0
          ? "out_of_stock"
          : p.stock <= p.minStock
          ? "low_stock"
          : "in_stock") as "in_stock" | "low_stock" | "out_of_stock",
        isActive: p.isActive ?? true,
        isArchived: p.isArchived ?? false,
        isVisibleWeb: p.isVisibleWeb ?? true,
        isFeatured: p.isFeatured ?? false,
        description: p.description || null,
        image:
          effectiveMainImage ||
          images[0] ||
          "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=150&auto=format&fit=crop&q=80",
        images,
        modelCode: p.modelCode || null,
        variant: p.variant || null,
        variantColor: p.variantColor || null,
        attributes: p.attributes ?? null,
        brand: p.brand?.name || null,
        supplier: p.supplier?.name || null,
      };
    });
  } catch (error) {
    console.error("Error al obtener productos de inventario:", error);
    return [];
  }
}

/**
 * Obtiene las categorías, marcas y proveedores activos desde la base de datos
 * para poblar los selectores del formulario de producto.
 */
export async function getInventoryFormData() {
  try {
    await requireRole(["admin", "manager", "warehouse"]);

    const [categoriesList, brandsList, suppliersList] = await Promise.all([
      db.select().from(schema.categories).where(eq(schema.categories.isActive, true)),
      db.select().from(schema.brands).orderBy(asc(schema.brands.name)),
      db.select().from(schema.suppliers).where(eq(schema.suppliers.isActive, true)),
    ]);

    return {
      categories: categoriesList.map((c) => ({ id: c.id, name: c.name, imageUrl: c.imageUrl })),
      brands: brandsList.map((b) => ({ id: b.id, name: b.name })),
      suppliers: suppliersList.map((s) => ({ id: s.id, name: s.name })),
    };
  } catch (error) {
    console.error("Error al obtener datos auxiliares de inventario:", error);
    return { categories: [], brands: [], suppliers: [] };
  }
}

export async function getProductModelsForForm() {
  await requireRole(["admin", "manager", "warehouse"]);
  const [models, variants] = await Promise.all([
    db.query.productModels.findMany({
      columns: { code: true, name: true, variantSelector: true, options: true },
      orderBy: (model, { asc }) => [asc(model.name), asc(model.code)],
    }),
    db
      .select({ modelCode: schema.products.modelCode, variant: schema.products.variant })
      .from(schema.products),
  ]);

  const byModel = new Map<string, string[]>();
  for (const row of variants) {
    if (!row.modelCode || !row.variant) continue;
    const list = byModel.get(row.modelCode);
    if (list) list.push(row.variant);
    else byModel.set(row.modelCode, [row.variant]);
  }

  return models.map((model) => ({
    ...model,
    existingVariants: byModel.get(model.code) ?? [],
  }));
}

/**
 * Obtiene un producto por su ID para precargar el formulario de edición
 */
export async function getProductById(id: number) {
  try {
    await requireRole(["admin", "manager", "warehouse"]);

    const product = await db.query.products.findFirst({
      where: eq(schema.products.id, id),
      with: {
        category: true,
        brand: true,
        supplier: true,
        model: true,
      },
    });

    if (!product) return null;
    const siblings = await db.select({
      id: schema.products.id, variant: schema.products.variant, variantColor: schema.products.variantColor,
      attributes: schema.products.attributes, sku: schema.products.sku, barcode: schema.products.barcode,
      price: schema.products.price, costPrice: schema.products.costPrice, stock: schema.products.stock,
      isActive: schema.products.isActive, isArchived: schema.products.isArchived, imageUrl: schema.products.imageUrl, canHardDelete: eligibility,
    }).from(schema.products).where(product.modelCode ? eq(schema.products.modelCode, product.modelCode) : eq(schema.products.id, id))
      .orderBy(schema.products.variant);
    return { ...product, siblings, variantSelector: product.model?.variantSelector ?? null };
  } catch (error) {
    console.error(`Error al obtener producto #${id}:`, error);
    return null;
  }
}

/**
 * Server Action: Crear un nuevo producto en Neon DB y registrar Kárdex inicial
 */
export async function createProductAction(
  input: ProductFormInput,
  options?: ProductOptionInput[],
  optionConfigs?: ProductOptionConfig[]
): Promise<ActionResult> {
  try {
    const currentUser = await requireRole(["admin", "manager", "warehouse"]);
    let entries: CatalogEntry[];
    let existingModel: typeof schema.productModels.$inferSelect | undefined;

    let parsedConfigs: ProductOptionConfig[] | null = null;
    if (optionConfigs && optionConfigs.length > 0) {
      const cfgResult = z.array(productOptionConfigSchema).max(3).safeParse(optionConfigs);
      if (!cfgResult.success) {
        return { success: false, error: cfgResult.error.issues[0]?.message || "Configuración de opciones inválida." };
      }
      parsedConfigs = cfgResult.data;
    }

    if (options === undefined) {
      const validated = productFormSchema.safeParse(input);
      if (!validated.success) return { success: false, error: validated.error.issues[0]?.message };
      entries = [{
        ...productDbInsertSchema.parse(validated.data),
        variantSelector: validated.data.variantSelector || null,
        options: parsedConfigs,
      }];
    } else {
      const validated = productOptionsSchema.safeParse(options);
      if (!validated.success) {
        const issue = validated.error.issues[0];
        const prefix = typeof issue.path[0] === "number" ? `Opción ${issue.path[0] + 1}. ` : "";
        return { success: false, error: prefix + issue.message };
      }

      const existingCode = input.modelCode?.trim().toUpperCase();
      const model = existingCode ? await db.query.productModels.findFirst({ where: eq(schema.productModels.code, existingCode) }) : undefined;
      if (existingCode && !model) return { success: false, error: "El modelo seleccionado ya no está disponible." };
      const modelCode = model?.code ?? automaticModelCode();
      existingModel = model;
      let modelOptionsToSave = parsedConfigs;
      if (model) {
        try { modelOptionsToSave = extendModelOptions(model, validated.data); }
        catch (error) { return { success: false, error: (error as Error).message }; }
      }
      const baseMainImage = model ? model.imageUrl : (input.mainImage?.trim() || null);
      const baseAdditionalImages = model ? (model.images ?? []) : (input.additionalImages || []);
      entries = validated.data.map(option => {
        const mergedAttributes = option.attributes ?? input.attributes ?? null;
        const variantOwnImage = option.mainImage?.trim() || null;
        const product = productFormSchema.parse({
          ...input,
          ...option,
          modelCode,
          name: model?.name ?? input.name,
          variantSelector: model ? model.variantSelector : input.variantSelector,
          mainImage: variantOwnImage,
          additionalImages: baseAdditionalImages,
          attributes: mergedAttributes,
        });
        return {
          ...productDbInsertSchema.parse(product),
          variantSelector: product.variantSelector || null,
          attributes: mergedAttributes,
          options: modelOptionsToSave,
          modelImageUrl: baseMainImage,
          modelImages: baseAdditionalImages,
        };
      });
    }

    const [first] = entries;
    if (first.modelCode && options === undefined) {
      const model = await db.query.productModels.findFirst({ where: eq(schema.productModels.code, first.modelCode) });
      if (model) return { success: false, error: "Añade las variantes desde el modelo existente." };
    }
    const query = createCatalogProductsQuery(entries, currentUser.id, existingModel);
    const { rows } = existingModel ? (await db.batch([
      db.execute(sql`SELECT code FROM product_models WHERE code = ${existingModel.code} FOR UPDATE`), db.execute(query),
    ]))[1] : await db.execute(query);
    if (!rows.length) return { success: false, error: "La variante, SKU o código ya existe, o cambió el modelo. Actualiza la ficha." };
    refreshCatalog();
    return { success: true, data: rows[0] };
  } catch (error) {
    const cause = error instanceof Error && error.cause ? error.cause : error;
    if (typeof cause === "object" && cause !== null && "code" in cause && cause.code === "23505") {
      return { success: false, error: "Ya existe una variante, SKU o código de barras con esos datos." };
    }
    return {
      success: false,
      error: adminActionError(error, "Error al guardar el producto."),
    };
  }
}

export async function addModelVariantsAction(
  modelCode: string,
  newOptions: ProductOptionInput[]
): Promise<ActionResult> {
  try {
    await requireRole(["admin", "manager", "warehouse"]);
    const base = await db.query.products.findFirst({
      where: eq(schema.products.modelCode, modelCode),
      with: { model: true },
      orderBy: schema.products.id,
    });
    if (!base) return { success: false, error: "El modelo ya no está disponible." };

    return await createProductAction(
      {
        name: base.name,
        sku: null,
        barcode: null,
        modelCode,
        variant: null,
        variantSelector: null,
        variantColor: null,
        description: base.description ?? "",
        mainImage: base.model?.imageUrl ?? null,
        additionalImages: base.model?.images?.length ? base.model.images : (base.images ?? []),
        price: Number(base.price),
        costPrice: Number(base.costPrice),
        categoryId: base.categoryId,
        brandId: base.brandId,
        supplierId: base.supplierId,
        initialStock: 0,
        minStock: base.minStock,
        isActive: true,
        isVisibleWeb: !base.isArchived && base.isActive ? base.isVisibleWeb : true,
        isFeatured: false,
      },
      newOptions
    );
  } catch (error) {
    return {
      success: false,
      error: adminActionError(error, "No se pudieron añadir las variantes."),
    };
  }
}

/**
 * Server Action: Actualizar un producto existente
 */
export async function updateProductAction(
  id: number,
  input: ProductFormInput
): Promise<ActionResult> {
  try {
    await requireRole(["admin", "manager", "warehouse"]);

    // 1. Validar datos con Zod
    const validated = productFormSchema.safeParse({
      ...input,
      modelCode: input.variant?.trim() && !input.modelCode?.trim() ? automaticModelCode() : input.modelCode,
    });
    if (!validated.success) {
      const errorMsg = validated.error.issues[0]?.message || "Datos inválidos en el formulario.";
      return { success: false, error: errorMsg };
    }

    // 2. Verificar existencia
    const existing = await db.query.products.findFirst({
      where: eq(schema.products.id, id),
    });

    if (!existing) {
      return { success: false, error: `El producto #${id} no existe en la base de datos.` };
    }

    const payload = productDbInsertSchema.parse(validated.data);

    let existingModelRecord: typeof schema.productModels.$inferSelect | undefined;
    let renamedTextKey: { from: string; to: string } | null = null;
    if (existing.modelCode) {
      const model = await db.query.productModels.findFirst({ where: eq(schema.productModels.code, existing.modelCode) });
      existingModelRecord = model;

      const oldAttrs = existing.attributes ?? {};
      const newAttrs = payload.attributes ?? {};
      const oldKeys = Object.keys(oldAttrs);
      const newKeys = Object.keys(newAttrs);
      const isColorKey = (key: string) => key.trim().toLowerCase() === "color";

      let structureValid =
        payload.modelCode === existing.modelCode &&
        !(
          !existing.variantColor &&
          payload.variantColor &&
          !model?.options?.some((d) => d.type === "color") &&
          !/color/i.test(model?.variantSelector ?? "")
        );

      if (structureValid && oldKeys.length === 0) {
        structureValid =
          newKeys.length === 0 &&
          (model?.variantSelector ?? "Variante") === (validated.data.variantSelector || "Variante");
      } else if (structureValid) {
        if (oldKeys.length !== newKeys.length) {
          structureValid = false;
        } else {
          let renamedCount = 0;
          for (let i = 0; i < oldKeys.length; i++) {
            const oldK = oldKeys[i];
            const newK = newKeys[i];
            if (isColorKey(oldK) !== isColorKey(newK)) {
              structureValid = false;
              break;
            }
            if (isColorKey(oldK) && oldK !== newK) {
              structureValid = false;
              break;
            }
            if (oldK !== newK) {
              renamedCount += 1;
              renamedTextKey = { from: oldK, to: newK };
            }
          }
          if (renamedCount > 1) structureValid = false;
        }
      }

      if (!structureValid) {
        return { success: false, error: "Conserva los atributos del modelo. Para otra estructura crea un modelo nuevo." };
      }
    }

    const variantImageUrl = payload.modelCode
      ? (input.variantImage !== undefined
          ? (validated.data.variantImage?.trim() || null)
          : existing.imageUrl)
      : payload.imageUrl;

    const setData: Partial<typeof schema.products.$inferInsert> = {
      name: payload.name,
      description: payload.description,
      price: payload.price,
      sku: payload.sku || existing.sku || automaticSku(),
      barcode: payload.barcode,
      modelCode: payload.modelCode,
      variant: payload.variant,
      variantColor: payload.variantColor,
      minStock: payload.minStock,
      imageUrl: variantImageUrl,
      images: payload.images,
      categoryId: payload.categoryId,
      brandId: payload.brandId,
      supplierId: payload.supplierId,
      isActive: existing.isArchived ? false : payload.isActive,
      isVisibleWeb: existing.isArchived ? false : payload.isVisibleWeb,
      isFeatured: existing.isArchived ? false : payload.isFeatured,
      updatedAt: new Date(),
    };
    if (input.attributes !== undefined) {
      setData.attributes = payload.attributes;
    }

    const update = db.update(schema.products).set(setData).where(eq(schema.products.id, id)).returning();

    let updatedProduct;
    if (payload.modelCode) {
      const nextSelector = renamedTextKey && payload.attributes
        ? Object.keys(payload.attributes).join(" y ")
        : validated.data.variantSelector || null;
      const model = { code: payload.modelCode, name: payload.name, variantSelector: nextSelector };

      const siblingRenameUpdates =
        existing.modelCode && renamedTextKey
          ? (
              await db
                .select({ id: schema.products.id, attributes: schema.products.attributes })
                .from(schema.products)
                .where(
                  and(
                    eq(schema.products.modelCode, existing.modelCode),
                    ne(schema.products.id, id)
                  )
                )
            )
              .filter(
                (sib) =>
                  sib.attributes &&
                  Object.prototype.hasOwnProperty.call(sib.attributes, renamedTextKey!.from)
              )
              .map((sib) => {
                const updatedAttrs = Object.fromEntries(
                  Object.entries(sib.attributes!).map(([k, v]) => [
                    k === renamedTextKey!.from ? renamedTextKey!.to : k,
                    v,
                  ])
                );
                return db
                  .update(schema.products)
                  .set({ attributes: updatedAttrs, updatedAt: new Date() })
                  .where(eq(schema.products.id, sib.id));
              })
          : [];

      const batchOps = [
        existing.modelCode
          ? db
              .update(schema.productModels)
              .set({
                name: model.name,
                imageUrl: payload.imageUrl,
                images: payload.images,
                ...(renamedTextKey && nextSelector ? { variantSelector: nextSelector } : {}),
              })
              .where(eq(schema.productModels.code, existing.modelCode))
          : db.insert(schema.productModels).values({
              ...model,
              imageUrl: payload.imageUrl,
              images: payload.images,
            }),
        db
          .update(schema.products)
          .set({ name: model.name, images: payload.images, updatedAt: new Date() })
          .where(eq(schema.products.modelCode, payload.modelCode)),
        ...siblingRenameUpdates,
        update,
      ] as const;

      const batchResults = await db.batch(batchOps as unknown as [typeof batchOps[0], ...typeof batchOps[number][]]);
      const lastResult = batchResults.at(-1) as typeof existing[] | undefined;
      updatedProduct = lastResult?.[0];

      if (
        existing.modelCode &&
        existingModelRecord &&
        updatedProduct &&
        (input.attributes !== undefined || payload.variantColor !== existing.variantColor)
      ) {
        const siblingRows = await db
          .select({
            variantColor: schema.products.variantColor,
            attributes: schema.products.attributes,
          })
          .from(schema.products)
          .where(eq(schema.products.modelCode, existing.modelCode))
          .orderBy(schema.products.id);

        const baseDims = modelDimensions({
          options: existingModelRecord.options ?? null,
          variantSelector: nextSelector ?? existingModelRecord.variantSelector,
        }).map((dim) => ({
          ...dim,
          name: renamedTextKey && dim.name === renamedTextKey.from ? renamedTextKey.to : dim.name,
          values: [] as ProductOptionConfig["values"],
        }));

        if (
          siblingRows.length > 0 &&
          siblingRows.every((row) => row.attributes && baseDims.every((d) => Boolean(row.attributes?.[d.name]?.trim())))
        ) {
          for (const row of siblingRows) {
            for (const dim of baseDims) {
              const valName = row.attributes?.[dim.name]?.trim();
              if (!valName) continue;
              if (!dim.values.some((v) => v.name.toLowerCase() === valName.toLowerCase())) {
                dim.values.push({
                  name: valName,
                  ...(dim.type === "color" && row.variantColor && /^#[0-9a-fA-F]{6}$/.test(row.variantColor)
                    ? { hex: row.variantColor }
                    : {}),
                });
              }
            }
          }
          const parsedDims = z.array(productOptionConfigSchema).max(3).safeParse(baseDims);
          if (parsedDims.success && parsedDims.data.every((d) => d.values.length > 0)) {
            await db
              .update(schema.productModels)
              .set({ options: parsedDims.data })
              .where(eq(schema.productModels.code, existing.modelCode));
          }
        }
      }
    } else {
      [updatedProduct] = await update;
    }

    // 5. Revalidar rutas
    safeRevalidatePath(`/admin/inventario/${id}/editar`);
    safeRevalidatePath(`/producto/${existing.slug}`);
    refreshCatalog();
    if (!updatedProduct) return { success: false, error: "El producto ya no existe." };
    return { success: true, data: updatedProduct };
  } catch (error) {
    const cause = error instanceof Error && error.cause ? error.cause : error;
    if (typeof cause === "object" && cause !== null && "code" in cause && cause.code === "23505") {
      return { success: false, error: "Ya existe una variante, SKU o código de barras con esos datos." };
    }
    console.error(`Error al actualizar producto #${id}:`, error);
    return {
      success: false,
      error: adminActionError(error, "Error interno al actualizar el producto en la base de datos."),
    };
  }
}

/**
 * Server Action: Crear nueva categoría al vuelo
 */
export async function createCategoryAction(
  name: string,
  imageUrl?: string | null
): Promise<ActionResult> {
  try {
    await requireRole(["admin", "manager", "warehouse"]);
    const parsedCat = categoryInputSchema.safeParse({ name, imageUrl: imageUrl ?? "" });
    if (!parsedCat.success) {
      return { success: false, error: parsedCat.error.issues[0]?.message || "Datos de categoría inválidos." };
    }
    const trimmed = parsedCat.data.name;
    const validImageUrl = parsedCat.data.imageUrl || null;

    const baseSlug = slugify(trimmed) || `cat-${Date.now()}`;
    let slug = baseSlug;
    const existing = await db.query.categories.findFirst({
      where: eq(schema.categories.slug, slug),
    });
    if (existing) {
      slug = `${baseSlug}-${Date.now().toString(36)}`;
    }

    const [newCat] = await db
      .insert(schema.categories)
      .values({
        name: trimmed,
        slug,
        imageUrl: validImageUrl,
      })
      .returning();

    safeRevalidatePath("/admin/inventario");
    safeRevalidatePath("/admin/inventario/nuevo");
    safeRevalidatePath("/catalogo");
    safeRevalidatePath("/");
    return { success: true, data: newCat };
  } catch (error) {
    return { success: false, error: adminActionError(error, "Error al registrar la categoría.") };
  }
}

/**
 * Server Action: Actualizar nombre e imagen de categoría existente
 */
export async function updateCategoryAction(
  id: number,
  newName: string,
  imageUrl?: string | null
): Promise<ActionResult> {
  try {
    await requireRole(["admin", "manager", "warehouse"]);
    const parsedCat = categoryInputSchema.safeParse({ name: newName, imageUrl: imageUrl ?? "" });
    if (!parsedCat.success) {
      return { success: false, error: parsedCat.error.issues[0]?.message || "Datos de categoría inválidos." };
    }
    const trimmed = parsedCat.data.name;

    const slug = slugify(trimmed) || `cat-${id}`;
    const updateData: { name: string; slug: string; imageUrl?: string | null } = {
      name: trimmed,
      slug,
    };
    if (imageUrl !== undefined) {
      updateData.imageUrl = parsedCat.data.imageUrl || null;
    }

    const [updated] = await db
      .update(schema.categories)
      .set(updateData)
      .where(eq(schema.categories.id, id))
      .returning();

    safeRevalidatePath("/admin/inventario");
    safeRevalidatePath("/admin/inventario/nuevo");
    safeRevalidatePath("/catalogo");
    safeRevalidatePath("/");
    return { success: true, data: updated };
  } catch (error) {
    return { success: false, error: adminActionError(error, "Error al actualizar categoría.") };
  }
}

/**
 * Server Action: Renombrar categoría existente (compatibilidad)
 */
export async function renameCategoryAction(id: number, newName: string): Promise<ActionResult> {
  return updateCategoryAction(id, newName);
}

/**
 * Server Action: Eliminar categoría reasignando productos a NULL (Sin categoría)
 */
export async function deleteCategoryAction(id: number): Promise<ActionResult> {
  try {
    await requireRole(["admin", "manager", "warehouse"]);
    await db.batch([
      db.update(schema.products).set({ categoryId: null }).where(eq(schema.products.categoryId, id)),
      db.delete(schema.categories).where(eq(schema.categories.id, id)),
    ]);

    safeRevalidatePath("/admin/inventario");
    return { success: true };
  } catch (error) {
    return { success: false, error: adminActionError(error, "Error al eliminar categoría.") };
  }
}

function refreshBrandPaths() {
  for (const path of ["/admin/inventario", "/admin/inventario/nuevo", "/catalogo", "/"]) {
    safeRevalidatePath(path);
  }
}

/**
 * Server Action: Crear nueva marca comercial
 */
export async function createBrandAction(name: string): Promise<ActionResult> {
  try {
    await requireRole(["admin", "manager", "warehouse"]);
    const parsedBrand = brandInputSchema.safeParse({ name });
    if (!parsedBrand.success) {
      return { success: false, error: parsedBrand.error.issues[0]?.message || "Datos de marca inválidos." };
    }
    const trimmed = parsedBrand.data.name;

    const existingBrands = await db.select().from(schema.brands);
    if (existingBrands.some((b) => b.name.toLowerCase() === trimmed.toLowerCase())) {
      return { success: false, error: "Ya existe una marca con ese nombre." };
    }

    const baseSlug = slugify(trimmed) || `brand-${Date.now()}`;
    const slugTaken = existingBrands.some((b) => b.slug === baseSlug);
    const slug = slugTaken ? `${baseSlug}-${Date.now().toString(36)}` : baseSlug;

    const [newBrand] = await db
      .insert(schema.brands)
      .values({
        name: trimmed,
        slug,
      })
      .returning();

    refreshBrandPaths();
    return { success: true, data: newBrand };
  } catch (error) {
    return { success: false, error: adminActionError(error, "Error al registrar la marca.") };
  }
}

/**
 * Server Action: Actualizar nombre de marca comercial existente
 */
export async function updateBrandAction(id: number, newName: string): Promise<ActionResult> {
  try {
    await requireRole(["admin", "manager", "warehouse"]);
    const idParsed = z.number().int().positive().safeParse(id);
    if (!idParsed.success) {
      return { success: false, error: "Identificador de marca inválido." };
    }

    const parsedBrand = brandInputSchema.safeParse({ name: newName });
    if (!parsedBrand.success) {
      return { success: false, error: parsedBrand.error.issues[0]?.message || "Datos de marca inválidos." };
    }
    const trimmed = parsedBrand.data.name;

    const existingBrands = await db.select().from(schema.brands);
    if (existingBrands.some((b) => b.id !== id && b.name.toLowerCase() === trimmed.toLowerCase())) {
      return { success: false, error: "Ya existe una marca con ese nombre." };
    }

    const baseSlug = slugify(trimmed) || `brand-${id}`;
    const slugTaken = existingBrands.some((b) => b.id !== id && b.slug === baseSlug);
    const slug = slugTaken ? `${baseSlug}-${id}` : baseSlug;

    const [updated] = await db
      .update(schema.brands)
      .set({ name: trimmed, slug })
      .where(eq(schema.brands.id, id))
      .returning();

    if (!updated) {
      return { success: false, error: "La marca ya no existe." };
    }

    refreshBrandPaths();
    return { success: true, data: updated };
  } catch (error) {
    return { success: false, error: adminActionError(error, "Error al actualizar la marca.") };
  }
}

/**
 * Server Action: Eliminar marca comercial reasignando productos a NULL (Sin marca)
 */
export async function deleteBrandAction(id: number): Promise<ActionResult> {
  try {
    await requireRole(["admin", "manager", "warehouse"]);
    const idParsed = z.number().int().positive().safeParse(id);
    if (!idParsed.success) {
      return { success: false, error: "Identificador de marca inválido." };
    }

    await db.batch([
      db.update(schema.products).set({ brandId: null }).where(eq(schema.products.brandId, id)),
      db.delete(schema.brands).where(eq(schema.brands.id, id)),
    ]);

    refreshBrandPaths();
    return { success: true };
  } catch (error) {
    return { success: false, error: adminActionError(error, "Error al eliminar la marca.") };
  }
}

/**
 * Server Action: Activa o desactiva rápidamente un producto (toggle de estado)
 */
export async function toggleProductActiveAction(
  id: number,
  isActive: boolean
): Promise<ActionResult> {
  try {
    await requireRole(["admin", "manager", "warehouse"]);

    const idParsed = z.number().int().positive().safeParse(id);
    if (!idParsed.success || typeof isActive !== "boolean") {
      return { success: false, error: "Estado de producto inválido." };
    }

    const existing = await db.query.products.findFirst({
      where: eq(schema.products.id, id),
      columns: { id: true, isArchived: true },
    });
    if (!existing) return { success: false, error: "El producto ya no existe." };
    if (existing.isArchived) {
      return {
        success: false,
        error: "Este producto está archivado. Restáuralo primero para activarlo o pausarlo.",
      };
    }

    const [updated] = await db
      .update(schema.products)
      .set({
        isActive,
        ...(!isActive && { isVisibleWeb: false, isFeatured: false }),
        updatedAt: new Date(),
      })
      .where(and(eq(schema.products.id, id), eq(schema.products.isArchived, false)))
      .returning();

    if (!updated) return { success: false, error: "El producto ya no existe o fue archivado." };
    refreshCatalog();
    return { success: true, data: updated };
  } catch (error) {
    return {
      success: false,
      error: adminActionError(error, "Error al cambiar el estado del producto."),
    };
  }
}

export async function archiveProductAction(
  id: number,
  archived: boolean
): Promise<ActionResult> {
  try {
    await requireRole(["admin", "manager", "warehouse"]);

    const idParsed = z.number().int().positive().safeParse(id);
    if (!idParsed.success || typeof archived !== "boolean") {
      return { success: false, error: "Estado de archivo inválido." };
    }

    const [updated] = await db
      .update(schema.products)
      .set(
        archived
          ? {
              isArchived: true,
              isActive: false,
              isVisibleWeb: false,
              isFeatured: false,
              updatedAt: new Date(),
            }
          : {
              isArchived: false,
              isActive: true,
              isVisibleWeb: false,
              isFeatured: false,
              updatedAt: new Date(),
            }
      )
      .where(eq(schema.products.id, id))
      .returning();

    if (!updated) return { success: false, error: "El producto ya no existe." };
    refreshCatalog();
    return { success: true, data: updated };
  } catch (error) {
    return {
      success: false,
      error: adminActionError(error, "Error al actualizar el archivo del producto."),
    };
  }
}

/**
 * Obtiene los movimientos de kárdex registrados en base de datos para un producto o general
 */
export async function getProductKardexAction(productId?: number) {
  try {
    await requireRole(["admin", "manager", "warehouse"]);

    const movements = await db.query.inventoryMovements.findMany({
      where: productId ? eq(schema.inventoryMovements.productId, productId) : undefined,
      with: {
        product: true,
        user: true,
      },
      orderBy: (m, { desc }) => [desc(m.createdAt), desc(m.id)],
    });

    const saleIds = [
      ...new Set(
        movements
          .filter((m) => m.referenceType === "sale" && m.referenceId != null)
          .map((m) => m.referenceId as number)
      ),
    ];
    const purchaseIds = [
      ...new Set(
        movements
          .filter((m) => m.referenceType === "purchase" && m.referenceId != null)
          .map((m) => m.referenceId as number)
      ),
    ];
    const adjustmentIds = [
      ...new Set(
        movements
          .filter((m) => m.referenceType === "adjustment" && m.referenceId != null)
          .map((m) => m.referenceId as number)
      ),
    ];

    const [saleRows, purchaseRows, adjustmentRows] = await Promise.all([
      saleIds.length > 0
        ? db
            .select({ id: schema.sales.id, number: schema.sales.saleNumber })
            .from(schema.sales)
            .where(inArray(schema.sales.id, saleIds))
        : Promise.resolve([]),
      purchaseIds.length > 0
        ? db
            .select({ id: schema.purchases.id, number: schema.purchases.purchaseNumber })
            .from(schema.purchases)
            .where(inArray(schema.purchases.id, purchaseIds))
        : Promise.resolve([]),
      adjustmentIds.length > 0
        ? db
            .select({
              id: schema.inventoryAdjustments.id,
              number: schema.inventoryAdjustments.adjustmentNumber,
            })
            .from(schema.inventoryAdjustments)
            .where(inArray(schema.inventoryAdjustments.id, adjustmentIds))
        : Promise.resolve([]),
    ]);

    const saleNumById = new Map(saleRows.map((r) => [r.id, r.number]));
    const purchaseNumById = new Map(purchaseRows.map((r) => [r.id, r.number]));
    const adjustmentNumById = new Map(adjustmentRows.map((r) => [r.id, r.number]));

    return {
      success: true,
      data: movements.map((m) => {
        let typeLabel = "Movimiento de Kárdex";
        if (m.referenceType === "product_creation") {
          typeLabel = "Apertura Inicial";
        } else if (m.movementType === "purchase_in") {
          typeLabel = "Recepción de Compra";
        } else if (m.movementType === "sale_out") {
          typeLabel = "Salida por Venta";
        } else if (m.movementType === "adjustment_in") {
          typeLabel = "Ajuste de Entrada (+)";
        } else if (m.referenceType === "purchase_return") {
          typeLabel = "Devolución a proveedor";
        } else if (m.movementType === "adjustment_out") {
          if (m.referenceType === "adjustment") {
            typeLabel = "Baja / Ajuste";
          } else if (
            m.referenceType === "purchase" ||
            m.reason?.toLowerCase().includes("anulacion") ||
            m.reason?.toLowerCase().includes("compra")
          ) {
            typeLabel = "Anulación de Compra";
          } else {
            typeLabel = "Ajuste de Salida (-)";
          }
        } else if (m.movementType === "damaged_out") {
          typeLabel = "Baja por Merma";
        } else if (m.movementType === "return_in") {
          typeLabel = "Devolución Cliente";
        }

        const formattedDate = formatBusinessDateTime(m.createdAt);
        const datePart = formatBusinessDate(m.createdAt);
        const timePart = formatBusinessTime(m.createdAt);

        const isNegative =
          m.movementType === "sale_out" ||
          m.movementType === "damaged_out" ||
          m.movementType === "adjustment_out";

        const unitCost = Number(m.unitCost || 0);
        const absQty = Math.abs(m.quantity);

        let reference = "Ajuste Directo";
        if (m.referenceType === "product_creation") {
          reference = `ALTA-#${m.productId}`;
        } else if (m.referenceType === "sale" && m.referenceId != null) {
          reference = saleNumById.get(m.referenceId) ?? `#REF-${m.referenceId}`;
        } else if (m.referenceType === "purchase" && m.referenceId != null) {
          reference = purchaseNumById.get(m.referenceId) ?? `#REF-${m.referenceId}`;
        } else if (m.referenceType === "adjustment" && m.referenceId != null) {
          reference = adjustmentNumById.get(m.referenceId) ?? `#REF-${m.referenceId}`;
        } else if (m.referenceType === "purchase_return" && m.referenceId != null) {
          reference = `DEV-${m.referenceId}`;
        } else if (m.referenceId != null) {
          reference = `#REF-${m.referenceId}`;
        }

        return {
          id: m.id,
          date: formattedDate,
          datePart,
          timePart,
          productId: m.productId,
          product: m.product ? productName(m.product) : `Producto #${m.productId}`,
          sku: m.product?.sku || `PROD-${m.productId}`,
          type: m.movementType,
          typeLabel,
          quantity: isNegative ? -absQty : m.quantity,
          previousStock: m.previousStock,
          newStock: m.newStock,
          unitCost,
          totalCost: Number((absQty * unitCost).toFixed(2)),
          reference,
          referenceType: m.referenceType,
          reason: m.reason?.trim() || null,
          user: m.user?.name || "Administrador",
        };
      }),
    };
  } catch (error) {
    return { success: false, data: [], error: adminActionError(error, "No se pudo completar la operación.") };
  }
}

export interface CreateAdjustmentInput {
  productId: number;
  quantity: number;
  reason: "damaged" | "defective" | "expired" | "loss_theft" | "internal_use";
  notes?: string;
  requestId?: string;
}

/**
 * Server Action: Registrar un acta formal de baja/merma en la base de datos
 * - Descuenta las existencias en `products.stock`
 * - Registra el acta formal en `inventory_adjustments` y su ítem en `inventory_adjustment_items`
 * - Asienta la salida negativa inmutable en `inventory_movements` (Kárdex)
 */
export async function createInventoryAdjustmentAction(
  input: CreateAdjustmentInput
): Promise<ActionResult> {
  try {
    const currentUser = await requireRole(["admin", "manager", "warehouse"]);

    const parsed = z.object({
      productId: z.number().int().positive(),
      quantity: z.number().int().positive().max(2_147_483_647),
      reason: z.enum(["damaged", "defective", "expired", "loss_theft", "internal_use"]),
      notes: z.string().trim().max(500).optional(),
      requestId: z.uuid().optional(),
    }).safeParse(input);

    if (!parsed.success) return { success: false, error: "Revisa los datos de la baja." };

    if (parsed.data.requestId) {
      const existing = await db.query.inventoryAdjustments.findFirst({
        where: eq(schema.inventoryAdjustments.requestId, parsed.data.requestId),
        with: { items: { with: { product: true } } },
      });
      if (existing) {
        const firstItem = existing.items[0];
        return {
          success: true,
          data: {
            adjustment: { id: existing.id, adjustmentNumber: existing.adjustmentNumber },
            newStock: firstItem?.product?.stock ?? 0,
            previousStock: (firstItem?.product?.stock ?? 0) + (firstItem?.quantity ?? 0),
            productName: firstItem?.product ? productName(firstItem.product) : "Producto",
          },
        };
      }
    }

    const { rows: [result] } = await db.execute<{
      id: number;
      adjustmentNumber: string;
      newStock: number;
      previousStock: number;
      productName: string;
    }>(inventoryAdjustmentQuery({
      ...parsed.data,
      notes: parsed.data.notes || `Baja por ${parsed.data.reason}`,
      userId: currentUser.id,
      authorizedByUserId: currentUser.role === "warehouse" ? null : currentUser.id,
      prefix: `BAJA-${businessDate().slice(0, 4)}-`,
      requestId: parsed.data.requestId ?? null,
    }));
    if (!result) {
      return { success: false, error: "El producto no existe o no tiene stock suficiente." };
    }

    safeRevalidatePath("/admin/inventario");
    safeRevalidatePath("/admin");
    safeRevalidatePath("/admin/ventas");
    safeRevalidatePath("/catalogo");
    safeRevalidatePath("/");

    return {
      success: true,
      data: {
        adjustment: { id: result.id, adjustmentNumber: result.adjustmentNumber },
        newStock: result.newStock,
        previousStock: result.previousStock,
        productName: result.productName,
      },
    };
  } catch (error) {
    return { success: false, error: adminActionError(error, "Error al procesar la baja de inventario.") };
  }
}

/**
 * Server Action: Obtiene las actas de bajas y mermas registradas en la base de datos
 */
export async function getInventoryAdjustmentsAction() {
  try {
    await requireRole(["admin", "manager", "warehouse"]);

    const adjustments = await db.query.inventoryAdjustments.findMany({
      with: {
        user: true,
        authorizedByUser: true,
        items: {
          with: {
            product: true,
          },
        },
      },
      orderBy: (a, { desc }) => [desc(a.createdAt), desc(a.id)],
    });

    const reasonLabels: Record<string, string> = {
      damaged: "Daño físico",
      defective: "Defecto de fábrica",
      expired: "Vencido",
      loss_theft: "Pérdida / Faltante",
      supplier_return: "Devolución proveedor",
      internal_use: "Uso interno",
    };

    const flatList = adjustments.map((a) => {
      const firstItem = a.items[0];
      const product = firstItem?.product;

      const formattedDate = formatBusinessDateTime(a.createdAt);
      const datePart = formatBusinessDate(a.createdAt);
      const timePart = formatBusinessTime(a.createdAt);
      const rawNotes = a.notes?.trim() || "";
      const isDefaultNote =
        !rawNotes ||
        /^Baja por (damaged|defective|expired|loss_theft|supplier_return|internal_use)$/i.test(rawNotes) ||
        rawNotes === "Sin observaciones adicionales";

      return {
        id: a.id,
        adjustmentNumber: a.adjustmentNumber,
        date: formattedDate,
        businessDay: businessDate(a.createdAt),
        datePart,
        timePart,
        productId: product?.id || 0,
        productName: product ? productName(product) : "Varios productos",
        sku: product?.sku || "N/A",
        quantity: firstItem ? firstItem.quantity : 1,
        unitCost: Number(firstItem?.unitCost || 0),
        reason: a.reason,
        reasonLabel: reasonLabels[a.reason] || a.reason,
        totalLoss: Number(a.totalCost || 0),
        reportedBy: a.user?.name || "Almacenero",
        authorizedBy: a.authorizedByUser?.name || null,
        notes: isDefaultNote ? null : rawNotes,
      };
    });

    return { success: true, data: flatList };
  } catch (error) {
    return { success: false, data: [], error: adminActionError(error, "No se pudo completar la operación.") };
  }
}
