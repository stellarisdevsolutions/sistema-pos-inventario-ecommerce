import { sql } from "drizzle-orm";
import type { SaleFormInput } from "@/lib/validations/sale";

export function createSaleQuery(input: {
  sale: SaleFormInput;
  operatorId: number;
  shiftId: number | null;
  prefix: string;
  subtotal: number;
  discount: number;
  total: number;
  cashGiven: number | null;
  changeGiven: number | null;
  notes: string | null;
  checkoutFingerprint?: string;
}) {
  const { sale, operatorId, shiftId, prefix, subtotal, discount, total, cashGiven, changeGiven, notes } = input;
  const lines = JSON.stringify(sale.items.map(({ productId, quantity, unitPrice }) => ({
    product_id: productId,
    quantity,
    unit_price: unitPrice.toFixed(2),
  })));
  const movementReason = sale.isAdministrativeSale ? "Venta Administrativa Directa #" : "Venta POS en mostrador #";

  return sql`
    WITH lines AS MATERIALIZED (
      SELECT * FROM jsonb_to_recordset(${lines}::jsonb)
        AS item(product_id integer, quantity integer, unit_price numeric)
    ), locked_shift AS MATERIALIZED (
      SELECT id FROM cash_shifts
      WHERE id = ${shiftId} AND user_id = ${operatorId} AND status = 'open' AND actual_cash IS NULL AND recount_requested_at IS NULL
      FOR UPDATE
    ), locked_products AS MATERIALIZED (
      SELECT p.id, p.name, p.variant, p.sku, p.stock, p.cost_price
      FROM products p JOIN lines ON lines.product_id = p.id
      WHERE p.is_active AND NOT p.is_archived AND p.stock >= lines.quantity AND p.price = lines.unit_price
        AND (${shiftId}::integer IS NULL OR EXISTS (SELECT 1 FROM locked_shift))
      ORDER BY p.id FOR UPDATE OF p
    ), numbered AS (
      SELECT nextval(pg_get_serial_sequence('sales', 'id'))::integer AS id
      WHERE (SELECT count(*) FROM locked_products) = (SELECT count(*) FROM lines)
    ), customer_params AS (
      SELECT
        ${sale.customerId ?? null}::integer AS explicit_id,
        nullif(btrim(${sale.customerTaxId ?? null}::text), '') AS tax_id
    ), existing_customer AS (
      SELECT c.id
      FROM customers c
      CROSS JOIN customer_params cp
      WHERE cp.explicit_id IS NULL
        AND cp.tax_id IS NOT NULL
        AND btrim(c.tax_id) = cp.tax_id
        AND EXISTS (SELECT 1 FROM numbered)
      ORDER BY c.id DESC
      LIMIT 1
    ), created_customer AS (
      INSERT INTO customers (name, tax_id)
      SELECT ${sale.customerName}, cp.tax_id
      FROM customer_params cp
      WHERE cp.explicit_id IS NULL
        AND cp.tax_id IS NOT NULL
        AND EXISTS (SELECT 1 FROM numbered)
        AND NOT EXISTS (SELECT 1 FROM existing_customer)
        AND (
          ${sale.checkoutRequestId ?? null}::uuid IS NULL
          OR NOT EXISTS (
            SELECT 1 FROM sales
            WHERE user_id = ${operatorId}
              AND checkout_request_id = ${sale.checkoutRequestId ?? null}::uuid
          )
        )
      RETURNING id
    ), resolved_customer AS (
      SELECT COALESCE(
        (SELECT explicit_id FROM customer_params),
        (SELECT id FROM existing_customer),
        (SELECT id FROM created_customer)
      ) AS id
    ), sale AS (
      INSERT INTO sales (id, sale_number, customer_id, customer_name, cash_shift_id, user_id, subtotal,
        discount_amount, total_amount, cash_given, change_given, payment_method, status, channel, notes, checkout_request_id, checkout_fingerprint)
      SELECT id, ${prefix} || lpad(id::text, greatest(4, length(id::text)), '0'), (SELECT id FROM resolved_customer),
        ${sale.customerName}, ${shiftId}, ${operatorId}, ${subtotal.toFixed(2)}, ${discount.toFixed(2)},
        ${total.toFixed(2)}, ${cashGiven?.toFixed(2) ?? null}, ${changeGiven?.toFixed(2) ?? null},
        ${sale.paymentMethod}::payment_method, 'completed', ${sale.channel}::sale_channel, ${notes},
        ${sale.checkoutRequestId ?? null}::uuid, ${input.checkoutFingerprint ?? null}
      FROM numbered
      ON CONFLICT (user_id, checkout_request_id) DO NOTHING
      RETURNING id, sale_number, customer_name, total_amount, payment_method, cash_shift_id
    ), detail AS (
      INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, unit_cost, subtotal)
      SELECT sale.id, p.id, quantity, unit_price, cost_price, quantity * unit_price
      FROM sale CROSS JOIN locked_products p JOIN lines ON lines.product_id = p.id
      RETURNING id, product_id, quantity, unit_price, subtotal
    ), stock_change AS (
      UPDATE products p SET stock = p.stock - lines.quantity, updated_at = now()
      FROM sale CROSS JOIN lines WHERE p.id = lines.product_id
      RETURNING p.id, p.stock, p.cost_price, lines.quantity
    ), movement AS (
      INSERT INTO inventory_movements (product_id, movement_type, quantity, previous_stock, new_stock,
        unit_cost, reference_type, reference_id, reason, user_id)
      SELECT stock_change.id, 'sale_out', quantity, stock + quantity, stock, cost_price,
        'sale', sale.id, ${movementReason} || sale_number, ${operatorId}
      FROM sale CROSS JOIN stock_change
    ), balance AS (
      UPDATE cash_shifts shift SET
        cash_sales = shift.cash_sales + CASE WHEN sale.payment_method = 'cash' THEN sale.total_amount ELSE 0 END,
        expected_cash = shift.expected_cash + CASE WHEN sale.payment_method = 'cash' THEN sale.total_amount ELSE 0 END,
        card_sales = shift.card_sales + CASE WHEN sale.payment_method = 'card' THEN sale.total_amount ELSE 0 END,
        transfer_sales = shift.transfer_sales + CASE WHEN sale.payment_method = 'transfer' THEN sale.total_amount ELSE 0 END,
        other_sales = shift.other_sales + CASE WHEN sale.payment_method = 'other' THEN sale.total_amount ELSE 0 END
      FROM sale WHERE shift.id = sale.cash_shift_id
    )
    SELECT sale.id AS "saleId", sale_number AS "saleNumber", customer_name AS "customerName",
      detail.id AS "itemId", detail.product_id AS "productId",
      concat_ws(' — ', p.name, NULLIF(p.variant, '')) AS "productName", p.sku AS "productSku",
      quantity, unit_price AS "unitPrice", subtotal
    FROM sale CROSS JOIN detail JOIN locked_products p ON p.id = detail.product_id
    ORDER BY detail.id
  `;
}

