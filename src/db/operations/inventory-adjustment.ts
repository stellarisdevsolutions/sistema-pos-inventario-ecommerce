import { sql } from "drizzle-orm";

export function inventoryAdjustmentQuery(input: {
  productId: number;
  quantity: number;
  reason: string;
  notes: string;
  userId: number;
  authorizedByUserId: number | null;
  prefix: string;
  requestId?: string | null;
}) {
  const { productId, quantity, reason, notes, userId, authorizedByUserId, prefix } = input;
  const requestId = input.requestId ?? null;
  const movementType =
    reason === "supplier_return" || reason === "internal_use" ? "adjustment_out" : "damaged_out";

  return sql`
    WITH stock_change AS (
      UPDATE products
      SET stock = stock - ${quantity}::integer, updated_at = now()
      WHERE id = ${productId} AND stock >= ${quantity}
        AND (${requestId}::uuid IS NULL OR NOT EXISTS (
          SELECT 1 FROM inventory_adjustments WHERE request_id = ${requestId}::uuid
        ))
      RETURNING id, name, variant, stock, cost_price
    ), numbered AS (
      SELECT *, nextval(pg_get_serial_sequence('inventory_adjustments', 'id'))::integer AS adjustment_id
      FROM stock_change
    ), adjustment AS (
      INSERT INTO inventory_adjustments
        (id, adjustment_number, request_id, reason, user_id, authorized_by_user_id, total_cost, notes)
      SELECT adjustment_id, ${prefix} || lpad(adjustment_id::text, greatest(3, length(adjustment_id::text)), '0'),
        ${requestId}::uuid, ${reason}::adjustment_reason, ${userId}, ${authorizedByUserId},
        cost_price * ${quantity}, ${notes}
      FROM numbered
      ON CONFLICT (request_id) DO NOTHING
      RETURNING id, adjustment_number
    ), item AS (
      INSERT INTO inventory_adjustment_items (adjustment_id, product_id, quantity, unit_cost, subtotal)
      SELECT adjustment.id, numbered.id, ${quantity}, cost_price, cost_price * ${quantity}
      FROM adjustment CROSS JOIN numbered
    ), movement AS (
      INSERT INTO inventory_movements
        (product_id, movement_type, quantity, previous_stock, new_stock, unit_cost,
         reference_type, reference_id, reason, user_id)
      SELECT numbered.id, ${movementType}::movement_type, -${quantity}::integer, stock + ${quantity}, stock, cost_price,
        'adjustment', adjustment.id, 'Baja #' || adjustment_number || ': ' || ${notes}, ${userId}
      FROM adjustment CROSS JOIN numbered
    )
    SELECT adjustment.id, adjustment_number AS "adjustmentNumber", stock AS "newStock",
      stock + ${quantity}::integer AS "previousStock",
      concat_ws(' — ', numbered.name, NULLIF(numbered.variant, '')) AS "productName"
    FROM adjustment CROSS JOIN numbered
  `;
}
