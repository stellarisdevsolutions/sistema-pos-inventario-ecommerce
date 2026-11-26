import { sql } from "drizzle-orm";
import { purchases } from "@/db/schema";

// Recepciones históricas sin Kárdex conservan la fecha disponible de la compra.
export const purchaseReceiptTime = sql`coalesce((
  select min(m.created_at) from inventory_movements m
  where m.reference_type = 'purchase' and m.reference_id = ${purchases.id}
    and m.movement_type = 'purchase_in'
), ${purchases.createdAt})`;

export const purchaseReceivedAt = sql<string>`to_char(${purchaseReceiptTime}, 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`.as("received_at");

// Las devoluciones con comprobante revierten el costo en su propia fecha.
// Las anteriores al registro de comprobantes solo tienen la cantidad acumulada.
export function saleDayQuantity(item: { quantity: number; returnedQuantity: number }, hasReceipts: boolean) {
  return hasReceipts ? item.quantity : Math.max(0, item.quantity - item.returnedQuantity);
}

export type RefundLine = {
  refundId: number; productId: number; name: string; variant: string | null; sku: string | null;
  categoryName: string; quantity: number; cost: string; amount: string;
};

// El comprobante y sus movimientos se insertan con el mismo now() de PostgreSQL.
// El costo es el de la venta. El prorrateo reproduce refundUnitAmounts en centavos.
export function periodRefundLinesQuery(start: Date, end: Date) {
  return sql`WITH receipts AS (
    SELECT id, sale_id, created_at FROM sale_refunds
    WHERE created_at >= ${start.toISOString()}::timestamp AND created_at < ${end.toISOString()}::timestamp
  ), sold AS (
    SELECT i.*, s.total_amount,
      sum(i.quantity * i.unit_price) OVER (PARTITION BY i.sale_id) AS gross,
      coalesce(sum(i.quantity * i.unit_price) OVER (
        PARTITION BY i.sale_id ORDER BY i.id ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
      ), 0) AS line_offset
    FROM sale_items i JOIN sales s ON s.id = i.sale_id
    WHERE i.sale_id IN (SELECT sale_id FROM receipts)
  ), movements AS (
    SELECT m.*, coalesce(sum(m.quantity) OVER (
      PARTITION BY m.reference_id, m.product_id ORDER BY m.id ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
    ), 0) AS previous_qty
    FROM inventory_movements m WHERE m.reference_type = 'sale' AND m.movement_type = 'return_in'
      AND m.reference_id IN (SELECT sale_id FROM receipts)
  )
  SELECT r.id AS "refundId", p.id AS "productId", p.name, p.variant, p.sku,
    coalesce(c.name, 'General') AS "categoryName", m.quantity, m.quantity * m.unit_cost AS cost,
    coalesce(round((i.line_offset + (m.previous_qty + m.quantity) * i.unit_price) * i.total_amount / nullif(i.gross, 0), 2)
      - round((i.line_offset + m.previous_qty * i.unit_price) * i.total_amount / nullif(i.gross, 0), 2), 0) AS amount
  FROM receipts r JOIN movements m ON m.reference_id = r.sale_id AND m.created_at = r.created_at
  JOIN sold i ON i.sale_id = r.sale_id AND i.product_id = m.product_id
  JOIN products p ON p.id = m.product_id LEFT JOIN categories c ON c.id = p.category_id`;
}

export function groupRefundLines(lines: RefundLine[]) {
  const groups = new Map<number, RefundLine[]>();
  for (const line of lines) {
    const group = groups.get(line.refundId);
    if (group) group.push(line);
    else groups.set(line.refundId, [line]);
  }
  return groups;
}
