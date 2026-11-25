import imageCompression from "browser-image-compression";

export interface CompressionResult {
  file: File;
  previewUrl: string;
  originalSizeKB: number;
  compressedSizeKB: number;
  savingsPercent: number;
}

async function compressToWebPBlob(
  file: File,
  compressionOptions: {
    maxSizeMB: number;
    maxWidthOrHeight: number;
    useWebWorker: boolean;
    fileType: string;
    initialQuality: number;
  }
): Promise<File> {
  const compressedBlob = await imageCompression(file, compressionOptions);
  if (compressedBlob.type && compressedBlob.type !== "image/webp") {
    throw new Error("El navegador no generó formato WebP.");
  }

  const baseName = (file.name.replace(/\.[^/.]+$/, "") || "imagen").trim();
  const webpName = `${baseName}.webp`;

  return new File([compressedBlob], webpName, {
    type: "image/webp",
    lastModified: Date.now(),
  });
}

/**
 * Optimiza una imagen física directamente en el navegador del usuario utilizando
 * los recursos del dispositivo (Canvas / Web Worker).
 * La comprime y convierte a formato .webp ligero para subir al servidor / CDN.
 */
export async function optimizeImageToWebP(
  file: File,
  options?: {
    maxWidthOrHeight?: number;
    maxSizeMB?: number;
    quality?: number;
  }
): Promise<CompressionResult> {
  const originalSizeKB = Math.round(file.size / 1024);

  const baseOptions = {
    maxSizeMB: options?.maxSizeMB ?? 0.55,
    maxWidthOrHeight: options?.maxWidthOrHeight ?? 1400,
    fileType: "image/webp",
    initialQuality: options?.quality ?? 0.85,
  };

  let compressedFile: File;
  try {
    compressedFile = await compressToWebPBlob(file, { ...baseOptions, useWebWorker: true });
  } catch {
    try {
      compressedFile = await compressToWebPBlob(file, { ...baseOptions, useWebWorker: false });
    } catch (error) {
      console.error("Error optimizando imagen a WebP en el navegador:", error);
      throw new Error("No se pudo optimizar la imagen en este navegador. Prueba con otra foto JPG, PNG o WebP.");
    }
  }

  const compressedSizeKB = Math.max(1, Math.round(compressedFile.size / 1024));
  const savingsPercent =
    originalSizeKB > 0
      ? Math.round(((originalSizeKB - compressedSizeKB) / originalSizeKB) * 100)
      : 0;

  return {
    file: compressedFile,
    previewUrl: "",
    originalSizeKB,
    compressedSizeKB,
    savingsPercent: Math.max(0, savingsPercent),
  };
}
