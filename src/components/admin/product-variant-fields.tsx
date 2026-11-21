"use client";

import { useState, useRef } from "react";
import {
  Layers,
  Palette,
  Pencil,
  Plus,
  Trash2,
  Barcode,
  Image as ImageIcon,
  Sparkles,
  Upload,
  X,
  Check,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CURRENCY_SYMBOL } from "@/lib/currency";
import { optimizeImageToWebP } from "@/lib/image-optimizer";
import { uploadProductImageAction } from "@/app/admin/actions/upload";
import { toast } from "sonner";
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
  attributes?: Record<string, string>;
};

export type OptionAttributeValue = {
  name: string;
  hex?: string;
};

export type OptionConfig = {
  id: string;
  name: string;
  type: "text" | "color";
  values: OptionAttributeValue[];
};

export const PALETTE_COLORS: OptionAttributeValue[] = [
  { name: "Negro", hex: "#000000" },
  { name: "Blanco", hex: "#FFFFFF" },
  { name: "Gris", hex: "#6B7280" },
  { name: "Rojo", hex: "#EF4444" },
  { name: "Azul", hex: "#3B82F6" },
  { name: "Verde", hex: "#10B981" },
  { name: "Amarillo", hex: "#F59E0B" },
  { name: "Morado", hex: "#8B5CF6" },
  { name: "Rosado", hex: "#EC4899" },
  { name: "Naranja", hex: "#F97316" },
  { name: "Café", hex: "#78350F" },
  { name: "Beige", hex: "#D4C5B9" },
];

export function emptyProductOption(id: number, initialVariant = ""): ProductOptionDraft {
  return {
    id,
    variant: initialVariant,
    price: "",
    costPrice: "",
    initialStock: "",
    variantColor: "",
    sku: "",
    barcode: "",
    mainImage: "",
    attributes: {},
  };
}

export function toProductOption({ id: _id, ...draft }: ProductOptionDraft): ProductOptionInput {
  const derivedVariant = draft.variant.trim() ||
    (draft.attributes && Object.keys(draft.attributes).length > 0
      ? Object.values(draft.attributes).map(v => v.includes("|") ? v.split("|")[0] : v).join(" / ")
      : "Variante");

  return {
    ...draft,
    variant: derivedVariant,
    attributes: draft.attributes && Object.keys(draft.attributes).length > 0 ? draft.attributes : undefined,
  };
}

