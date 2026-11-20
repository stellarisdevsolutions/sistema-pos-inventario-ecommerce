"use server";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { requireRole } from "@/lib/auth/session";

export type UploadResult = { success: boolean; url?: string; error?: string };

const MAX_IMAGE_BYTES = 1024 * 1024;

async function uploadImage(formData: FormData, folder: "products" | "categories"): Promise<UploadResult> {
  try {
    await requireRole(["admin", "manager", "warehouse"]);
    const file = formData.get("file");
    if (!(file instanceof File) || file.type !== "image/webp" ||
        file.size < 20 || file.size > MAX_IMAGE_BYTES) {
      return { success: false, error: "Selecciona una imagen WebP de hasta 1 MB." };
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    if (bytes.toString("ascii", 0, 4) !== "RIFF" ||
        bytes.toString("ascii", 8, 12) !== "WEBP" ||
        bytes.readUInt32LE(4) !== bytes.length - 8 ||
        !["VP8 ", "VP8L", "VP8X"].includes(bytes.toString("ascii", 12, 16))) {
      return { success: false, error: "El archivo no tiene una cabecera WebP válida." };
    }

    const directory = join(process.cwd(), "public", "uploads", folder);
    const name = `${randomUUID()}.webp`;
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, name), bytes, { flag: "wx" });

    return { success: true, url: `/uploads/${folder}/${name}` };
  } catch {
    return { success: false, error: "No se pudo guardar la imagen." };
  }
}

export async function uploadProductImageAction(formData: FormData): Promise<UploadResult> {
  return uploadImage(formData, "products");
}

export async function uploadCategoryPhotoAction(formData: FormData): Promise<UploadResult> {
  return uploadImage(formData, "categories");
}