export function cancelSaleQuery(saleId: number, operatorId: number, reason: string) {
  return sql`
    WITH target AS MATERIALIZED (
      SELECT * FROM sales WHERE id = ${saleId} AND status = 'completed' AND refunded_amount = 0 FOR UPDATE
    ), locked_shift AS MATERIALIZED (
      SELECT shift.id, shift.expected_cash FROM cash_shifts shift JOIN target ON shift.id = target.cash_shift_id
      WHERE shift.status = 'open' AND shift.actual_cash IS NULL AND shift.recount_requested_at IS NULL
      FOR UPDATE OF shift
    ), cancelled AS (
      UPDATE sales SET status = 'cancelled', notes = concat_ws(' | ', target.notes, ${reason}::text)
      FROM target
      WHERE sales.id = target.id
        AND (target.cash_shift_id IS NULL OR EXISTS (
          SELECT 1 FROM locked_shift
          WHERE target.payment_method <> 'cash' OR expected_cash >= target.total_amount
        ))
        AND NOT EXISTS (SELECT 1 FROM sale_items WHERE sale_id = target.id AND returned_quantity > 0)
      RETURNING sales.id, sales.sale_number, sales.payment_method, sales.total_amount, sales.cash_shift_id
    ), quantities AS (
      SELECT product_id, sum(quantity)::integer AS quantity,
        sum(quantity * unit_cost) / sum(quantity) AS unit_cost
      FROM sale_items JOIN cancelled ON sale_id = cancelled.id
      GROUP BY product_id
    ), locked_products AS MATERIALIZED (
      SELECT p.id, q.quantity, q.unit_cost
      FROM products p JOIN quantities q ON p.id = q.product_id
      ORDER BY p.id FOR UPDATE OF p
    ), stock_change AS (
      UPDATE products p SET stock = p.stock + l.quantity, updated_at = now()
      FROM cancelled CROSS JOIN locked_products l WHERE p.id = l.id
      RETURNING p.id, p.stock, l.quantity, l.unit_cost
    ), movement AS (
      INSERT INTO inventory_movements (product_id, movement_type, quantity, previous_stock, new_stock,
        unit_cost, reference_type, reference_id, reason, user_id)
      SELECT stock_change.id, 'return_in', quantity, stock - quantity, stock, unit_cost, 'sale',
        cancelled.id, 'Anulación de venta #' || sale_number, ${operatorId}
      FROM cancelled CROSS JOIN stock_change
    ), balance AS (
      UPDATE cash_shifts shift SET
        cash_sales = shift.cash_sales - CASE WHEN payment_method = 'cash' THEN total_amount ELSE 0 END,
        expected_cash = shift.expected_cash - CASE WHEN payment_method = 'cash' THEN total_amount ELSE 0 END,
        card_sales = shift.card_sales - CASE WHEN payment_method = 'card' THEN total_amount ELSE 0 END,
        transfer_sales = shift.transfer_sales - CASE WHEN payment_method = 'transfer' THEN total_amount ELSE 0 END,
        other_sales = shift.other_sales - CASE WHEN payment_method = 'other' THEN total_amount ELSE 0 END
      FROM cancelled WHERE shift.id = cancelled.cash_shift_id
    )
    SELECT id FROM cancelled
  `;
}

