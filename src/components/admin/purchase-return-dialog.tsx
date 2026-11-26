"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { returnPurchaseAction, type PurchaseItemDetail, type PurchaseListItem } from "@/app/admin/actions/purchases";
import { CURRENCY_SYMBOL, formatCurrencyLocale } from "@/lib/currency";
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
  const [quantities, setQuantities] = useState<Record<number, string>>({});
  const [creditedAmountInput, setCreditedAmountInput] = useState("");
  const [isCustomCreditedAmount, setIsCustomCreditedAmount] = useState(false);

  const eligibleItems = purchase.items.filter(item => returnableQuantity(item) > 0);
  const excludedItemsCount = purchase.items.length - eligibleItems.length;

  let selectedUnits = 0;
  let expectedTotalCents = 0;
  for (const item of eligibleItems) {
    const raw = (quantities[item.id] ?? "").trim();
    if (!raw || !/^\d+$/.test(raw)) continue;
    const qty = Number(raw);
    if (qty > 0) {
      selectedUnits += qty;
      expectedTotalCents += Math.round(item.unitCost * 100) * qty;
    }
  }
  const expectedTotal = expectedTotalCents / 100;

  const displayedCreditedValue = isCustomCreditedAmount
    ? creditedAmountInput
    : (selectedUnits > 0 ? expectedTotal.toFixed(2) : "");

  const parsedCustomCredited = isCustomCreditedAmount && creditedAmountInput.trim() !== ""
    ? Number(creditedAmountInput.trim())
    : null;
  const customCreditedCents = parsedCustomCredited !== null && Number.isFinite(parsedCustomCredited)
    ? Math.round(parsedCustomCredited * 100)
    : null;

  const exceedsExpected =
    selectedUnits > 0 && customCreditedCents !== null && customCreditedCents > expectedTotalCents;
  const adjustmentCents =
    selectedUnits > 0 &&
    customCreditedCents !== null &&
    customCreditedCents >= 0 &&
    customCreditedCents < expectedTotalCents
      ? expectedTotalCents - customCreditedCents
      : 0;
  const adjustmentAmount = adjustmentCents / 100;

  function handleQuantityChange(itemId: number, value: string) {
    const next = { ...quantities, [itemId]: value };
    setQuantities(next);
    const hasAnyQty = eligibleItems.some((item) => {
      const raw = (next[item.id] ?? "").trim();
      return /^\d+$/.test(raw) && Number(raw) > 0;
    });
    if (!hasAnyQty) {
      setIsCustomCreditedAmount(false);
      setCreditedAmountInput("");
    }
    if (error) setError("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsedItems: { purchaseItemId: number; quantity: number }[] = [];
    for (const item of eligibleItems) {
      const raw = (quantities[item.id] ?? "").trim();
      if (!raw) continue;
      if (!/^\d+$/.test(raw)) {
        setError("Revisa las cantidades: deben ser números enteros.");
        return;
      }
      const qty = Number(raw);
      if (!Number.isInteger(qty) || qty < 0 || qty > returnableQuantity(item)) {
        setError("Revisa las cantidades: deben ser enteros dentro del saldo disponible por devolver.");
        return;
      }
      if (qty > 0) {
        parsedItems.push({ purchaseItemId: item.id, quantity: qty });
      }
    }

    if (parsedItems.length === 0) {
      setError("Indica cuántas unidades vas a devolver.");
      return;
    }

    let creditedAmountPayload: number | undefined;
    if (isCustomCreditedAmount && creditedAmountInput.trim() !== "") {
      const parsed = Number(creditedAmountInput.trim());
      if (!Number.isFinite(parsed) || parsed < 0) {
        setError("Ingresa un monto reconocido válido mayor o igual a 0.");
        return;
      }
      const creditedCents = Math.round(parsed * 100);
      if (creditedCents > expectedTotalCents) {
        setError("El monto reconocido por el proveedor no puede superar el valor total de las unidades devueltas.");
        return;
      }
      creditedAmountPayload = creditedCents / 100;
    }

    const reason = String(form.get("reason") ?? "").trim();
    if (!reason) {
      setError("Indica el motivo de la devolución.");
      return;
    }

    setError("");
    setSubmitting(true);
    try {
      const result = await returnPurchaseAction({
        purchaseId: purchase.id,
        requestId,
        reason,
        creditNoteReference: String(form.get("creditNoteReference") ?? "").trim(),
        creditedAmount: creditedAmountPayload,
        items: parsedItems,
      });
      if (result.success) {
        toast.success("Devolución registrada correctamente");
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
              {eligibleItems.map(item => {
                const maxReturn = returnableQuantity(item);
                const rawQty = (quantities[item.id] ?? "").trim();
                const numericQty = /^\d+$/.test(rawQty) ? Number(rawQty) : 0;
                const lineSubtotal = (Math.round(item.unitCost * 100) * numericQty) / 100;
                const overLimit = numericQty > maxReturn;
                return (
                  <div key={item.id} className="flex items-start justify-between gap-3 py-2.5 text-sm">
                    <label htmlFor={`return-qty-${item.id}`} className="min-w-0 flex-1 cursor-pointer">
                      <strong className="block font-medium">{item.productName}</strong>
                      {item.productSku && (
                        <span className="block font-mono text-[11px] text-admin-muted">{item.productSku}</span>
                      )}
                      <span className="mt-0.5 block text-xs text-admin-muted">
                        Costo compra: {formatCurrencyLocale(item.unitCost)} · Compradas {item.quantity} · Devueltas {item.returnedQuantity} · Stock {item.availableStock} · Máx. {maxReturn}
                      </span>
                    </label>
                    <div className="shrink-0 text-right">
                      <Input
                        id={`return-qty-${item.id}`}
                        type="number"
                        min={0}
                        max={maxReturn}
                        step={1}
                        placeholder="0"
                        value={quantities[item.id] ?? ""}
                        onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                        className={`w-24 text-right font-mono ${overLimit ? "border-rose-500 focus-visible:ring-rose-500/30" : ""}`}
                      />
                      {numericQty > 0 && (
                        <span className="mt-1 block font-mono text-[11px] font-semibold text-admin-brand-text">
                          {formatCurrencyLocale(lineSubtotal)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {excludedItemsCount > 0 && (
              <p className="text-xs text-admin-muted">
                {excludedItemsCount === 1
                  ? "1 producto de esta compra no tiene stock disponible para devolver."
                  : `${excludedItemsCount} productos de esta compra no tienen stock disponible para devolver.`}
              </p>
            )}

            <div className="rounded-xl border border-admin-card-border bg-admin-raised p-3.5 space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-admin-secondary">
                <span>Unidades a devolver:</span>
                <span className="font-mono font-bold text-admin-text">{selectedUnits} u.</span>
              </div>
              <div className="flex items-center justify-between text-admin-secondary">
                <span>Total a costo de compra:</span>
                <span className="font-mono font-bold text-admin-text">{formatCurrencyLocale(expectedTotal)}</span>
              </div>
              <div className="pt-2 border-t border-admin-card-border space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor="return-credited-amount" className="font-semibold text-admin-text">
                    Monto reconocido por el proveedor ({CURRENCY_SYMBOL})
                  </label>
                  {isCustomCreditedAmount && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomCreditedAmount(false);
                        setCreditedAmountInput("");
                        if (error) setError("");
                      }}
                      className="text-[11px] font-semibold text-admin-brand-text hover:underline cursor-pointer"
                    >
                      Restaurar total
                    </button>
                  )}
                </div>
                <Input
                  id="return-credited-amount"
                  type="number"
                  min={0}
                  max={expectedTotal}
                  step="0.01"
                  inputMode="decimal"
                  placeholder="0.00"
                  disabled={selectedUnits === 0}
                  value={displayedCreditedValue}
                  onChange={(e) => {
                    setIsCustomCreditedAmount(true);
                    setCreditedAmountInput(e.target.value);
                    if (error) setError("");
                  }}
                  className={`h-9 font-mono text-right ${exceedsExpected ? "border-rose-500 focus-visible:ring-rose-500/30" : ""}`}
                />
                {exceedsExpected && (
                  <p className="text-[11px] text-rose-600 dark:text-rose-400">
                    No puede superar el valor de los productos devueltos ({formatCurrencyLocale(expectedTotal)}).
                  </p>
                )}
                {adjustmentAmount > 0 && (
                  <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 pt-1">
                    <span>Diferencia o cargo del proveedor:</span>
                    <span className="font-mono font-bold">-{formatCurrencyLocale(adjustmentAmount)}</span>
                  </div>
                )}
              </div>
            </div>

            <label className="grid gap-1 text-sm">Motivo
              <Input name="reason" required maxLength={500} placeholder="Ej. Producto defectuoso, error de despacho..." />
            </label>
            <label className="grid gap-1 text-sm">Referencia de nota de crédito (opcional)
              <Input name="creditNoteReference" maxLength={60} placeholder="Ej. NC-00145" />
            </label>
          </fieldset>
          <p className="text-xs text-admin-muted">
            Las unidades saldrán del inventario por su costo registrado. Si el proveedor reconoce un monto menor, la diferencia queda guardada aparte para control.
          </p>
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
