import { sql } from "drizzle-orm";
import { purchaseReceiptTime } from "./reporting";

export type SupplierReceipts = {
  supplierId: number;
  supplier: string;
  receipts: number;
  units: number;
  amount: string;
};

export function supplierReceiptsQuery(start: Date, end: Date) {
  return sql`WITH received AS (
    SELECT id, supplier_id, total_amount FROM purchases
    WHERE status = 'received' AND ${purchaseReceiptTime} >= ${start.toISOString()}::timestamp
      AND ${purchaseReceiptTime} < ${end.toISOString()}::timestamp
  )
  SELECT s.id AS "supplierId", s.name AS supplier, count(*)::int AS receipts,
    coalesce(sum((SELECT sum(i.quantity) FROM purchase_items i WHERE i.purchase_id = r.id)), 0)::float8 AS units,
    sum(r.total_amount) AS amount
  FROM received r JOIN suppliers s ON s.id = r.supplier_id
  GROUP BY s.id, s.name ORDER BY sum(r.total_amount) DESC, s.name, s.id`;
}
