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
      WHERE id = ${shiftId} AND user_id = ${operatorId} AND status = 'open' AND actual_cash IS NULL
      FOR UPDATE
    ), locked_products AS MATERIALIZED (
      SELECT p.id, p.name, p.sku, p.stock, p.cost_price
      FROM products p JOIN lines ON lines.product_id = p.id
      WHERE p.is_active AND p.stock >= lines.quantity AND p.price = lines.unit_price
        AND (${shiftId}::integer IS NULL OR EXISTS (SELECT 1 FROM locked_shift))
      ORDER BY p.id FOR UPDATE OF p
    ), numbered AS (
      SELECT nextval(pg_get_serial_sequence('sales', 'id'))::integer AS id
      WHERE (SELECT count(*) FROM locked_products) = (SELECT count(*) FROM lines)
    ), sale AS (
      INSERT INTO sales (id, sale_number, customer_id, customer_name, cash_shift_id, user_id, subtotal,
        discount_amount, total_amount, cash_given, change_given, payment_method, status, channel, notes)
      SELECT id, ${prefix} || lpad(id::text, greatest(4, length(id::text)), '0'), ${sale.customerId ?? null},
        ${sale.customerName}, ${shiftId}, ${operatorId}, ${subtotal.toFixed(2)}, ${discount.toFixed(2)},
        ${total.toFixed(2)}, ${cashGiven?.toFixed(2) ?? null}, ${changeGiven?.toFixed(2) ?? null},
        ${sale.paymentMethod}::payment_method, 'completed', ${sale.channel}::sale_channel, ${notes}
      FROM numbered
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
        transfer_sales = shift.transfer_sales + CASE WHEN sale.payment_method = 'transfer' THEN sale.total_amount ELSE 0 END
      FROM sale WHERE shift.id = sale.cash_shift_id
    )
    SELECT sale.id AS "saleId", sale_number AS "saleNumber", customer_name AS "customerName",
      detail.id AS "itemId", detail.product_id AS "productId", p.name AS "productName", p.sku AS "productSku",
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
      WHERE shift.status = 'open' AND shift.actual_cash IS NULL
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
    ), stock_change AS (
      UPDATE products p SET stock = p.stock + q.quantity, updated_at = now()
      FROM quantities q WHERE p.id = q.product_id
      RETURNING p.id, p.stock, q.quantity, q.unit_cost
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
        transfer_sales = shift.transfer_sales - CASE WHEN payment_method = 'transfer' THEN total_amount ELSE 0 END
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
  items: { id: number; returnedQuantity: number; quantity: number }[];
}) {
  const { saleId, operatorId, supervisorId, cashShiftId, amount, note } = input;
  const money = amount.toFixed(2);
  const lines = JSON.stringify(input.items.map((item) => ({
    id: item.id, returned_quantity: item.returnedQuantity, quantity: item.quantity,
  })));

  return sql`
    WITH target AS MATERIALIZED (
      SELECT id FROM sales
      WHERE id = ${saleId} AND status IN ('completed', 'refunded')
        AND refunded_amount + ${money}::numeric <= total_amount
      FOR UPDATE
    ), locked_shift AS MATERIALIZED (
      SELECT id FROM cash_shifts
      WHERE id = ${cashShiftId} AND user_id = ${operatorId} AND status = 'open' AND actual_cash IS NULL
        AND expected_cash >= ${money}::numeric AND EXISTS (SELECT 1 FROM target)
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
    ), detail AS (
      UPDATE sale_items item SET returned_quantity = item.returned_quantity + matched.quantity
      FROM matched CROSS JOIN refund WHERE item.id = matched.id
    ), quantities AS (
      SELECT product_id, sum(quantity)::integer AS quantity,
        sum(quantity * unit_cost) / sum(quantity) AS unit_cost
      FROM matched GROUP BY product_id
    ), stock_change AS (
      UPDATE products p SET stock = p.stock + q.quantity, updated_at = now()
      FROM quantities q CROSS JOIN refund WHERE p.id = q.product_id
      RETURNING p.id, p.stock, q.quantity, q.unit_cost
    ), movement AS (
      INSERT INTO inventory_movements (product_id, movement_type, quantity, previous_stock, new_stock,
        unit_cost, reference_type, reference_id, reason, user_id)
      SELECT stock_change.id, 'return_in', quantity, stock - quantity, stock, unit_cost,
        'sale', refund.id, ${note}, ${supervisorId}
      FROM refund CROSS JOIN stock_change
    ), balance AS (
      UPDATE cash_shifts SET
        cash_sales = cash_sales - ${money}::numeric, expected_cash = expected_cash - ${money}::numeric
      FROM refund WHERE cash_shifts.id = ${cashShiftId}
    )
    SELECT id FROM refund
  `;
}
