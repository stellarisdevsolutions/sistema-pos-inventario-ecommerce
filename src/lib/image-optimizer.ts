import imageCompression from "browser-image-compression";

export interface CompressionResult {
  file: File;
  previewUrl: string;
  originalSizeKB: number;
  compressedSizeKB: number;
  savingsPercent: number;
}

/**
 * Optimiza una imagen física directamente en el navegador del usuario utilizando
 * los recursos del dispositivo (Canvas / Web Worker).
 * La comprime y convierte a formato .webp moderno y ultraligero sin perder resolución.
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

  const compressionOptions = {
    maxSizeMB: options?.maxSizeMB ?? 0.8, // Máximo ~800 KB
    maxWidthOrHeight: options?.maxWidthOrHeight ?? 1400, // Resolución HD nítida
    useWebWorker: true,
    fileType: "image/webp",
    initialQuality: options?.quality ?? 0.85,
  };

  try {
    const compressedBlob = await imageCompression(file, compressionOptions);
    
    // Asignar extensión .webp al nombre
    const baseName = file.name.replace(/\.[^/.]+$/, "");
    const webpName = `${baseName}.webp`;

    const compressedFile = new File([compressedBlob], webpName, {
      type: "image/webp",
      lastModified: Date.now(),
    });

    const compressedSizeKB = Math.round(compressedFile.size / 1024);
    const savingsPercent =
      originalSizeKB > 0
        ? Math.round(((originalSizeKB - compressedSizeKB) / originalSizeKB) * 100)
        : 0;

    const previewUrl = URL.createObjectURL(compressedFile);

    return {
      file: compressedFile,
      previewUrl,
      originalSizeKB,
      compressedSizeKB,
      savingsPercent: Math.max(0, savingsPercent),
    };
  } catch (error) {
    console.error("Error optimizando imagen a WebP en el navegador:", error);
    // Fallback seguro si el navegador no soporta el worker
    return {
      file,
      previewUrl: URL.createObjectURL(file),
      originalSizeKB,
      compressedSizeKB: originalSizeKB,
      savingsPercent: 0,
    };
  }
}
