"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { deleteProductAction, toggleProductActiveAction } from "@/app/admin/actions/products";

type Product = { id: number; stock: number; isActive?: boolean; canHardDelete?: boolean };

export function ProductLifecycle({ product, name, onChange }: {
  product: Product; name: string; onChange: (deleted: boolean) => void;
}) {
  const [operation, setOperation] = useState<"delete" | "archive" | null>(null);
  const [busy, setBusy] = useState(false);
  const active = product.isActive ?? true;
  const archiveLabel = active ? "Archivar" : "Reactivar";
  const label = operation === "delete" ? "Eliminar producto" : archiveLabel;

  async function confirm() {
    setBusy(true);
    try {
      const deleting = operation === "delete";
      const result = deleting ? await deleteProductAction(product.id) : await toggleProductActiveAction(product.id, !active);
      if (!result.success) { toast.error(result.error); return; }
      setOperation(null);
      toast.success(deleting ? "Producto eliminado" : active ? "Producto archivado" : "Producto reactivado");
      onChange(deleting);
    } catch {
      toast.error("Revisa tu conexión y actualiza la ficha para comprobar el estado.");
    } finally { setBusy(false); }
  }

  return <div className="flex flex-wrap gap-2">
    <Button type="button" size="sm" variant="outline" onClick={() => setOperation("archive")}>{archiveLabel}</Button>
    {product.canHardDelete && <Button type="button" size="sm" variant="outline" onClick={() => setOperation("delete")}>Eliminar producto</Button>}
    <Dialog open={operation !== null} onOpenChange={open => { if (!open && !busy) setOperation(null); }}>
      <DialogContent className="admin-panel">
        <DialogHeader><DialogTitle>{label} · {name}</DialogTitle>
          <DialogDescription>{operation === "delete"
            ? `Se eliminarán la ficha y su apertura inicial de ${product.stock} unidades. Esta acción es definitiva.`
            : active ? "Se retirará de la venta. El historial de caja, reportes y Kárdex se conserva." : "Volverá a estar disponible en el POS. Puedes habilitar la publicación web desde la edición."}</DialogDescription>
        </DialogHeader>
        {operation === "archive" && active && product.stock > 0 && <p>Quedan {product.stock} unidades en inventario. Revisa el saldo y registra su venta o una baja si corresponde.</p>}
        <DialogFooter><Button type="button" variant="outline" disabled={busy} onClick={() => setOperation(null)}>Cancelar</Button>
          <Button type="button" disabled={busy} onClick={confirm}>{label}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </div>;
}
