"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { addModelVariantsAction, type getProductById } from "@/app/admin/actions/products";
import { Button, buttonVariants } from "@/components/ui/button";
import { ProductVariantFields, toProductOption, type ProductOptionDraft } from "./product-variant-fields";
import { ProductLifecycle } from "./product-lifecycle";
import { formatCurrency } from "@/lib/currency";
import { modelDimensions } from "@/lib/model-variants";

export function ModelSiblings({ product, onChanged }: {
  product: NonNullable<Awaited<ReturnType<typeof getProductById>>>; onChanged: () => void;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [options, setOptions] = useState<ProductOptionDraft[]>([]);
  const [busy, setBusy] = useState(false);
  const model = product.model;

  async function save() {
    if (!model || busy) return;
    setBusy(true);
    try {
      const result = await addModelVariantsAction(model.code, options.map(toProductOption));
      if (!result.success) { toast.error(result.error); return; }
      toast.success("Variantes añadidas");
      setOptions([]);
      setAdding(false);
      onChanged();
    } catch {
      toast.error("Verifica la conexión y actualiza las variantes antes de reintentar.");
    } finally { setBusy(false); }
  }

  return <section className="admin-panel p-5 space-y-4">
    <h2 className="font-semibold text-admin-text">{model ? "Variantes de este modelo" : "Estado del producto"}</h2>
    <ul className="divide-y divide-admin-card-border">
      {product.siblings.map(row => <li key={row.id} className="flex flex-wrap items-center gap-3 py-3">
        {row.variantColor && <span className="size-5 rounded-[5px] border border-admin-card-border" style={{ backgroundColor: row.variantColor }} />}
        <div className="flex-1 min-w-36">
          <strong>{row.variant || product.name}</strong>
          {row.id === product.id && model && <small className="ml-2 text-admin-brand-text">En edición</small>}
          <p className="text-xs text-admin-muted">{row.sku} · {formatCurrency(row.price)} · {row.stock} uds · {row.isActive ? "Activo" : "Archivado"}</p>
        </div>
        {row.id !== product.id && <Link className={buttonVariants({ size: "sm", variant: "outline" })} href={`/admin/inventario/${row.id}/editar`}>Editar</Link>}
        <ProductLifecycle product={row} name={row.variant ?? product.name} onChange={deleted => {
          if (deleted && row.id === product.id) router.replace("/admin/inventario");
          else onChanged();
        }} />
      </li>)}
    </ul>
    {model && <>
      <p className="text-xs text-admin-muted">Para cambiar la estructura de atributos, archiva las variantes cuando su stock llegue a cero y crea otro modelo.</p>
      <Button type="button" variant="outline" disabled={busy} onClick={() => setAdding(!adding)}>{adding ? "Cerrar constructor" : "+ Añadir nuevas variantes a este modelo"}</Button>
      {adding && <>
        <ProductVariantFields options={options} onChange={setOptions} locked modelOptionsHint={modelDimensions(model)}
          basePrice={product.price} baseCostPrice={product.costPrice} existingVariants={product.siblings.map(p => p.variant ?? "")} />
        <Button disabled={busy || !options.length} onClick={save}>Guardar variantes</Button>
      </>}
    </>}
  </section>;
}
