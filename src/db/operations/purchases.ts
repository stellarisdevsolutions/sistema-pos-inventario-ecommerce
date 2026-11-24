import { sql } from "drizzle-orm";
import type { PurchaseFormInput, PurchaseReturnInput } from "@/lib/validations/purchase";

export function createPurchaseQuery(input: PurchaseFormInput, userId: number, prefix: string) {
  const lines = JSON.stringify(input.items.map(({ productId, quantity, unitCost }) => ({
    product_id: productId,
    quantity,
    unit_cost: unitCost.toFixed(2),
  })));
  const requestId = input.requestId ?? null;

  return sql`
    WITH lines AS MATERIALIZED (
      SELECT * FROM jsonb_to_recordset(${lines}::jsonb)
        AS item(product_id integer, quantity integer, unit_cost numeric)
    ), locked_products AS MATERIALIZED (
      SELECT p.id, p.stock, p.cost_price
      FROM products p JOIN lines ON lines.product_id = p.id
      WHERE p.is_active AND p.stock >= 0
      ORDER BY p.id FOR UPDATE OF p
    ), numbered AS (
      SELECT nextval(pg_get_serial_sequence('purchases', 'id'))::integer AS id,
        (SELECT SUM(quantity * unit_cost) FROM lines) AS amount
      WHERE (SELECT count(*) FROM locked_products) = (SELECT count(*) FROM lines)
        AND EXISTS (SELECT 1 FROM suppliers WHERE id = ${input.supplierId} AND is_active)
        AND (${requestId}::uuid IS NULL OR NOT EXISTS (SELECT 1 FROM purchases WHERE request_id = ${requestId}::uuid))
    ), purchase AS (
      INSERT INTO purchases (id, purchase_number, invoice_number, supplier_id, user_id,
        subtotal, total_amount, status, payment_status, payment_method, notes, request_id)
      SELECT id, ${prefix} || lpad(id::text, greatest(4, length(id::text)), '0'), ${input.invoiceNumber || null},
        ${input.supplierId}, ${userId}, amount, amount, ${input.status}::purchase_status,
        ${input.paymentStatus}::purchase_payment_status, ${input.paymentMethod}::payment_method, ${input.notes || null},
        ${requestId}::uuid
      FROM numbered
      ON CONFLICT (request_id) DO NOTHING
      RETURNING id, purchase_number, status
    ), detail AS (
      INSERT INTO purchase_items (purchase_id, product_id, quantity, unit_cost, subtotal)
      SELECT purchase.id, product_id, quantity, unit_cost, quantity * unit_cost FROM purchase CROSS JOIN lines
    ), stock_change AS (
      UPDATE products p
      SET stock = p.stock + lines.quantity,
          cost_price = (p.stock * p.cost_price + lines.quantity * lines.unit_cost) / (p.stock + lines.quantity),
          updated_at = now()
      FROM purchase CROSS JOIN lines
      WHERE p.id = lines.product_id AND purchase.status = 'received'
      RETURNING p.id, p.stock, lines.quantity, lines.unit_cost
    ), movement AS (
      INSERT INTO inventory_movements (product_id, movement_type, quantity, previous_stock, new_stock,
        unit_cost, reference_type, reference_id, reason, user_id)
      SELECT stock_change.id, 'purchase_in', quantity, stock - quantity, stock, unit_cost,
        'purchase', purchase.id, 'Ingreso por compra ' || purchase_number, ${userId}
      FROM purchase CROSS JOIN stock_change
    )
    SELECT id, purchase_number AS "purchaseNumber" FROM purchase
  `;
}

export function cancelPurchaseQuery(purchaseId: number, userId: number, reason: string) {
  return sql`
    WITH target AS MATERIALIZED (
      SELECT id, status, purchase_number FROM purchases
      WHERE id = ${purchaseId} AND status <> 'cancelled'
      FOR UPDATE
    ), quantities AS (
      SELECT product_id, SUM(quantity)::integer AS quantity, SUM(subtotal) / SUM(quantity) AS unit_cost
      FROM purchase_items JOIN target ON target.id = purchase_id
      WHERE target.status = 'received'
      GROUP BY product_id
    ), locked_products AS MATERIALIZED (
      SELECT p.id, p.stock, quantities.quantity, quantities.unit_cost
      FROM products p JOIN quantities ON p.id = quantities.product_id
      ORDER BY p.id FOR UPDATE OF p
    ), cancelled AS (
      UPDATE purchases p SET
        status = 'cancelled',
        notes = NULLIF(concat_ws(' | ', NULLIF(p.notes, ''), 'Anulada: ' || ${reason}::text), '')
      FROM target WHERE p.id = target.id
        AND NOT EXISTS (SELECT 1 FROM locked_products WHERE stock < quantity)
        AND NOT EXISTS (SELECT 1 FROM purchase_returns WHERE purchase_id = target.id)
      RETURNING p.id, p.purchase_number
    ), stock_change AS (
      UPDATE products p SET
        stock = p.stock - l.quantity,
        cost_price = CASE
          WHEN p.stock - l.quantity = 0 THEN 0
          WHEN (p.stock * p.cost_price - l.quantity * l.unit_cost) >= 0
            THEN round((p.stock * p.cost_price - l.quantity * l.unit_cost) / (p.stock - l.quantity), 2)
          ELSE p.cost_price
        END,
        updated_at = now()
      FROM cancelled CROSS JOIN locked_products l WHERE p.id = l.id
      RETURNING p.id, p.stock, l.quantity, l.unit_cost
    ), movement AS (
      INSERT INTO inventory_movements (product_id, movement_type, quantity, previous_stock, new_stock,
        unit_cost, reference_type, reference_id, reason, user_id)
      SELECT stock_change.id, 'adjustment_out', -quantity, stock + quantity, stock, unit_cost,
        'purchase', cancelled.id, 'Anulación de compra ' || purchase_number || ': ' || ${reason}, ${userId}
      FROM cancelled CROSS JOIN stock_change
    )
    SELECT id FROM cancelled
  `;
}

