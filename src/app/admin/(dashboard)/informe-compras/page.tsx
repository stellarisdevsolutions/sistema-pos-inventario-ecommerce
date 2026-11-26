import { Suspense } from "react";
import { and, gte, lt } from "drizzle-orm";
import { db } from "@/db";
import { purchaseReturns } from "@/db/schema";
import { supplierReceiptsQuery, type SupplierReceipts } from "@/db/operations/purchase-report";
import { requireRole } from "@/lib/auth/session";
import { addBusinessDays, businessDate, businessDayStart, formatBusinessDate } from "@/lib/business-date";
import { productName } from "@/lib/product-name";
import { formatCurrencyLocale } from "@/lib/currency";
import { summarizePurchaseReturnAmounts } from "@/lib/purchase-return-math";

type Params = Promise<{ desde?: string; hasta?: string }>;

async function Report({ searchParams }: { searchParams: Params }) {
  await requireRole(["admin", "manager"]);
  const filters = await searchParams;
  const today = businessDate();
  const from = filters.desde ?? today.slice(0, 8) + "01";
  const to = filters.hasta ?? today;
  let range;
  try {
    const start = businessDayStart(from);
    const end = addBusinessDays(businessDayStart(to), 1);
    if (start < end && end <= addBusinessDays(start, 366)) range = { start, end };
  } catch { /* El formulario muestra la indicación para corregir el período. */ }

  return <>
    <form className="flex flex-wrap items-end gap-3" action="/admin/informe-compras">
      <label className="grid gap-1 text-sm">Desde<input className="rounded-lg border border-admin-card-border bg-admin-card-bg p-2" type="date" name="desde" defaultValue={from} required /></label>
      <label className="grid gap-1 text-sm">Hasta<input className="rounded-lg border border-admin-card-border bg-admin-card-bg p-2" type="date" name="hasta" defaultValue={to} required /></label>
      <button className="rounded-lg bg-admin-brand px-4 py-2 text-admin-on-solid">Consultar</button>
    </form>
    {range ? <Results {...range} /> : <p role="alert">Elige fechas válidas en orden, con un máximo de 366 días.</p>}
  </>;
}

async function Results({ start, end }: { start: Date; end: Date }) {
  const [receipts, returns] = await Promise.all([
    db.execute<SupplierReceipts>(supplierReceiptsQuery(start, end)),
    db.query.purchaseReturns.findMany({
      where: and(gte(purchaseReturns.createdAt, start), lt(purchaseReturns.createdAt, end)),
      with: {
        purchase: { columns: { purchaseNumber: true }, with: { supplier: { columns: { name: true } } } },
        items: { with: { purchaseItem: { with: { product: { columns: { name: true, variant: true } } } } } },
      },
      orderBy: (r, { desc }) => [desc(r.createdAt), desc(r.id)],
    }),
  ]);
  const rows = returns.map(r => ({ ...r, ...summarizePurchaseReturnAmounts(r.items, r.creditedAmount) }));
  const totals = [
    ["Compras recibidas", receipts.rows.reduce((sum, r) => sum + Number(r.amount), 0)],
    ["Mercadería devuelta", rows.reduce((sum, r) => sum + r.expectedAmount, 0)],
    ["Crédito reconocido", rows.reduce((sum, r) => sum + r.creditedAmount, 0)],
    ["Penalidades", rows.reduce((sum, r) => sum + r.penaltyAmount, 0)],
  ] as const;

  return <>
    <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {totals.map(([label, value]) => <div key={label} className="admin-panel p-4"><dt className="text-sm text-admin-muted">{label}</dt><dd className="mt-2 text-xl font-semibold tabular-nums">{formatCurrencyLocale(value)}</dd></div>)}
    </dl>
    <section className="admin-panel p-4 space-y-4">
      <h2 className="font-semibold">Compras por proveedor</h2>
      {receipts.rows.length ? <div className="overflow-x-auto"><table className="w-full text-sm">
        <thead className="text-admin-muted"><tr><th className="text-left">Proveedor</th><th>Compras recibidas</th><th>Unidades</th><th className="text-right">Importe recibido</th></tr></thead>
        <tbody>{receipts.rows.map(r => <tr key={r.supplierId} className="border-t border-admin-card-border"><td className="py-3">{r.supplier}</td><td className="text-center">{r.receipts}</td><td className="text-center">{r.units}</td><td className="text-right">{formatCurrencyLocale(r.amount)}</td></tr>)}</tbody>
      </table></div> : <p className="text-admin-muted">Sin compras recibidas en este período.</p>}
    </section>
    <section className="admin-panel p-4 space-y-4">
      <h2 className="font-semibold">Devoluciones a proveedores</h2>
      {rows.length ? <div className="overflow-x-auto"><table className="w-full text-sm">
        <thead className="text-admin-muted"><tr>{["Fecha", "Proveedor y compra", "Artículos devueltos", "Nota de crédito", "Mercadería", "Reconocido", "Penalidad"].map((label,i) => <th key={label} className={i < 4 ? "text-left p-2" : "text-right p-2"}>{label}</th>)}</tr></thead>
        <tbody>{rows.map(r => <tr key={r.id} className="border-t border-admin-card-border align-top">
          <td className="p-2 whitespace-nowrap">{formatBusinessDate(r.createdAt)}</td><td className="p-2">{r.purchase.supplier.name}<small className="block text-admin-muted">{r.purchase.purchaseNumber}</small></td>
          <td className="p-2">{r.items.map(i => <div key={i.id}>{i.quantity} × {productName(i.purchaseItem.product)}</div>)}</td>
          <td className="p-2">{r.creditNoteReference || "Sin referencia"}</td>
          {[r.expectedAmount,r.creditedAmount,r.penaltyAmount].map((value,i) => <td key={i} className="p-2 text-right whitespace-nowrap">{formatCurrencyLocale(value)}</td>)}
        </tr>)}</tbody>
      </table></div> : <p className="text-admin-muted">Sin devoluciones registradas en este período.</p>}
    </section>
  </>;
}


export default function PurchaseReportPage({ searchParams }: { searchParams: Params }) {
  return <div className="space-y-6 text-admin-text">
    <header className="admin-page-header"><h1 className="admin-page-title">Compras y devoluciones</h1>
      <p className="admin-page-description">Compras por fecha de recepción y devoluciones por fecha de registro.</p></header>
    <Suspense fallback={<p>Cargando reporte…</p>}><Report searchParams={searchParams} /></Suspense>
  </div>;
}
