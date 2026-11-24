"use client";

import { useState, useRef, useEffect } from "react";
import {
  Palette,
  Pencil,
  Plus,
  Trash2,
  Barcode,
  Image as ImageIcon,
  Upload,
  Type,
  Layers,
  AlertCircle,
  ChevronDown,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProductThumbnail } from "@/components/admin/product-thumbnail";
import { CURRENCY_SYMBOL } from "@/lib/currency";
import { optimizeImageToWebP } from "@/lib/image-optimizer";
import { uploadProductImageAction } from "@/app/admin/actions/upload";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  safeImageUrlSchema,
  type ProductOptionConfig,
  type ProductOptionInput,
} from "@/lib/validations/product";

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

export type OptionConfig = ProductOptionConfig;

type VariantBuilderMode = "color" | "text" | "combined";

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

const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

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

export function toProductOption(draft: ProductOptionDraft): ProductOptionInput {
  const derivedVariant =
    draft.attributes && Object.keys(draft.attributes).length > 0
      ? Object.values(draft.attributes)
          .map((v) => (v.includes("|") ? v.split("|")[0] : v))
          .join(" / ")
      : draft.variant.trim();

  return {
    variant: derivedVariant,
    price: draft.price,
    costPrice: draft.costPrice,
    initialStock: draft.initialStock,
    variantColor: draft.variantColor,
    sku: draft.sku,
    barcode: draft.barcode,
    mainImage: draft.mainImage,
    attributes:
      draft.attributes && Object.keys(draft.attributes).length > 0 ? draft.attributes : undefined,
  };
}

export function deriveOptionConfigsFromDrafts(options: ProductOptionDraft[]): OptionConfig[] {
  const byKey = new Map<
    string,
    { displayName: string; isColor: boolean; values: Map<string, string | undefined> }
  >();

  for (const opt of options) {
    if (!opt.attributes) continue;
    for (const [rawKey, rawVal] of Object.entries(opt.attributes)) {
      const displayName = rawKey.trim().slice(0, 60);
      const valName = (rawVal.includes("|") ? rawVal.split("|")[0] : rawVal).trim().slice(0, 60);
      if (!displayName || !valName) continue;

      const normalizedKey = displayName.toLowerCase();
      let entry = byKey.get(normalizedKey);
      if (!entry) {
        entry = {
          displayName,
          isColor: normalizedKey === "color",
          values: new Map(),
        };
        byKey.set(normalizedKey, entry);
      }

      if (!entry.values.has(valName)) {
        const hex =
          entry.isColor && HEX_COLOR_REGEX.test(opt.variantColor)
            ? opt.variantColor
            : undefined;
        entry.values.set(valName, hex);
      }
    }
  }

  return Array.from(byKey.values())
    .slice(0, 3)
    .map((entry, idx) => ({
      id: `opt-${idx + 1}`,
      name: entry.displayName,
      type: entry.isColor ? ("color" as const) : ("text" as const),
      values: Array.from(entry.values.entries())
        .slice(0, 50)
        .map(([name, hex]) => (hex ? { name, hex } : { name })),
    }));
}

function normalizeAttrKey(attrs?: Record<string, string> | null): string {
  if (!attrs) return "";
  const entries = Object.entries(attrs)
    .map(([k, v]) => [k.trim().toLowerCase(), v.trim().toLowerCase()] as const)
    .filter(([k, v]) => k !== "" && v !== "")
    .sort(([a], [b]) => a.localeCompare(b));
  return entries.map(([k, v]) => `${k}=${v}`).join("|");
}

function isDuplicateDraft(
  options: ProductOptionDraft[],
  variantName: string,
  attributes?: Record<string, string> | null
): boolean {
  const normalizedName = variantName.trim().toLowerCase();
  const normalizedAttrs = normalizeAttrKey(attributes);

  return options.some((opt) => {
    if (normalizedName && opt.variant.trim().toLowerCase() === normalizedName) {
      return true;
    }
    if (normalizedAttrs && normalizeAttrKey(opt.attributes) === normalizedAttrs) {
      return true;
    }
    return false;
  });
}

function nextDraftBaseId(options: ProductOptionDraft[]): number {
  return options.reduce((max, item) => Math.max(max, item.id), 0) + 1;
}