export function VariantColorField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const hasColor = Boolean(value);

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(hasColor ? "" : "#7528e8")}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
          hasColor
            ? "border-admin-brand bg-admin-brand-light text-admin-brand-text"
            : "border-admin-card-border bg-admin-card-bg text-admin-secondary hover:bg-admin-raised"
        }`}
        title="Asignar un color visual a la variante"
      >
        <Palette className="size-3.5" />
        <span>{hasColor ? "Color activo" : "+ Color"}</span>
      </button>

      {hasColor && (
        <div className="flex items-center gap-1.5 bg-admin-raised p-1 rounded-lg border border-admin-card-border">
          <input
            aria-label="Color del círculo"
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-7 h-7 rounded cursor-pointer border-0 p-0 bg-transparent"
          />
          <span className="font-mono text-[11px] text-admin-muted uppercase pr-1">
            {value}
          </span>
        </div>
      )}
    </div>
  );
}

export function ProductSkuField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [editable, setEditable] = useState(false);

  return (
    <div className="flex items-end gap-1.5">
      <label className="grid min-w-0 flex-1 gap-1 text-xs font-semibold text-admin-secondary">
        <span>SKU</span>
        <Input
          readOnly={!editable}
          placeholder="Se genera automáticamente"
          value={value}
          maxLength={60}
          onChange={(e) => onChange(e.target.value)}
          className={`h-9 text-xs font-mono ${!editable ? "bg-admin-raised text-admin-muted" : "bg-admin-card-bg"}`}
        />
      </label>
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-label="Editar SKU"
        aria-pressed={editable}
        onClick={() => setEditable(!editable)}
        className="h-9 px-2.5 border-admin-card-border hover:bg-admin-raised"
      >
        <Pencil className="size-3.5" />
      </Button>
    </div>
  );
}

/**
 * Uploader de foto por variante con compresión WebP y carga directa
 */
function VariantImageField({
  value,
  onChange,
  onAddToGallery,
}: {
  value: string;
  onChange: (url: string) => void;
  onAddToGallery?: (url: string) => void;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const toastId = toast.loading("Optimizando foto de variante...");
    try {
      const { file: webpFile } = await optimizeImageToWebP(file, { maxWidthOrHeight: 1200, quality: 0.85 });
      const formData = new FormData();
      formData.append("file", webpFile);
      const res = await uploadProductImageAction(formData);

      if (res.success && res.url) {
        onChange(res.url);
        toast.success("Foto de variante guardada", { id: toastId });
      } else {
        toast.error("Error al subir", { id: toastId, description: res.error });
      }
    } catch (err: any) {
      toast.error("Error al procesar imagen", { id: toastId, description: err.message });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-admin-secondary flex items-center gap-1">
          <ImageIcon className="size-3 text-admin-muted" />
          <span>Foto de la variante (opcional)</span>
        </label>
        {value && onAddToGallery && (
          <button
            type="button"
            onClick={() => {
              onAddToGallery(value);
              toast.success("Foto añadida a la galería general");
            }}
            className="text-[10px] font-semibold text-admin-brand-text hover:underline"
          >
            + Añadir a galería general
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFile}
        />

        {value ? (
          <div className="flex items-center gap-2 w-full bg-admin-raised p-1.5 rounded-xl border border-admin-card-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt="Variante"
              className="size-9 rounded-lg object-cover border border-admin-card-border"
            />
            <Input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="https://..."
              className="h-8 text-xs font-mono flex-1 bg-admin-card-bg border-admin-card-border"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange("")}
              className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600"
              title="Quitar foto"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 w-full">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="h-9 px-3 text-xs font-semibold border-dashed border-admin-card-border hover:border-admin-brand hover:bg-admin-brand-subtle flex items-center gap-1.5"
            >
              <Upload className="size-3.5" />
              <span>{isUploading ? "Subiendo..." : "Subir foto"}</span>
            </Button>
            <Input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="O pega URL de foto (opcional)"
              className="h-9 text-xs bg-admin-card-bg border-admin-card-border flex-1"
            />
          </div>
        )}
      </div>
    </div>
  );
}

export function ProductVariantFields({
  options,
  onChange,
  onAdd,
  onAddToGallery,
  basePrice = "",
  baseCostPrice = "",
}: {
  options: ProductOptionDraft[];
  onChange: (options: ProductOptionDraft[]) => void;
  onAdd: () => void;
  onAddToGallery?: (url: string) => void;
  basePrice?: string;
  baseCostPrice?: string;
}) {
  // Configuración de Opciones Maestras (Shopify Style)
  const [optionConfigs, setOptionConfigs] = useState<OptionConfig[]>([
    {
      id: "opt-1",
      name: "Talla",
      type: "text",
      values: [
        { name: "S" },
        { name: "M" },
        { name: "L" },
      ],
    },
  ]);

  const [tempTextValue, setTempTextValue] = useState<Record<string, string>>({});
  const [customColorName, setCustomColorName] = useState<Record<string, string>>({});
  const [customColorHex, setCustomColorHex] = useState<Record<string, string>>({});

  // Añadir una nueva opción (máx 3)
  const handleAddOption = () => {
    if (optionConfigs.length >= 3) {
      toast.warning("Puedes definir un máximo de 3 opciones por producto.");
      return;
    }
    const hasColor = optionConfigs.some((o) => o.type === "color");
    const newConfig: OptionConfig = {
      id: `opt-${Date.now()}`,
      name: hasColor ? "Material" : "Color",
      type: hasColor ? "text" : "color",
      values: [],
    };
    setOptionConfigs([...optionConfigs, newConfig]);
  };

  const handleRemoveOption = (id: string) => {
    setOptionConfigs(optionConfigs.filter((o) => o.id !== id));
  };

  // Añadir valor de texto
  const handleAddTextValue = (optId: string) => {
    const val = tempTextValue[optId]?.trim();
    if (!val) return;
    setOptionConfigs((prev) =>
      prev.map((opt) => {
        if (opt.id !== optId) return opt;
        if (opt.values.some((v) => v.name.toLowerCase() === val.toLowerCase())) return opt;
        return { ...opt, values: [...opt.values, { name: val }] };
      })
    );
    setTempTextValue((prev) => ({ ...prev, [optId]: "" }));
  };

  // Añadir color de paleta
  const handleAddPaletteColor = (optId: string, color: OptionAttributeValue) => {
    setOptionConfigs((prev) =>
      prev.map((opt) => {
        if (opt.id !== optId) return opt;
        if (opt.values.some((v) => v.name.toLowerCase() === color.name.toLowerCase())) return opt;
        return { ...opt, values: [...opt.values, color] };
      })
    );
  };

  // Añadir color personalizado
  const handleAddCustomColor = (optId: string) => {
    const name = customColorName[optId]?.trim();
    const hex = customColorHex[optId] || "#7528e8";
    if (!name) {
      toast.warning("Escribe el nombre del color personalizado.");
      return;
    }
    setOptionConfigs((prev) =>
      prev.map((opt) => {
        if (opt.id !== optId) return opt;
        if (opt.values.some((v) => v.name.toLowerCase() === name.toLowerCase())) return opt;
        return { ...opt, values: [...opt.values, { name, hex }] };
      })
    );
    setCustomColorName((prev) => ({ ...prev, [optId]: "" }));
  };

  const handleRemoveValue = (optId: string, valName: string) => {
    setOptionConfigs((prev) =>
      prev.map((opt) => {
        if (opt.id !== optId) return opt;
        return { ...opt, values: opt.values.filter((v) => v.name !== valName) };
      })
    );
  };

  // Generador de Producto Cartesiano (Matriz de Variantes)
  const handleGenerateMatrix = () => {
    const validConfigs = optionConfigs.filter((o) => o.name.trim() !== "" && o.values.length > 0);
    if (validConfigs.length === 0) {
      toast.error("Configura al menos una opción con valores para generar la matriz.");
      return;
    }

    // Generar combinaciones cartesianas
    const arrays = validConfigs.map((cfg) =>
      cfg.values.map((v) => ({
        key: cfg.name.trim(),
        value: v.name,
        hex: v.hex,
      }))
    );

    const combos = arrays.reduce((acc, curr) => acc.flatMap((d) => curr.map((e) => [...d, e])), [[]] as {
      key: string;
      value: string;
      hex?: string;
    }[][]);

    const generated: ProductOptionDraft[] = combos.map((combo, idx) => {
      const attributes: Record<string, string> = {};
      let colorHex = "";
      combo.forEach((c) => {
        attributes[c.key] = c.value;
        if (c.hex) colorHex = c.hex;
      });

      const variantName = combo.map((c) => c.value).join(" / ");

      // Preservar datos si la variante ya existía en la lista
      const existing = options.find((opt) => {
        if (opt.attributes && Object.keys(opt.attributes).length === Object.keys(attributes).length) {
          return Object.entries(attributes).every(([k, v]) => opt.attributes?.[k] === v);
        }
        return opt.variant.toLowerCase() === variantName.toLowerCase();
      });

      if (existing) {
        return {
          ...existing,
          attributes,
          variant: variantName,
          variantColor: colorHex || existing.variantColor,
        };
      }

      return {
        id: Date.now() + idx,
        variant: variantName,
        price: basePrice || "",
        costPrice: baseCostPrice || "",
        initialStock: "0",
        variantColor: colorHex,
        sku: "",
        barcode: "",
        mainImage: "",
        attributes,
      };
    });

    onChange(generated);
    toast.success(`${generated.length} combinaciones generadas con éxito.`);
  };

  return (
    <section aria-label="Generador de variantes" className="space-y-6">
      {/* =========================================================================
          BLOQUE 1: DEFINICIÓN DE OPCIONES (ESTILO SHOPIFY)
          ========================================================================= */}
      <div className="rounded-2xl border border-admin-card-border bg-admin-raised p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-admin-card-border/60 pb-3">
          <div>
            <h4 className="text-sm font-bold text-admin-text flex items-center gap-2">
              <Sparkles className="size-4 text-admin-brand" />
              <span>Opciones del Producto (Atributos Maestros)</span>
            </h4>
            <p className="text-xs text-admin-secondary mt-0.5">
              Define los atributos como Talla o Color y genera automáticamente la matriz de inventario.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddOption}
              disabled={optionConfigs.length >= 3}
              className="h-8 text-xs font-semibold border-admin-card-border hover:bg-admin-card-bg"
            >
              <Plus className="size-3.5 mr-1" />
              <span>Añadir otra opción</span>
            </Button>
          </div>
        </div>

        {/* Lista de Opciones configurables */}
        <div className="space-y-4">
          {optionConfigs.map((cfg, cfgIndex) => (
            <div
              key={cfg.id}
              className="p-3.5 rounded-xl border border-admin-card-border bg-admin-card-bg space-y-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1">
                  <span className="size-5 rounded-full bg-admin-brand-light text-admin-brand-text text-[11px] font-bold flex items-center justify-center font-mono">
                    {cfgIndex + 1}
                  </span>
                  <Input
                    value={cfg.name}
                    placeholder="Nombre (ej. Talla, Color, Capacidad)"
                    onChange={(e) =>
                      setOptionConfigs((prev) =>
                        prev.map((o) => (o.id === cfg.id ? { ...o, name: e.target.value } : o))
                      )
                    }
                    className="h-8 text-xs font-bold max-w-[200px] bg-admin-card-bg border-admin-card-border"
                  />

                  {/* Selector de tipo */}
                  <select
                    value={cfg.type}
                    onChange={(e) =>
                      setOptionConfigs((prev) =>
                        prev.map((o) =>
                          o.id === cfg.id
                            ? {
                                ...o,
                                type: e.target.value as "text" | "color",
                                name: e.target.value === "color" && o.name === "Talla" ? "Color" : o.name,
                              }
                            : o
                        )
                      )
                    }
                    className="h-8 text-xs font-medium rounded-lg border border-admin-card-border bg-admin-card-bg px-2.5 text-admin-text"
                  >
                    <option value="text">Texto (Talla, Capacidad, etc.)</option>
                    <option value="color">Color Visual (con paleta)</option>
                  </select>
                </div>

                {optionConfigs.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveOption(cfg.id)}
                    className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600"
                    title="Eliminar opción"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </div>

              {/* Valores de la opción */}
              {cfg.type === "text" ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder={`Escribe un valor y pulsa Enter (ej. S, M, L)`}
                      value={tempTextValue[cfg.id] || ""}
                      onChange={(e) => setTempTextValue((prev) => ({ ...prev, [cfg.id]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddTextValue(cfg.id);
                        }
                      }}
                      className="h-8 text-xs bg-admin-raised border-admin-card-border flex-1"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => handleAddTextValue(cfg.id)}
                      className="h-8 text-xs font-bold px-3"
                    >
                      + Agregar
                    </Button>
                  </div>

                  {/* Chips de valores */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {cfg.values.map((val) => (
                      <span
                        key={val.name}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-admin-raised border border-admin-card-border text-xs font-semibold text-admin-text"
                      >
                        {val.name}
                        <button
                          type="button"
                          onClick={() => handleRemoveValue(cfg.id, val.name)}
                          className="text-slate-400 hover:text-rose-600 transition-colors ml-0.5"
                        >
                          <X className="size-3" />
                        </button>
                      </span>
                    ))}
                    {cfg.values.length === 0 && (
                      <p className="text-[11px] text-admin-muted italic">
                        Sin valores añadidos aún. Escribe arriba para agregar.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                /* Configuración de COLOR con Paleta */
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-bold text-admin-secondary mr-1">Paleta rápida:</span>
                    {PALETTE_COLORS.map((col) => {
                      const isSelected = cfg.values.some((v) => v.name === col.name);
                      return (
                        <button
                          key={col.name}
                          type="button"
                          onClick={() => handleAddPaletteColor(cfg.id, col)}
                          className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium border transition-all ${
                            isSelected
                              ? "border-admin-brand bg-admin-brand-light text-admin-brand-text font-bold"
                              : "border-admin-card-border bg-admin-raised hover:border-slate-400 text-admin-secondary"
                          }`}
                        >
                          <span
                            className="size-3 rounded-full border border-black/20"
                            style={{ backgroundColor: col.hex }}
                          />
                          <span>{col.name}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Color personalizado */}
                  <div className="flex items-center gap-2 pt-1 border-t border-admin-card-border/50">
                    <input
                      type="color"
                      aria-label="Selector de color personalizado"
                      value={customColorHex[cfg.id] || "#7528e8"}
                      onChange={(e) =>
                        setCustomColorHex((prev) => ({ ...prev, [cfg.id]: e.target.value }))
                      }
                      className="size-8 rounded cursor-pointer border-0 p-0 bg-transparent"
                    />
                    <Input
                      placeholder="Nombre del color (ej. Vino tinto)"
                      value={customColorName[cfg.id] || ""}
                      onChange={(e) =>
                        setCustomColorName((prev) => ({ ...prev, [cfg.id]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddCustomColor(cfg.id);
                        }
                      }}
                      className="h-8 text-xs max-w-[220px] bg-admin-raised border-admin-card-border"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddCustomColor(cfg.id)}
                      className="h-8 text-xs font-semibold"
                    >
                      + Añadir personalizado
                    </Button>
                  </div>

                  {/* Chips de colores activos */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {cfg.values.map((val) => (
                      <span
                        key={val.name}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-admin-raised border border-admin-card-border text-xs font-semibold text-admin-text"
                      >
                        {val.hex && (
                          <span
                            className="size-3 rounded-full border border-black/20"
                            style={{ backgroundColor: val.hex }}
                          />
                        )}
                        <span>{val.name}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveValue(cfg.id, val.name)}
                          className="text-slate-400 hover:text-rose-600 ml-0.5"
                        >
                          <X className="size-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Botón de Generar Matriz */}
        <div className="pt-2 flex justify-end">
          <Button
            type="button"
            onClick={handleGenerateMatrix}
            className="h-10 px-5 bg-admin-brand hover:bg-admin-brand/90 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-sm"
          >
            <RefreshCw className="size-3.5" />
            <span>Generar matriz de combinaciones</span>
          </Button>
        </div>
      </div>

      {/* =========================================================================
          BLOQUE 2: MATRIZ DE VARIANTES (TARJETAS LIMPIAS CON CÓDIGOS Y FOTO VISIBLES)
          ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-admin-secondary">
            Variantes Físicas en Inventario ({options.length})
          </h4>
          <span className="text-[11px] text-admin-muted">
            Cada variante tiene su propio stock, SKU, código de barras y Kárdex independiente
          </span>
        </div>

        <div className="space-y-3">
          {options.map((option, index) => {
            function setField(field: keyof Omit<ProductOptionDraft, "id">, value: any) {
              onChange(
                options.map((row) => (row.id === option.id ? { ...row, [field]: value } : row))
              );
            }

            return (
              <div
                key={option.id}
                className="rounded-2xl border border-admin-card-border bg-admin-card-bg p-4.5 space-y-3.5 shadow-2xs hover:border-admin-brand/35 transition-all"
              >
                {/* Cabecera de la Variante */}
                <div className="flex items-center justify-between gap-3 border-b border-admin-card-border/60 pb-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="flex items-center justify-center size-6 rounded-full bg-admin-brand-light text-admin-brand-text text-xs font-bold font-mono">
                      {index + 1}
                    </span>

                    {/* Atributos individuales como etiquetas visuales */}
                    {option.attributes && Object.keys(option.attributes).length > 0 ? (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {Object.entries(option.attributes).map(([attrKey, attrVal]) => (
                          <span
                            key={attrKey}
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-admin-raised border border-admin-card-border text-xs font-bold text-admin-text"
                          >
                            <span className="text-admin-muted font-normal">{attrKey}:</span>
                            <span>{attrVal}</span>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <Input
                          placeholder="Etiqueta (ej. S, M)"
                          value={option.variant}
                          onChange={(e) => setField("variant", e.target.value)}
                          className="h-7 text-xs font-bold max-w-[130px] bg-admin-raised border-admin-card-border"
                        />
                      </div>
                    )}

                    {option.variantColor && (
                      <span
                        className="size-3.5 rounded-full border border-black/15 shadow-2xs inline-block ml-1"
                        style={{ backgroundColor: option.variantColor }}
                        title={option.variantColor}
                      />
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <VariantColorField
                      value={option.variantColor}
                      onChange={(val) => setField("variantColor", val)}
                    />

                    {options.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label={`Eliminar opción ${index + 1}`}
                        onClick={() => onChange(options.filter((row) => row.id !== option.id))}
                        className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* FILA 1: Precios y Stock (El nombre se hereda de los atributos automáticamente) */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  <div className="sm:col-span-4 space-y-1">
                    <label className="text-xs font-bold text-admin-secondary">
                      Precio Venta ({CURRENCY_SYMBOL}) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        {CURRENCY_SYMBOL}
                      </span>
                      <Input
                        type="number"
                        required
                        min="0.01"
                        step="any"
                        placeholder="0.00"
                        value={option.price}
                        onChange={(e) => setField("price", e.target.value)}
                        className="pl-8 h-10 text-xs font-bold font-mono bg-admin-card-bg border-admin-card-border"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-4 space-y-1">
                    <label className="text-xs font-bold text-admin-secondary">
                      Costo Inicial ({CURRENCY_SYMBOL})
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        {CURRENCY_SYMBOL}
                      </span>
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="0.00"
                        value={option.costPrice}
                        onChange={(e) => setField("costPrice", e.target.value)}
                        className="pl-8 h-10 text-xs font-mono bg-admin-card-bg border-admin-card-border"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-4 space-y-1">
                    <label className="text-xs font-bold text-admin-secondary">
                      Stock Inicial (u.)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="0"
                      value={option.initialStock}
                      onChange={(e) => setField("initialStock", e.target.value)}
                      className="h-10 text-xs font-bold font-mono text-center bg-admin-card-bg border-admin-card-border"
                    />
                  </div>
                </div>

                {/* FILA 2: SKU, Código de barras y Foto opcional (DIRECTAMENTE VISIBLES DESDE EL INICIO) */}
                <div className="pt-2 border-t border-admin-card-border/60 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  <div className="sm:col-span-4">
                    <ProductSkuField value={option.sku} onChange={(val) => setField("sku", val)} />
                  </div>

                  <div className="sm:col-span-3 space-y-1">
                    <label className="text-xs font-semibold text-admin-secondary flex items-center gap-1">
                      <Barcode className="size-3 text-admin-muted" />
                      <span>Código de barras</span>
                    </label>
                    <Input
                      placeholder="Opcional"
                      value={option.barcode}
                      maxLength={60}
                      onChange={(e) => setField("barcode", e.target.value)}
                      className="h-9 text-xs font-mono bg-admin-card-bg border-admin-card-border"
                    />
                  </div>

                  <div className="sm:col-span-5">
                    <VariantImageField
                      value={option.mainImage}
                      onChange={(url) => setField("mainImage", url)}
                      onAddToGallery={onAddToGallery}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Botón de añadir otra variante manual */}
      <Button
        type="button"
        variant="outline"
        onClick={onAdd}
        disabled={options.length >= 100}
        className="w-full h-11 border-dashed border-2 border-admin-card-border hover:border-admin-brand hover:bg-admin-brand-subtle text-admin-brand-text font-bold text-xs rounded-2xl flex items-center justify-center gap-2 transition-all"
      >
        <Plus className="size-4" />
        <span>Añadir variante individual manualmente (+ {options.length + 1})</span>
      </Button>
    </section>
  );
}
