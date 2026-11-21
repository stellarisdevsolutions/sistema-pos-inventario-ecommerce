"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { returnPurchaseAction, type PurchaseItemDetail, type PurchaseListItem } from "@/app/admin/actions/purchases";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export function returnableQuantity(item: PurchaseItemDetail) {
  return Math.max(0, Math.min(item.availableStock, item.quantity - item.returnedQuantity));
}

export function PurchaseReturnDialog({ purchase, requestId, onClose, onSaved }: {
  purchase: PurchaseListItem;
  requestId: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const eligibleItems = purchase.items.filter(item => returnableQuantity(item) > 0);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const items = eligibleItems
      .map(item => ({ purchaseItemId: item.id, quantity: Number(form.get(`item-${item.id}`)) }))
      .filter(item => item.quantity > 0);

    setError("");
    setSubmitting(true);
    try {
      const result = await returnPurchaseAction({
        purchaseId: purchase.id,
        requestId,
        reason: String(form.get("reason") ?? ""),
        creditNoteReference: String(form.get("creditNoteReference") ?? ""),
        items,
      });
      if (result.success) {
        toast.success("Devolución registrada en el Kárdex");
        onClose();
        await onSaved();
      } else {
        setError(result.error ?? "No se pudo registrar la devolución.");
      }
    } catch {
      setError("No se pudo confirmar el resultado. Reintenta antes de salir de este formulario.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open onOpenChange={open => { if (!open && !submitting) onClose(); }}>
      <DialogContent className="admin-panel max-h-[90dvh] overflow-y-auto p-5 sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Devolver mercancía</DialogTitle>
          <DialogDescription>{purchase.purchaseNumber} · {purchase.supplierName}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <fieldset disabled={submitting} className="space-y-4">
            <legend className="mb-2 text-sm font-semibold">Unidades que salen del almacén</legend>
            <div className="divide-y divide-admin-card-border">
              {eligibleItems.map(item => (
                <label key={item.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span>
                    <strong className="block font-medium">{item.productName}</strong>
                    <span className="text-xs text-admin-muted">Compradas {item.quantity} · Devueltas {item.returnedQuantity} · Disponible {item.availableStock}</span>
                  </span>
                  <Input type="number" name={`item-${item.id}`} min={0} max={returnableQuantity(item)} step={1} placeholder="0" className="w-24 shrink-0" />
                </label>
              ))}
            </div>
            <label className="grid gap-1 text-sm">Motivo
              <Input name="reason" required maxLength={500} />
            </label>
            <label className="grid gap-1 text-sm">Referencia de nota de crédito (opcional)
              <Input name="creditNoteReference" maxLength={60} />
            </label>
          </fieldset>
          <p className="text-xs text-admin-muted">El Kárdex valora la salida al costo promedio vigente. La referencia de nota de crédito queda registrada para consulta.</p>
          {error && <p role="alert" className="text-sm text-admin-danger">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={submitting} onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={submitting || !eligibleItems.length} className="bg-admin-brand text-admin-on-solid hover:bg-admin-brand-hover">
              {submitting ? "Registrando…" : "Registrar devolución"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