export function refundSaleQuery(input: {
  saleId: number;
  operatorId: number;
  supervisorId: number;
  cashShiftId: number | null;
  amount: number;
  note: string;
  refundMethod?: "cash" | "card" | "transfer" | "other";
  requestId?: string | null;
  reason?: string;
  items: { id: number; returnedQuantity: number; quantity: number }[];
}) {
  const { saleId, operatorId, supervisorId, cashShiftId, amount, note } = input;
  const refundMethod = input.refundMethod ?? "cash";
  const requestId = input.requestId ?? null;
  const reasonText = input.reason ?? note;
  const money = amount.toFixed(2);
  const lines = JSON.stringify(input.items.map((item) => ({
    id: item.id, returned_quantity: item.returnedQuantity, quantity: item.quantity,
  })));

  return sql`
    WITH existing_refund AS MATERIALIZED (
      SELECT id FROM sale_refunds
      WHERE ${requestId}::uuid IS NOT NULL
        AND request_id = ${requestId}::uuid
        AND sale_id = ${saleId}
    ), target AS MATERIALIZED (
      SELECT id FROM sales
      WHERE id = ${saleId} AND status IN ('completed', 'refunded')
        AND refunded_amount + ${money}::numeric <= total_amount
        AND NOT EXISTS (SELECT 1 FROM existing_refund)
      FOR UPDATE
    ), locked_shift AS MATERIALIZED (
      SELECT id FROM cash_shifts
      WHERE id = ${cashShiftId}
        AND status = 'open'
        AND actual_cash IS NULL
        AND recount_requested_at IS NULL
        AND (${refundMethod}::text <> 'cash' OR (user_id = ${operatorId} AND expected_cash >= ${money}::numeric))
        AND EXISTS (SELECT 1 FROM target)
      FOR UPDATE
    ), lines AS MATERIALIZED (
      SELECT * FROM jsonb_to_recordset(${lines}::jsonb)
        AS item(id integer, returned_quantity integer, quantity integer)
    ), matched AS MATERIALIZED (
      SELECT item.id, item.product_id, item.unit_cost, lines.quantity
      FROM sale_items item JOIN lines ON lines.id = item.id JOIN target ON target.id = item.sale_id
      WHERE item.returned_quantity = lines.returned_quantity
        AND item.returned_quantity + lines.quantity <= item.quantity
      FOR UPDATE OF item
    ), refund AS (
      UPDATE sales SET status = 'refunded',
        refunded_amount = refunded_amount + ${money}::numeric,
        net_amount = total_amount - refunded_amount - ${money}::numeric,
        notes = concat_ws(' | ', sales.notes, ${note}::text)
      FROM target WHERE sales.id = target.id
        AND (${cashShiftId}::integer IS NULL OR EXISTS (SELECT 1 FROM locked_shift))
        AND (SELECT count(*) FROM lines) = (SELECT count(*) FROM matched)
      RETURNING sales.id
    ), refund_record AS (
      INSERT INTO sale_refunds (sale_id, cash_shift_id, user_id, authorized_by_user_id, request_id, refund_method, amount, reason)
      SELECT refund.id, ${cashShiftId}, ${operatorId}, ${supervisorId}, ${requestId}::uuid, ${refundMethod}::payment_method, ${money}::numeric, ${reasonText}
      FROM refund
      ON CONFLICT (request_id) DO NOTHING
      RETURNING id
    ), detail AS (
      UPDATE sale_items item SET returned_quantity = item.returned_quantity + matched.quantity
      FROM matched CROSS JOIN refund WHERE item.id = matched.id
    ), quantities AS (
      SELECT product_id, sum(quantity)::integer AS quantity,
        sum(quantity * unit_cost) / sum(quantity) AS unit_cost
      FROM matched GROUP BY product_id
    ), locked_products AS MATERIALIZED (
      SELECT p.id, q.quantity, q.unit_cost
      FROM products p JOIN quantities q ON p.id = q.product_id
      ORDER BY p.id FOR UPDATE OF p
    ), stock_change AS (
      UPDATE products p SET stock = p.stock + l.quantity, updated_at = now()
      FROM locked_products l CROSS JOIN refund WHERE p.id = l.id
      RETURNING p.id, p.stock, l.quantity, l.unit_cost
    ), movement AS (
      INSERT INTO inventory_movements (product_id, movement_type, quantity, previous_stock, new_stock,
        unit_cost, reference_type, reference_id, reason, user_id)
      SELECT stock_change.id, 'return_in', quantity, stock - quantity, stock, unit_cost,
        'sale', refund.id, ${note}, ${supervisorId}
      FROM refund CROSS JOIN stock_change
    ), balance AS (
      UPDATE cash_shifts SET
        cash_sales = cash_sales - CASE WHEN ${refundMethod}::text = 'cash' THEN ${money}::numeric ELSE 0 END,
        expected_cash = expected_cash - CASE WHEN ${refundMethod}::text = 'cash' THEN ${money}::numeric ELSE 0 END,
        card_sales = card_sales - CASE WHEN ${refundMethod}::text = 'card' THEN ${money}::numeric ELSE 0 END,
        transfer_sales = transfer_sales - CASE WHEN ${refundMethod}::text = 'transfer' THEN ${money}::numeric ELSE 0 END,
        other_sales = other_sales - CASE WHEN ${refundMethod}::text = 'other' THEN ${money}::numeric ELSE 0 END
      FROM refund WHERE cash_shifts.id = ${cashShiftId}
    )
    SELECT refund.id, refund_record.id AS "refundId"
    FROM refund LEFT JOIN refund_record ON true
  `;
}