function initialBuilderFromHint(modelOptionsHint?: OptionConfig[] | null): {
  mode: VariantBuilderMode;
  attrName: string;
} {
  if (!modelOptionsHint || modelOptionsHint.length === 0) {
    return { mode: "color", attrName: "Talla" };
  }

  const hasColor = modelOptionsHint.some(
    (cfg) => cfg.type === "color" || cfg.name.trim().toLowerCase() === "color"
  );
  const firstText = modelOptionsHint.find(
    (cfg) => cfg.type !== "color" && cfg.name.trim().toLowerCase() !== "color"
  );

  if (hasColor && firstText) {
    return { mode: "combined", attrName: firstText.name || "Talla" };
  }
  if (hasColor) {
    return { mode: "color", attrName: "Talla" };
  }
  if (firstText) {
    return { mode: "text", attrName: firstText.name || "Talla" };
  }
  return { mode: "color", attrName: "Talla" };
}

/**
 * Selector visual de colores compacto con cuadros redondeados y altura controlada
 */
function ColorDropdown({
  id,
  value,
  onSelect,
  disabledColors,
  placeholder = "Seleccionar color...",
}: {
  id?: string;
  value: string;
  onSelect: (colorName: string) => void;
  disabledColors?: Set<string>;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleMouseDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const selectedCol = PALETTE_COLORS.find((c) => c.name === value);

  return (
    <div ref={containerRef} className="relative flex-1 min-w-0">
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="w-full h-10 rounded-xl border border-admin-card-border bg-admin-card-bg px-3 text-xs flex items-center justify-between gap-2 cursor-pointer transition-colors hover:border-admin-brand/50 focus-visible:outline-none focus-visible:border-admin-brand focus-visible:ring-2 focus-visible:ring-admin-brand/20"
      >
        {selectedCol ? (
          <span className="flex items-center gap-2 min-w-0">
            <span
              className="size-4 rounded-[5px] border border-black/15 shrink-0"
              style={{ backgroundColor: selectedCol.hex }}
            />
            <span className="font-medium text-admin-text truncate">{selectedCol.name}</span>
          </span>
        ) : (
          <span className="text-admin-muted truncate">{placeholder}</span>
        )}
        <ChevronDown
          className={cn(
            "size-4 text-admin-muted shrink-0 transition-transform duration-150",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 right-0 z-30 mt-1.5 rounded-xl border border-admin-card-border bg-admin-card-bg shadow-lg py-1 max-h-56 overflow-y-auto"
        >
          {PALETTE_COLORS.map((col) => {
            const isDisabled = Boolean(disabledColors?.has(col.name.toLowerCase()));
            const isSelected = value === col.name;

            return (
              <button
                key={col.name}
                type="button"
                role="option"
                aria-selected={isSelected}
                disabled={isDisabled}
                onClick={() => {
                  onSelect(col.name);
                  setOpen(false);
                }}
                className={cn(
                  "w-full px-3 py-2 text-xs flex items-center gap-2.5 transition-colors",
                  isDisabled
                    ? "text-admin-muted opacity-55 cursor-not-allowed"
                    : isSelected
                    ? "bg-admin-brand-subtle text-admin-text font-semibold cursor-pointer"
                    : "text-admin-text hover:bg-admin-raised cursor-pointer"
                )}
              >
                <span
                  className={cn(
                    "size-4 rounded-[5px] border border-black/15 shrink-0",
                    isDisabled && "opacity-45"
                  )}
                  style={{ backgroundColor: col.hex }}
                />
                <span className="flex-1 text-left truncate">{col.name}</span>
                {isSelected && <Check className="size-3.5 text-admin-brand-text shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
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
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer",
          hasColor
            ? "border-admin-brand bg-admin-brand-light text-admin-brand-text"
            : "border-admin-card-border bg-admin-card-bg text-admin-secondary hover:bg-admin-raised"
        )}
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
  compact = false,
}: {
  value: string;
  onChange: (value: string) => void;
  compact?: boolean;
}) {
  const [editable, setEditable] = useState(false);

  return (
    <div className="flex items-end gap-1.5">
      <label className="grid min-w-0 flex-1 gap-1.5 text-xs font-semibold text-admin-secondary">
        <span>SKU</span>
        <Input
          readOnly={!editable}
          placeholder="Se genera automáticamente"
          value={value}
          maxLength={60}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            compact ? "h-9" : "h-10",
            "text-xs font-mono rounded-xl border-admin-card-border",
            !editable ? "bg-admin-raised text-admin-muted" : "bg-admin-card-bg text-admin-text"
          )}
        />
      </label>
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-label="Editar SKU"
        aria-pressed={editable}
        onClick={() => setEditable(!editable)}
        title={editable ? "Bloquear edición manual" : "Personalizar SKU"}
        className={cn(
          compact ? "h-9" : "h-10",
          "px-2.5 rounded-xl border-admin-card-border hover:bg-admin-raised cursor-pointer"
        )}
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
      const { file: webpFile } = await optimizeImageToWebP(file, {
        maxWidthOrHeight: 1200,
        quality: 0.85,
      });
      const formData = new FormData();
      formData.append("file", webpFile);
      const res = await uploadProductImageAction(formData);

      if (res.success && res.url) {
        onChange(res.url);
        toast.success("Foto de variante guardada", { id: toastId });
      } else {
        toast.error("Error al subir", { id: toastId, description: res.error });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error inesperado";
      toast.error("Error al procesar imagen", { id: toastId, description: message });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const isUrlInvalid = Boolean(value && !safeImageUrlSchema.safeParse(value).success);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-semibold text-admin-secondary flex items-center gap-1">
          <ImageIcon className="size-3 text-admin-muted" />
          <span>Foto de variante (opcional)</span>
        </label>
        {value && !isUrlInvalid && onAddToGallery && (
          <button
            type="button"
            onClick={() => {
              onAddToGallery(value);
              toast.success("Foto añadida a la galería general");
            }}
            className="text-[10px] font-semibold text-admin-brand-text hover:underline cursor-pointer"
          >
            + A galería
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
          <div className="flex items-center gap-2 w-full bg-admin-raised p-1 rounded-xl border border-admin-card-border h-9">
            <ProductThumbnail
              src={value}
              alt="Variante"
              className="size-7 rounded-lg object-cover border border-admin-card-border shrink-0"
            />
            <Input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="https://..."
              className={cn(
                "h-7 text-xs font-mono flex-1 bg-admin-card-bg border-admin-card-border rounded-lg",
                isUrlInvalid ? "border-rose-500 text-rose-600" : ""
              )}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange("")}
              className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 cursor-pointer"
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
              className="h-9 px-3 rounded-xl text-xs font-semibold border-dashed border-admin-card-border hover:border-admin-brand hover:bg-admin-brand-subtle flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Upload className="size-3.5" />
              <span>{isUploading ? "Subiendo..." : "Subir"}</span>
            </Button>
            <Input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="O pega URL HTTPS"
              className="h-9 rounded-xl text-xs bg-admin-card-bg border-admin-card-border flex-1"
            />
          </div>
        )}
      </div>
      {isUrlInvalid && (
        <p className="text-[10px] font-medium text-rose-600">
          Ingresa una URL HTTPS pública válida o sube una foto local.
        </p>
      )}
    </div>
  );
}

const MODE_OPTIONS: {
  id: VariantBuilderMode;
  title: string;
  description: string;
  icon: typeof Palette;
}[] = [
  {
    id: "color",
    title: "Color",
    description: "Solo por color",
    icon: Palette,
  },
  {
    id: "text",
    title: "Texto",
    description: "Talla, capacidad, etc.",
    icon: Type,
  },
  {
    id: "combined",
    title: "Combinado",
    description: "Color + atributo de texto",
    icon: Layers,
  },
];

export function ProductVariantFields({
  options,
  onChange,
  onAddToGallery,
  basePrice = "",
  baseCostPrice = "",
  modelOptionsHint,
}: {
  options: ProductOptionDraft[];
  onChange: (options: ProductOptionDraft[]) => void;
  onAddToGallery?: (url: string) => void;
  basePrice?: string;
  baseCostPrice?: string;
  modelOptionsHint?: OptionConfig[] | null;
}) {
  const initialHint = initialBuilderFromHint(modelOptionsHint);
  const [mode, setMode] = useState<VariantBuilderMode>(initialHint.mode);
  const [selectedColorValue, setSelectedColorValue] = useState<string>("");
  const [isCustomColor, setIsCustomColor] = useState(false);
  const [customColorName, setCustomColorName] = useState("");
  const [customColorHex, setCustomColorHex] = useState("#7528e8");
  const [attrName, setAttrName] = useState(initialHint.attrName);
  const [attrValue, setAttrValue] = useState("");

  const [bulkPrice, setBulkPrice] = useState("");
  const [bulkCost, setBulkCost] = useState("");
  const [bulkStock, setBulkStock] = useState("");

  const attrValueInputRef = useRef<HTMLInputElement>(null);

  const presetColor = !isCustomColor
    ? PALETTE_COLORS.find((c) => c.name === selectedColorValue)
    : undefined;

  const resolvedColorName = isCustomColor ? customColorName.trim() : presetColor?.name ?? "";
  const resolvedColorHex = isCustomColor ? customColorHex : presetColor?.hex ?? "#7528e8";

  const trimmedAttrName = attrName.trim();
  const trimmedAttrValue = attrValue.trim();
  const colorConflictInCombined =
    mode === "combined" && trimmedAttrName.toLowerCase() === "color";

  const disabledColors = new Set<string>();
  if (mode === "color") {
    for (const col of PALETTE_COLORS) {
      if (isDuplicateDraft(options, col.name, { Color: col.name })) {
        disabledColors.add(col.name.toLowerCase());
      }
    }
  } else if (
    mode === "combined" &&
    trimmedAttrName &&
    trimmedAttrValue &&
    !colorConflictInCombined
  ) {
    for (const col of PALETTE_COLORS) {
      if (
        isDuplicateDraft(options, `${col.name} / ${trimmedAttrValue}`, {
          Color: col.name,
          [trimmedAttrName]: trimmedAttrValue,
        })
      ) {
        disabledColors.add(col.name.toLowerCase());
      }
    }
  }

  const handleAttrNameChange = (nextRaw: string) => {
    setAttrName(nextRaw);
    const nextKey = nextRaw.trim();
    if (!nextKey) return;
    if (mode === "combined" && nextKey.toLowerCase() === "color") return;

    let changed = false;
    const updated = options.map((opt) => {
      if (!opt.attributes) return opt;
      const entries = Object.entries(opt.attributes);
      const nonColorEntry = entries.find(([k]) => k.trim().toLowerCase() !== "color");
      if (!nonColorEntry || nonColorEntry[0] === nextKey) return opt;

      changed = true;
      const nextAttrs: Record<string, string> = {};
      for (const [k, v] of entries) {
        if (k === nonColorEntry[0]) {
          nextAttrs[nextKey] = v;
        } else {
          nextAttrs[k] = v;
        }
      }
      return { ...opt, attributes: nextAttrs };
    });

    if (changed) {
      onChange(updated);
    }
  };

  const currentCandidate: {
    variantName: string;
    attributes: Record<string, string>;
    colorHex: string;
  } | null = (() => {
    if (mode === "color") {
      if (!resolvedColorName) return null;
      return {
        variantName: resolvedColorName,
        attributes: { Color: resolvedColorName },
        colorHex: resolvedColorHex,
      };
    }

    if (mode === "text") {
      if (!trimmedAttrName || !trimmedAttrValue) return null;
      return {
        variantName: trimmedAttrValue,
        attributes: { [trimmedAttrName]: trimmedAttrValue },
        colorHex: "",
      };
    }

    if (
      !resolvedColorName ||
      !trimmedAttrName ||
      !trimmedAttrValue ||
      colorConflictInCombined
    ) {
      return null;
    }

    return {
      variantName: `${resolvedColorName} / ${trimmedAttrValue}`,
      attributes: {
        Color: resolvedColorName,
        [trimmedAttrName]: trimmedAttrValue,
      },
      colorHex: resolvedColorHex,
    };
  })();

  const isCurrentDuplicate = Boolean(
    currentCandidate &&
      isDuplicateDraft(options, currentCandidate.variantName, currentCandidate.attributes)
  );

  const handleAddVariant = () => {
    if (mode !== "text" && !resolvedColorName) {
      if (isCustomColor) {
        toast.warning("Escribe el nombre del color personalizado.");
      } else {
        toast.warning("Selecciona un color o pulsa Otro color.");
      }
      return;
    }

    if (mode !== "color") {
      if (!trimmedAttrName) {
        toast.warning("Escribe el nombre del atributo (ej. Talla).");
        return;
      }
      if (colorConflictInCombined) {
        toast.warning("El color ya está incluido; usa otro nombre como Talla o Capacidad.");
        return;
      }
      if (!trimmedAttrValue) {
        toast.warning("Escribe el valor de la variante (ej. S, M, 128GB).");
        return;
      }
    }

    if (!currentCandidate) return;

    if (isDuplicateDraft(options, currentCandidate.variantName, currentCandidate.attributes)) {
      toast.error(`La variante "${currentCandidate.variantName}" ya está en la lista.`);
      return;
    }

    if (options.length >= 100) {
      toast.error("Puedes añadir hasta un máximo de 100 variantes por producto.");
      return;
    }

    const created: ProductOptionDraft = {
      id: nextDraftBaseId(options),
      variant: currentCandidate.variantName,
      price: bulkPrice || basePrice || "",
      costPrice: bulkCost || baseCostPrice || "",
      initialStock: bulkStock || "0",
      variantColor: currentCandidate.colorHex,
      sku: "",
      barcode: "",
      mainImage: "",
      attributes: currentCandidate.attributes,
    };

    onChange([...options, created]);
    toast.success(`Variante "${currentCandidate.variantName}" añadida.`);

    if (mode === "color") {
      if (isCustomColor) {
        setCustomColorName("");
      } else {
        setSelectedColorValue("");
      }
    } else {
      setAttrValue("");
      attrValueInputRef.current?.focus();
    }
  };

  const handleApplyBulk = () => {
    if (!bulkPrice && !bulkCost && !bulkStock) {
      toast.warning("Ingresa al menos un valor (precio, costo o stock) para aplicar.");
      return;
    }
    onChange(
      options.map((opt) => ({
        ...opt,
        price: bulkPrice || opt.price,
        costPrice: bulkCost || opt.costPrice,
        initialStock: bulkStock || opt.initialStock,
      }))
    );
    toast.success("Valores aplicados a todas las variantes.");
  };

  const totalVariantUnits = options.reduce(
    (sum, opt) => sum + (parseInt(opt.initialStock, 10) || 0),
    0
  );

  const hasVariants = options.length > 0;

  const handleModeChange = (nextMode: VariantBuilderMode) => {
    if (nextMode === mode) return;
    if (hasVariants) {
      toast.info("Elimina las variantes añadidas para cambiar el tipo.");
      return;
    }
    setMode(nextMode);
    setSelectedColorValue("");
    setIsCustomColor(false);
    setCustomColorName("");
    setAttrValue("");
  };

  const renderColorSelectorControl = () => (
    <div className="flex items-center gap-2">
      {!isCustomColor ? (
        <>
          <ColorDropdown
            id="variant-color-select"
            value={selectedColorValue}
            onSelect={(colName) => {
              setSelectedColorValue(colName);
              setIsCustomColor(false);
            }}
            disabledColors={disabledColors}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setIsCustomColor(true);
              setSelectedColorValue("");
            }}
            className="h-10 px-3.5 rounded-xl text-xs font-semibold shrink-0 border-admin-card-border bg-admin-card-bg text-admin-text hover:bg-admin-raised cursor-pointer"
          >
            Otro color
          </Button>
        </>
      ) : (
        <>
          <input
            type="color"
            aria-label="Selector de color personalizado"
            value={customColorHex}
            onChange={(e) => setCustomColorHex(e.target.value)}
            className="size-10 rounded-xl cursor-pointer border border-admin-card-border bg-admin-card-bg p-1 shrink-0"
          />
          <Input
            id="variant-custom-color-name"
            placeholder="Nombre del color (ej. Vino tinto)"
            value={customColorName}
            maxLength={60}
            onChange={(e) => setCustomColorName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddVariant();
              }
            }}
            className="h-10 rounded-xl text-xs flex-1 min-w-0 bg-admin-card-bg border-admin-card-border"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsCustomColor(false)}
            title="Volver a la lista de colores"
            className="h-10 px-3 rounded-xl text-xs font-semibold shrink-0 border-admin-card-border bg-admin-card-bg text-admin-secondary hover:bg-admin-raised cursor-pointer"
          >
            Lista
          </Button>
        </>
      )}
    </div>
  );

  return (
    <section aria-label="Constructor de variantes" className="space-y-5">
      {/* =========================================================================
          SELECTOR DE TIPO DE VARIANTE (3 TARJETAS)
          ========================================================================= */}
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold text-admin-secondary">
            Tipo de variante
          </span>
          {hasVariants && (
            <span className="text-[11px] text-admin-muted">
              Elimina las variantes añadidas para cambiar el tipo.
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {MODE_OPTIONS.map((item) => {
            const Icon = item.icon;
            const active = mode === item.id;
            const disabled = hasVariants && !active;
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={active}
                disabled={disabled}
                onClick={() => handleModeChange(item.id)}
                className={cn(
                  "p-3.5 rounded-xl border text-left transition-all flex items-start gap-3",
                  active
                    ? "border-admin-brand bg-admin-brand-subtle ring-1 ring-admin-brand/30 cursor-pointer"
                    : disabled
                    ? "border-admin-card-border bg-admin-raised/40 opacity-50 cursor-not-allowed"
                    : "border-admin-card-border bg-admin-raised/50 hover:bg-admin-raised cursor-pointer"
                )}
              >
                <div
                  className={cn(
                    "size-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                    active
                      ? "bg-admin-brand text-admin-on-solid"
                      : "bg-admin-card-bg text-admin-muted border border-admin-card-border"
                  )}
                >
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-admin-text block">
                    {item.title}
                  </span>
                  <span className="text-[11px] text-admin-muted block mt-0.5">
                    {item.description}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
          BLOQUE ÚNICO DIRECTO DE CAMPOS + BOTÓN AÑADIR
          ========================================================================= */}
      <div className="rounded-2xl border border-admin-card-border bg-admin-raised p-4 space-y-3.5">
        {/* Input único compartido para el nombre del atributo de texto (Texto / Combinado) */}
        {(mode === "text" || mode === "combined") && (
          <div className="space-y-1.5">
            <label
              htmlFor="variant-attr-name"
              className="text-xs font-semibold text-admin-secondary block"
            >
              Nombre del atributo (para todas las variantes)
            </label>
            <Input
              id="variant-attr-name"
              placeholder="Ej. Talla, Capacidad, Material"
              value={attrName}
              maxLength={60}
              onChange={(e) => handleAttrNameChange(e.target.value)}
              className="h-10 rounded-xl text-xs font-medium bg-admin-card-bg border-admin-card-border max-w-sm"
            />
          </div>
        )}

        {/* Fila de captura según modo */}
        {mode === "color" && (
          <div className="flex flex-col sm:flex-row sm:items-end gap-2.5">
            <div className="flex-1 min-w-0 space-y-1.5">
              <label
                htmlFor={isCustomColor ? "variant-custom-color-name" : "variant-color-select"}
                className="text-xs font-semibold text-admin-secondary block"
              >
                {isCustomColor ? "Color personalizado" : "Colores"}
              </label>
              {renderColorSelectorControl()}
            </div>

            <Button
              type="button"
              onClick={handleAddVariant}
              className="h-10 px-5 bg-admin-brand hover:bg-admin-brand-hover text-admin-on-solid font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            >
              <Plus className="size-4" />
              <span>Añadir</span>
            </Button>
          </div>
        )}

        {mode === "text" && (
          <div className="border-t border-admin-card-border/60 pt-3 flex flex-col sm:flex-row sm:items-end gap-2.5">
            <div className="flex-1 min-w-0 space-y-1.5">
              <label
                htmlFor="variant-attr-value"
                className="text-xs font-semibold text-admin-secondary block"
              >
                Valor de {trimmedAttrName || "la variante"}
              </label>
              <Input
                ref={attrValueInputRef}
                id="variant-attr-value"
                placeholder="Ej. S, M, L..."
                value={attrValue}
                maxLength={60}
                onChange={(e) => setAttrValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddVariant();
                  }
                }}
                className="h-10 rounded-xl text-xs font-medium bg-admin-card-bg border-admin-card-border"
              />
            </div>

            <Button
              type="button"
              onClick={handleAddVariant}
              className="h-10 px-5 bg-admin-brand hover:bg-admin-brand-hover text-admin-on-solid font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            >
              <Plus className="size-4" />
              <span>Añadir</span>
            </Button>
          </div>
        )}

        {mode === "combined" && (
          <div className="border-t border-admin-card-border/60 pt-3 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
            <div className="sm:col-span-6 space-y-1.5">
              <label
                htmlFor={isCustomColor ? "variant-custom-color-name" : "variant-color-select"}
                className="text-xs font-semibold text-admin-secondary block"
              >
                {isCustomColor ? "Color personalizado" : "Color"}
              </label>
              {renderColorSelectorControl()}
            </div>

            <div className="sm:col-span-4 space-y-1.5">
              <label
                htmlFor="variant-attr-value"
                className="text-xs font-semibold text-admin-secondary block"
              >
                Valor de {trimmedAttrName || "la variante"}
              </label>
              <Input
                ref={attrValueInputRef}
                id="variant-attr-value"
                placeholder="Ej. S, M, L..."
                value={attrValue}
                maxLength={60}
                onChange={(e) => setAttrValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddVariant();
                  }
                }}
                className="h-10 rounded-xl text-xs font-medium bg-admin-card-bg border-admin-card-border"
              />
            </div>

            <div className="sm:col-span-2">
              <Button
                type="button"
                onClick={handleAddVariant}
                className="w-full h-10 bg-admin-brand hover:bg-admin-brand-hover text-admin-on-solid font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="size-4" />
                <span>Añadir</span>
              </Button>
            </div>
          </div>
        )}

        {/* Avisos de validación en línea */}
        {colorConflictInCombined && (
          <p className="flex items-center gap-1.5 text-xs font-medium text-rose-600 dark:text-rose-400">
            <AlertCircle className="size-3.5 shrink-0" />
            <span>El color ya está incluido; usa otro nombre como Talla o Capacidad.</span>
          </p>
        )}

        {!colorConflictInCombined && isCurrentDuplicate && currentCandidate && (
          <p className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-300">
            <AlertCircle className="size-3.5 shrink-0" />
            <span>
              La variante &ldquo;{currentCandidate.variantName}&rdquo; ya está en la lista. Cambia
              el valor para no repetir.
            </span>
          </p>
        )}
      </div>

      {/* =========================================================================
          LISTA DE VARIANTES AÑADIDAS (UNA CARD POR FILA)
          ========================================================================= */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-semibold text-admin-text">
            Variantes añadidas ({options.length})
          </h4>
          <span className="text-xs font-semibold tabular-nums text-admin-secondary bg-admin-raised border border-admin-card-border rounded-lg px-2.5 py-1">
            Total: {totalVariantUnits} u.
          </span>
        </div>

        {options.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-admin-card-border bg-admin-raised/40 p-6 text-center">
            <p className="text-xs text-admin-muted">
              Todavía no añadiste variantes. Completa los campos de arriba y pulsa{" "}
              <span className="font-semibold text-admin-text">Añadir</span>.
            </p>
          </div>
        ) : (
          <>
            {options.length > 1 && (
              <div className="rounded-xl border border-admin-card-border bg-admin-raised/80 p-3 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                <div className="sm:col-span-3">
                  <label className="text-[11px] font-semibold text-admin-secondary block mb-1">
                    Precio general ({CURRENCY_SYMBOL})
                  </label>
                  <Input
                    type="number"
                    min="0.01"
                    step="any"
                    placeholder="Ej. 120.00"
                    value={bulkPrice}
                    onChange={(e) => setBulkPrice(e.target.value)}
                    className="h-8 text-xs bg-admin-card-bg border-admin-card-border font-mono tabular-nums rounded-lg"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="text-[11px] font-semibold text-admin-secondary block mb-1">
                    Costo general ({CURRENCY_SYMBOL})
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="Ej. 75.00"
                    value={bulkCost}
                    onChange={(e) => setBulkCost(e.target.value)}
                    className="h-8 text-xs bg-admin-card-bg border-admin-card-border font-mono tabular-nums rounded-lg"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="text-[11px] font-semibold text-admin-secondary block mb-1">
                    Stock inicial (u.)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="Ej. 10"
                    value={bulkStock}
                    onChange={(e) => setBulkStock(e.target.value)}
                    className="h-8 text-xs bg-admin-card-bg border-admin-card-border font-mono tabular-nums rounded-lg"
                  />
                </div>
                <div className="sm:col-span-3">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleApplyBulk}
                    className="w-full h-8 text-xs font-semibold rounded-lg cursor-pointer"
                  >
                    Aplicar a todas
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {options.map((option, index) => {
                function setField<K extends keyof Omit<ProductOptionDraft, "id">>(
                  field: K,
                  value: ProductOptionDraft[K]
                ) {
                  onChange(
                    options.map((row) => (row.id === option.id ? { ...row, [field]: value } : row))
                  );
                }

                const optPrice = parseFloat(option.price) || 0;
                const optCost = parseFloat(option.costPrice) || 0;
                const optMargin = optPrice > 0 ? ((optPrice - optCost) / optPrice) * 100 : null;
                const marginTone =
                  optMargin === null
                    ? ""
                    : optMargin >= 20
                    ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border-emerald-500/25"
                    : optMargin >= 0
                    ? "bg-amber-500/12 text-amber-700 dark:text-amber-300 border-amber-500/25"
                    : "bg-rose-500/12 text-rose-700 dark:text-rose-300 border-rose-500/25";

                return (
                  <div
                    key={option.id}
                    className="rounded-xl border border-admin-card-border bg-admin-card-bg p-4 space-y-3 hover:border-admin-brand/35 transition-colors"
                  >
                    {/* Cabecera compacta de la card */}
                    <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-admin-card-border/60 pb-2.5">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="flex items-center justify-center size-6 rounded-full bg-admin-brand-light text-admin-brand-text text-xs font-bold font-mono shrink-0">
                          {index + 1}
                        </span>

                        <div className="flex items-center gap-2 flex-wrap text-sm font-semibold text-admin-text">
                          {option.variantColor && (
                            <span
                              aria-hidden
                              className="size-4 rounded-[5px] border border-black/15 shrink-0"
                              style={{ backgroundColor: option.variantColor }}
                            />
                          )}

                          {option.attributes && Object.keys(option.attributes).length > 0 ? (
                            <span className="flex items-center gap-1.5 flex-wrap">
                              {Object.entries(option.attributes).map(([attrKey, attrVal], entryIdx) => {
                                const isColorKey = attrKey.trim().toLowerCase() === "color";
                                return (
                                  <span key={attrKey} className="inline-flex items-center gap-1.5">
                                    {entryIdx > 0 && (
                                      <span aria-hidden className="text-admin-muted font-normal">
                                        ·
                                      </span>
                                    )}
                                    {isColorKey ? (
                                      <span>{attrVal}</span>
                                    ) : (
                                      <span>
                                        <span className="text-admin-muted font-normal">
                                          {attrKey}:
                                        </span>{" "}
                                        <span>{attrVal}</span>
                                      </span>
                                    )}
                                  </span>
                                );
                              })}
                            </span>
                          ) : (
                            <span>{option.variant}</span>
                          )}
                        </div>

                        {optMargin !== null && (
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold tabular-nums",
                              marginTone
                            )}
                          >
                            {optMargin >= 0 ? "+" : ""}
                            {optMargin.toFixed(1)}%
                          </span>
                        )}
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label={`Eliminar variante ${index + 1}`}
                        onClick={() => onChange(options.filter((row) => row.id !== option.id))}
                        className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>

                    {/* FILA 1: Precios y Stock */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                      <div className="sm:col-span-4 space-y-1">
                        <label className="text-xs font-semibold text-admin-secondary block">
                          Precio Venta ({CURRENCY_SYMBOL}) <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-admin-muted">
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
                            className="pl-9 h-9 rounded-xl text-xs font-semibold font-mono tabular-nums bg-admin-card-bg border-admin-card-border"
                          />
                        </div>
                      </div>

                      <div className="sm:col-span-4 space-y-1">
                        <label className="text-xs font-semibold text-admin-secondary block">
                          Costo Inicial ({CURRENCY_SYMBOL})
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-admin-muted">
                            {CURRENCY_SYMBOL}
                          </span>
                          <Input
                            type="number"
                            min="0"
                            step="any"
                            placeholder="0.00"
                            value={option.costPrice}
                            onChange={(e) => setField("costPrice", e.target.value)}
                            className="pl-9 h-9 rounded-xl text-xs font-mono tabular-nums bg-admin-card-bg border-admin-card-border"
                          />
                        </div>
                      </div>

                      <div className="sm:col-span-4 space-y-1">
                        <label className="text-xs font-semibold text-admin-secondary block">
                          Stock Inicial (u.)
                        </label>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="0"
                          value={option.initialStock}
                          onChange={(e) => setField("initialStock", e.target.value)}
                          className="h-9 rounded-xl text-xs font-semibold font-mono tabular-nums text-center bg-admin-card-bg border-admin-card-border"
                        />
                      </div>
                    </div>

                    {/* FILA 2: SKU, Código de barras y Foto opcional */}
                    <div className="pt-2 border-t border-admin-card-border/60 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                      <div className="sm:col-span-4">
                        <ProductSkuField
                          compact
                          value={option.sku}
                          onChange={(val) => setField("sku", val)}
                        />
                      </div>

                      <div className="sm:col-span-3 space-y-1.5">
                        <label className="text-xs font-semibold text-admin-secondary flex items-center gap-1">
                          <Barcode className="size-3 text-admin-muted" />
                          <span>Código de barras</span>
                        </label>
                        <Input
                          placeholder="Opcional"
                          value={option.barcode}
                          maxLength={60}
                          onChange={(e) => setField("barcode", e.target.value)}
                          className="h-9 rounded-xl text-xs font-mono bg-admin-card-bg border-admin-card-border"
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
          </>
        )}
      </div>
    </section>
  );
}
