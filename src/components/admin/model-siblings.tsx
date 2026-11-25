"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { addModelVariantsAction, type getProductById } from "@/app/admin/actions/products";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  ProductVariantFields,
  toProductOption,
  type ProductOptionDraft,
} from "./product-variant-fields";
import { ProductLifecycle } from "./product-lifecycle";
import { ProductThumbnail } from "./product-thumbnail";
import { CURRENCY_SYMBOL, formatCurrency } from "@/lib/currency";
import { modelDimensions } from "@/lib/model-variants";

export function ModelSiblings({
  product,
  onChanged,
}: {
  product: NonNullable<Awaited<ReturnType<typeof getProductById>>>;
  onChanged: () => void;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [options, setOptions] = useState<ProductOptionDraft[]>([]);
  const [busy, setBusy] = useState(false);
  const model = product.model;

  async function save() {
    if (!model || busy) return;
    if (options.length === 0) {
      toast.error("Añade al menos una variante antes de guardar.");
      return;
    }
    if (options.some((opt) => (parseFloat(opt.price) || 0) <= 0)) {
      toast.error(`Ingresa un precio de venta mayor a 0 ${CURRENCY_SYMBOL} en todas las variantes.`);
      return;
    }

    setBusy(true);
    try {
      const result = await addModelVariantsAction(model.code, options.map(toProductOption));
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Variantes añadidas");
      setOptions([]);
      setAdding(false);
      onChanged();
    } catch {
      toast.error("Verifica la conexión y actualiza las variantes antes de reintentar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="admin-panel p-5 sm:p-6 space-y-4 max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-admin-card-border pb-3">
        <h2 className="text-base font-semibold text-admin-text tracking-tight">
          {model ? "Variantes de este modelo" : "Estado del producto"}
        </h2>
        {model && (
          <span className="text-xs font-mono text-admin-muted">
            {product.siblings.length}{" "}
            {product.siblings.length === 1 ? "variante" : "variantes"}
          </span>
        )}
      </div>

      <ul className="divide-y divide-admin-card-border">
        {product.siblings.map((row) => {
          const thumbSrc = row.imageUrl || model?.imageUrl;
          return (
          <li key={row.id} className="flex flex-wrap items-center gap-3 py-3">
            {thumbSrc && (
              <ProductThumbnail
                src={thumbSrc}
                alt={row.variant || product.name}
                className="size-9 rounded-lg object-cover border border-admin-card-border shrink-0"
              />
            )}
            {row.variantColor && (
              <span
                className="size-5 rounded-[5px] border border-admin-card-border shrink-0"
                style={{ backgroundColor: row.variantColor }}
              />
            )}
            <div className="flex-1 min-w-36">
              <strong className="text-sm text-admin-text">
                {row.variant || product.name}
              </strong>
              {row.id === product.id && model && (
                <small className="ml-2 font-semibold text-admin-brand-text">En edición</small>
              )}
              <p className="text-xs text-admin-muted">
                {row.sku} · {formatCurrency(row.price)} · {row.stock} uds ·{" "}
                {row.isArchived ? "Archivado" : row.isActive ? "Activo" : "Inactivo"}
              </p>
            </div>
            {row.id !== product.id && (
              <Link
                className={buttonVariants({ size: "sm", variant: "outline" })}
                href={`/admin/inventario/${row.id}/editar`}
              >
                Editar
              </Link>
            )}
            <ProductLifecycle
              product={row}
              name={row.variant ?? product.name}
              onChange={(deleted) => {
                if (deleted && row.id === product.id) router.replace("/admin/inventario");
                else onChanged();
              }}
            />
          </li>
          );
        })}
      </ul>

      {model && (
        <div className="space-y-3 pt-2 border-t border-admin-card-border">
          <p className="text-xs text-admin-muted">
            Para cambiar la estructura de atributos, archiva las variantes cuando su stock llegue a
            cero y crea otro modelo.
          </p>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => setAdding(!adding)}
            className="rounded-xl text-xs font-semibold cursor-pointer"
          >
            {adding ? "Cerrar constructor" : "+ Añadir nuevas variantes a este modelo"}
          </Button>

          {adding && (
            <div className="space-y-4 pt-2">
              <ProductVariantFields
                options={options}
                onChange={setOptions}
                locked
                modelOptionsHint={modelDimensions(model)}
                basePrice={product.price}
                baseCostPrice={product.costPrice}
                existingVariants={product.siblings.map((p) => p.variant ?? "")}
              />
              <div className="flex justify-end">
                <Button
                  type="button"
                  disabled={busy || options.length === 0}
                  onClick={save}
                  className="h-10 px-5 rounded-xl bg-admin-brand hover:bg-admin-brand-hover text-admin-on-solid text-xs font-semibold cursor-pointer"
                >
                  {busy ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <span>Guardar variantes</span>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
