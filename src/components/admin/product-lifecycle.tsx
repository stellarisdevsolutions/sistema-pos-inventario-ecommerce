"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteProductAction, archiveProductAction } from "@/app/admin/actions/products";

type Product = {
  id: number;
  stock: number;
  isActive?: boolean;
  isArchived?: boolean;
  canHardDelete?: boolean;
};

export function ProductLifecycle({
  product,
  name,
  onChange,
}: {
  product: Product;
  name: string;
  onChange: (deleted: boolean) => void;
}) {
  const [operation, setOperation] = useState<"delete" | "archive" | null>(null);
  const [busy, setBusy] = useState(false);
  const archived = Boolean(product.isArchived);
  const archiveLabel = archived ? "Restaurar" : "Archivar";
  const label = operation === "delete" ? "Eliminar producto" : archiveLabel;

  async function confirm() {
    setBusy(true);
    try {
      const deleting = operation === "delete";
      const result = deleting
        ? await deleteProductAction(product.id)
        : await archiveProductAction(product.id, !archived);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setOperation(null);
      toast.success(
        deleting ? "Producto eliminado" : archived ? "Producto restaurado" : "Producto archivado"
      );
      onChange(deleting);
    } catch {
      toast.error("Revisa tu conexión y actualiza la ficha para comprobar el estado.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => setOperation("archive")}
        className="h-8 rounded-xl text-xs font-semibold border-admin-card-border bg-admin-card-bg text-admin-secondary hover:text-admin-text cursor-pointer"
      >
        {archiveLabel}
      </Button>

      {product.canHardDelete && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setOperation("delete")}
          className="h-8 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/10 cursor-pointer"
        >
          Eliminar producto
        </Button>
      )}

      <Dialog
        open={operation !== null}
        onOpenChange={(open) => {
          if (!open && !busy) setOperation(null);
        }}
      >
        <DialogContent className="admin-panel">
          <DialogHeader>
            <DialogTitle>
              {label} · {name}
            </DialogTitle>
            <DialogDescription>
              {operation === "delete"
                ? `Se eliminarán la ficha y su apertura inicial de ${product.stock} unidades. Esta acción es definitiva.`
                : archived
                ? "Volverá al catálogo operativo como Activo en el POS. Puedes habilitar la publicación web al editar."
                : "Se moverá a Archivados y quedará oculto del catálogo operativo (POS, compras y web). Su historial, compras y capital siguen en reportes y puedes restaurarlo cuando lo necesites."}
            </DialogDescription>
          </DialogHeader>

          {operation === "archive" && !archived && product.stock > 0 && (
            <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
              Quedan <strong>{product.stock} unidades</strong> en inventario. Seguirán
              contabilizadas en Valor en bodega y Dashboard hasta que las vendas tras restaurar o
              registres una baja / merma.
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => setOperation(null)}
              className="rounded-xl text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={busy}
              onClick={confirm}
              className={
                operation === "delete"
                  ? "rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
                  : "rounded-xl text-xs font-semibold bg-admin-brand hover:bg-admin-brand-hover text-admin-on-solid cursor-pointer"
              }
            >
              {busy ? "Procesando..." : label}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