// The next statement in the same read-committed batch sees returns committed while this lock waited.
export function lockPurchaseQuery(purchaseId: number) {
  return sql`SELECT id FROM purchases WHERE id = ${purchaseId} FOR UPDATE`;
}

export function returnPurchaseQuery(input: PurchaseReturnInput, userId: number) {
  const lines = JSON.stringify(input.items.map(({ purchaseItemId, quantity }) => ({
    purchase_item_id: purchaseItemId,
    quantity,
  })));

  return sql`
    WITH requested AS MATERIALIZED (
      SELECT * FROM jsonb_to_recordset(${lines}::jsonb)
        AS line(purchase_item_id integer, quantity integer)
    ), existing_return AS MATERIALIZED (
      SELECT id FROM purchase_returns
      WHERE request_id = ${input.requestId}::uuid AND purchase_id = ${input.purchaseId} AND user_id = ${userId}
    ), lines AS MATERIALIZED (
      SELECT item.id, item.product_id, requested.quantity, item.unit_cost
      FROM requested
      JOIN purchase_items item ON item.id = requested.purchase_item_id
      JOIN purchases purchase ON purchase.id = item.purchase_id
      WHERE purchase.id = ${input.purchaseId} AND purchase.status = 'received'
        AND requested.quantity > 0 AND requested.quantity <= item.quantity - COALESCE((
          SELECT SUM(quantity) FROM purchase_return_items WHERE purchase_item_id = item.id
        ), 0)
        AND NOT EXISTS (SELECT 1 FROM existing_return)
    ), quantities AS (
      SELECT product_id, SUM(quantity) AS quantity FROM lines GROUP BY product_id
    ), locked_products AS MATERIALIZED (
      SELECT p.id, p.stock, p.cost_price, quantities.quantity
      FROM products p JOIN quantities ON p.id = quantities.product_id
      ORDER BY p.id FOR UPDATE OF p
    ), returned AS (
      INSERT INTO purchase_returns (purchase_id, user_id, request_id, reason, credit_note_reference)
      SELECT ${input.purchaseId}, ${userId}, ${input.requestId}::uuid, ${input.reason}, ${input.creditNoteReference || null}
      WHERE EXISTS (SELECT 1 FROM requested)
        AND (SELECT count(*) FROM lines) = (SELECT count(*) FROM requested)
        AND NOT EXISTS (SELECT 1 FROM locked_products WHERE stock < quantity)
      ON CONFLICT (request_id) DO NOTHING
      RETURNING id
    ), detail AS (
      INSERT INTO purchase_return_items (return_id, purchase_item_id, quantity, original_unit_cost, inventory_unit_cost)
      SELECT returned.id, lines.id, lines.quantity, lines.unit_cost, locked_products.cost_price
      FROM returned CROSS JOIN lines JOIN locked_products ON locked_products.id = lines.product_id
    ), stock_change AS (
      UPDATE products SET stock = products.stock - locked_products.quantity::integer, updated_at = now()
      FROM returned CROSS JOIN locked_products WHERE products.id = locked_products.id
      RETURNING products.id, products.stock, locked_products.quantity::integer AS quantity, locked_products.cost_price
    ), movement AS (
      INSERT INTO inventory_movements (product_id, movement_type, quantity, previous_stock, new_stock,
        unit_cost, reference_type, reference_id, reason, user_id)
      SELECT stock_change.id, 'adjustment_out', -quantity, stock + quantity, stock, cost_price,
        'purchase_return', returned.id, ${input.reason}, ${userId}
      FROM returned CROSS JOIN stock_change
    )
    SELECT id FROM returned UNION ALL SELECT id FROM existing_return
  `;
}
