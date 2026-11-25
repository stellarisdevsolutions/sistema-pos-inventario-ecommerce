"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Award, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import {
  createBrandAction,
  deleteBrandAction,
  updateBrandAction,
} from "@/app/admin/actions/products";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export type BrandOption = {
  id: number;
  name: string;
};

interface BrandManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brands: BrandOption[];
  products: { brand?: string | null }[];
  onBrandsChanged: (
    nextBrands: BrandOption[],
    change?: { oldName: string; newName: string | null }
  ) => void;
}

export function BrandManagerDialog({
  open,
  onOpenChange,
  brands,
  products,
  onBrandsChanged,
}: BrandManagerDialogProps) {
  const [newBrandName, setNewBrandName] = useState("");
  const [editingBrand, setEditingBrand] = useState<{ id: number; original: string; current: string } | null>(
    null
  );
  const [brandToDelete, setBrandToDelete] = useState<BrandOption | null>(null);
  const [busyAction, setBusyAction] = useState(false);

  const sortBrands = (list: BrandOption[]) =>
    [...list].sort((a, b) => a.name.localeCompare(b.name, "es"));

  const handleAddBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busyAction) return;
    const trimmed = newBrandName.trim();
    if (!trimmed) {
      toast.error("Nombre requerido", { description: "Ingresa el nombre de la nueva marca." });
      return;
    }
    if (brands.some((b) => b.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.warning("Marca existente", { description: `La marca "${trimmed}" ya está registrada.` });
      return;
    }

    setBusyAction(true);
    try {
      const res = await createBrandAction(trimmed);
      if (res.success && res.data) {
        const created = res.data as BrandOption;
        onBrandsChanged(sortBrands([...brands, { id: created.id, name: created.name }]));
        setNewBrandName("");
        toast.success("Marca creada", {
          description: `"${created.name}" ya está disponible en el catálogo.`,
        });
      } else {
        toast.error("Error al crear marca", { description: res.error });
      }
    } finally {
      setBusyAction(false);
    }
  };

  const handleSaveEditBrand = async () => {
    if (!editingBrand || busyAction) return;
    const trimmed = editingBrand.current.trim();
    if (!trimmed) {
      toast.error("Nombre requerido", { description: "Escribe el nombre de la marca." });
      return;
    }
    if (
      brands.some(
        (b) => b.id !== editingBrand.id && b.name.toLowerCase() === trimmed.toLowerCase()
      )
    ) {
      toast.warning("Nombre duplicado", { description: `Ya existe una marca llamada "${trimmed}".` });
      return;
    }

    setBusyAction(true);
    try {
      const res = await updateBrandAction(editingBrand.id, trimmed);
      if (!res.success) {
        toast.error("Error al actualizar marca", { description: res.error });
        return;
      }

      const nextBrands = sortBrands(
        brands.map((b) => (b.id === editingBrand.id ? { ...b, name: trimmed } : b))
      );
      onBrandsChanged(nextBrands, { oldName: editingBrand.original, newName: trimmed });
      setEditingBrand(null);
      toast.success("Marca actualizada", {
        description: `"${editingBrand.original}" cambió a "${trimmed}".`,
      });
    } finally {
      setBusyAction(false);
    }
  };

  const handleConfirmDeleteBrand = async () => {
    if (!brandToDelete || busyAction) return;
    const target = brandToDelete;
    const affectedCount = products.filter(
      (p) => (p.brand || "").toLowerCase() === target.name.toLowerCase()
    ).length;

    setBusyAction(true);
    try {
      const res = await deleteBrandAction(target.id);
      if (!res.success) {
        toast.error("Error al eliminar marca", { description: res.error });
        return;
      }

      const nextBrands = brands.filter((b) => b.id !== target.id);
      onBrandsChanged(nextBrands, { oldName: target.name, newName: null });
      setBrandToDelete(null);
      toast.info("Marca eliminada", {
        description:
          affectedCount > 0
            ? `"${target.name}" fue eliminada. Sus ${affectedCount} producto(s) quedaron sin marca.`
            : `"${target.name}" fue eliminada.`,
      });
    } finally {
      setBusyAction(false);
    }
  };

  const closeModal = (nextOpen: boolean) => {
    if (!nextOpen && busyAction) return;
    if (!nextOpen) {
      setEditingBrand(null);
      setBrandToDelete(null);
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={closeModal}>
      <DialogContent className="sm:max-w-xl rounded-xl p-6 bg-admin-card-bg border border-admin-card-border">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-admin-brand-subtle border border-admin-brand-light flex items-center justify-center text-admin-brand-text">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-admin-text tracking-tight">
                Gestión de Marcas
              </DialogTitle>
              <DialogDescription className="text-xs text-admin-muted">
                Crea, renombra o elimina marcas comerciales del catálogo.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleAddBrand} className="space-y-2 pt-2">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Nueva marca..."
              value={newBrandName}
              onChange={(e) => setNewBrandName(e.target.value)}
              disabled={busyAction}
              className="h-10 text-xs rounded-xl flex-1"
            />
            <Button
              type="submit"
              size="sm"
              disabled={busyAction}
              className="h-10 px-5 rounded-xl bg-admin-brand hover:bg-admin-brand-hover text-admin-on-solid font-semibold text-xs gap-1.5 shrink-0 cursor-pointer"
            >
              {busyAction && !editingBrand && !brandToDelete ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              <span>Crear</span>
            </Button>
          </div>
        </form>

        {brandToDelete && (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 space-y-2.5 animate-in fade-in-50 duration-150">
            <div className="flex items-start gap-2.5 text-rose-900 dark:text-rose-200">
              <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold">
                  ¿Eliminar la marca &ldquo;{brandToDelete.name}&rdquo;?
                </p>
                <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-0.5 leading-tight">
                  Sus{" "}
                  {
                    products.filter(
                      (p) => (p.brand || "").toLowerCase() === brandToDelete.name.toLowerCase()
                    ).length
                  }{" "}
                  producto(s) <strong>no se borrarán</strong>; quedarán como <strong>&ldquo;Sin marca&rdquo;</strong> y conservarán todo su Kárdex.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1 border-t border-rose-200/60 dark:border-rose-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busyAction}
                onClick={() => setBrandToDelete(null)}
                className="h-8 text-xs font-bold cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={busyAction}
                onClick={handleConfirmDeleteBrand}
                className="h-8 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer"
              >
                {busyAction ? "Eliminando..." : "Sí, eliminar"}
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-2 max-h-72 overflow-y-auto pr-1.5 custom-scrollbar">
          {brands.length === 0 ? (
            <div className="p-6 text-center rounded-xl border border-dashed border-admin-card-border text-xs text-admin-muted">
              No hay marcas registradas todavía. Crea la primera arriba para asignarla en tus productos.
            </div>
          ) : (
            brands.map((brand) => {
              const productCount = products.filter(
                (p) => (p.brand || "").toLowerCase() === brand.name.toLowerCase()
              ).length;
              const isEditing = editingBrand?.id === brand.id;

              return (
                <div
                  key={brand.id}
                  className="p-3 rounded-xl border border-admin-card-border bg-admin-raised flex items-center justify-between gap-3"
                >
                  {isEditing ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        value={editingBrand.current}
                        onChange={(e) =>
                          setEditingBrand({ ...editingBrand, current: e.target.value })
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            void handleSaveEditBrand();
                          }
                        }}
                        className="h-8 text-xs rounded-lg bg-admin-card-bg font-bold"
                        autoFocus
                      />
                      <Button
                        type="button"
                        size="sm"
                        disabled={busyAction}
                        onClick={() => void handleSaveEditBrand()}
                        className="h-8 px-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shrink-0 cursor-pointer"
                      >
                        Guardar
                      </Button>
                      <button
                        type="button"
                        disabled={busyAction}
                        onClick={() => setEditingBrand(null)}
                        className="h-8 w-8 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 shrink-0 cursor-pointer"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-8 w-8 rounded-lg bg-admin-card-bg border border-admin-card-border flex items-center justify-center text-admin-brand-text shrink-0">
                          <Award className="h-4 w-4" />
                        </div>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs font-semibold text-admin-text truncate">
                            {brand.name}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-[10px] font-mono font-medium text-admin-muted border-admin-card-border shrink-0"
                          >
                            {productCount} {productCount === 1 ? "artículo" : "artículos"}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          disabled={busyAction}
                          onClick={() =>
                            setEditingBrand({
                              id: brand.id,
                              original: brand.name,
                              current: brand.name,
                            })
                          }
                          title="Editar nombre de marca"
                          className="h-8 w-8 rounded-lg border border-admin-card-border bg-admin-card-bg hover:bg-amber-50 hover:border-amber-300 text-slate-500 hover:text-amber-600 flex items-center justify-center cursor-pointer transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={busyAction}
                          onClick={() => setBrandToDelete(brand)}
                          title="Eliminar marca"
                          className="h-8 w-8 rounded-lg border border-admin-card-border bg-admin-card-bg hover:bg-rose-50 hover:border-rose-300 text-slate-500 hover:text-rose-600 flex items-center justify-center cursor-pointer transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>

        <DialogFooter className="pt-2 border-t border-admin-card-border">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => closeModal(false)}
            className="rounded-xl h-9 text-xs font-bold cursor-pointer"
          >
            Listo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
