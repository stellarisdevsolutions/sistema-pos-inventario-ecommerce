"use client";

import { useState } from "react";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function ProductThumbnail({ src, alt, className }: { src?: string | null; alt: string; className?: string }) {
  const [failedSource, setFailedSource] = useState<string | null>(null);

  if (!src || failedSource === src) {
    return (
      <span role="img" aria-label={`Sin imagen: ${alt}`}
        className={cn("grid place-items-center bg-admin-raised text-admin-muted", className)}>
        <ImageIcon className="size-4" aria-hidden />
      </span>
    );
  }

  // The admin accepts both remote URLs and local uploads.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={className} onError={() => setFailedSource(src)} loading="lazy" />;
}
