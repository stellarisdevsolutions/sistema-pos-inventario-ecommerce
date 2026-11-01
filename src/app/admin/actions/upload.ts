"use server";

import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export type UploadResult = {
  success: boolean;
  url?: string;
  error?: string;
};

/**
 * Server Action: Recibe el archivo físico optimizado en WebP y lo guarda
 * en el servidor de archivos (public/uploads/products) para servicio estático inmediato.
 */
export async function uploadProductImageAction(formData: FormData): Promise<UploadResult> {
  try {
    const file = formData.get("file") as File | null;
    if (!file) {
      return { success: false, error: "No se proporcionó ningún archivo de imagen." };
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Directorio físico de destino: public/uploads/products
    const uploadDir = join(process.cwd(), "public", "uploads", "products");
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const timestamp = Date.now();
    const randomHex = Math.random().toString(36).substring(2, 7);
    const fileName = `prod-${timestamp}-${randomHex}.webp`;
    const fullPath = join(uploadDir, fileName);

    await writeFile(fullPath, buffer);

    const publicUrl = `/uploads/products/${fileName}`;
    return { success: true, url: publicUrl };
  } catch (error: any) {
    console.error("Error al guardar archivo físico de imagen:", error);
    return {
      success: false,
      error: error.message || "Error al procesar y almacenar la imagen en el servidor.",
    };
  }
}

/**
 * Server Action: Recibe imagen para Categoría (WebP) y la guarda en public/uploads/categories
 */
export async function uploadCategoryPhotoAction(formData: FormData): Promise<UploadResult> {
  try {
    const file = formData.get("file") as File | null;
    if (!file) {
      return { success: false, error: "No se proporcionó ningún archivo de imagen para la categoría." };
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadDir = join(process.cwd(), "public", "uploads", "categories");
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const timestamp = Date.now();
    const randomHex = Math.random().toString(36).substring(2, 7);
    const fileName = `cat-${timestamp}-${randomHex}.webp`;
    const fullPath = join(uploadDir, fileName);

    await writeFile(fullPath, buffer);

    const publicUrl = `/uploads/categories/${fileName}`;
    return { success: true, url: publicUrl };
  } catch (error: any) {
    console.error("Error al guardar foto de categoría:", error);
    return {
      success: false,
      error: error.message || "Error al guardar foto de categoría.",
    };
  }
}
