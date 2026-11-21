"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CURRENCY_SYMBOL } from "@/lib/currency";
import type { ProductOptionInput } from "@/lib/validations/product";

export type ProductOptionDraft = {
  id: number;
  variant: string;
  price: string;
  costPrice: string;
  initialStock: string;
  variantColor: string;
  sku: string;
  barcode: string;
  mainImage: string;
};

export function emptyProductOption(id: number): ProductOptionDraft {
  return { id, variant: "", price: "", costPrice: "", initialStock: "", variantColor: "", sku: "", barcode: "", mainImage: "" };
}

export function toProductOption({ id: _id, ...draft }: ProductOptionDraft): ProductOptionInput {
  return draft;
}

export function VariantColorField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={Boolean(value)} onChange={e => onChange(e.target.checked ? "#2e7d32" : "")} />
        Mostrar círculo de color
      </label>
      {value && (
        <Input aria-label="Color del círculo" type="color" value={value} onChange={e => onChange(e.target.value)} className="w-12 p-1" />
      )}
    </div>
  );
}

export function ProductSkuField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [editable, setEditable] = useState(false);

  return (
    <div className="flex items-end gap-2">
      <label className="grid min-w-0 flex-1 gap-1 text-sm">SKU
        <Input readOnly={!editable} placeholder="Se genera al guardar" value={value} maxLength={60} onChange={e => onChange(e.target.value)} />
      </label>
      <Button type="button" variant="outline" aria-label="Editar SKU" aria-pressed={editable} onClick={() => setEditable(!editable)}>
        <Pencil className="size-4" />
      </Button>
    </div>
  );
}

export function ProductVariantFields({ options, onChange, onAdd }: {
  options: ProductOptionDraft[];
  onChange: (options: ProductOptionDraft[]) => void;
  onAdd: () => void;
}) {
  return (
    <section aria-label="Opciones del modelo" className="space-y-3">
      <p className="text-sm text-admin-muted">Escribe cada opción disponible, como 41, Verde o S / Verde. Cada una tiene su propio precio y existencias.</p>
      {options.map((option, index) => {
        function set(field: keyof Omit<ProductOptionDraft, "id">, value: string) {
          onChange(options.map(row => row.id === option.id ? { ...row, [field]: value } : row));
        }

        return (
          <fieldset key={option.id} className="space-y-3 rounded-xl border border-admin-card-border p-4">
            <legend className="px-2 text-sm font-semibold">Opción {index + 1}</legend>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <label className="grid min-w-0 flex-1 gap-1 text-sm">Valor de la variante
                <Input placeholder="41, Verde o S / Verde" value={option.variant} maxLength={100} required onChange={e => set("variant", e.target.value)} />
              </label>
              {options.length > 1 && (
                <Button type="button" variant="outline" aria-label={`Quitar opción ${index + 1}`}
                  onClick={() => onChange(options.filter(row => row.id !== option.id))}>
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="grid gap-1 text-sm">Precio ({CURRENCY_SYMBOL})
                <Input type="number" required min="0.01" step="0.01" value={option.price} onChange={e => set("price", e.target.value)} />
              </label>
              <label className="grid gap-1 text-sm">Costo inicial ({CURRENCY_SYMBOL})
                <Input type="number" min="0" step="0.01" placeholder="0" value={option.costPrice} onChange={e => set("costPrice", e.target.value)} />
              </label>
              <label className="grid gap-1 text-sm">Stock inicial
                <Input type="number" min="0" step="1" placeholder="0" value={option.initialStock} onChange={e => set("initialStock", e.target.value)} />
              </label>
            </div>
            <details className="space-y-2">
              <summary className="cursor-pointer text-sm text-admin-secondary">Color, foto y códigos opcionales</summary>
              <VariantColorField value={option.variantColor} onChange={value => set("variantColor", value)} />
              <label className="grid gap-1 text-sm">URL HTTPS de la foto
                <Input type="url" placeholder="Usa la foto del modelo si se deja vacío" value={option.mainImage} maxLength={1500} onChange={e => set("mainImage", e.target.value)} />
              </label>
              <div className="grid gap-2 sm:grid-cols-2">
                <ProductSkuField value={option.sku} onChange={value => set("sku", value)} />
                <label className="grid gap-1 text-sm">Código de barras
                  <Input value={option.barcode} maxLength={60} onChange={e => set("barcode", e.target.value)} />
                </label>
              </div>
            </details>
          </fieldset>
        );
      })}
      <Button type="button" variant="outline" onClick={onAdd} disabled={options.length >= 100}>
        <Plus className="size-4" /> Agregar otra opción
      </Button>
    </section>
  );
}
