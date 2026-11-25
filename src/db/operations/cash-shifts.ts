import { sql } from "drizzle-orm";

export function openShiftQuery(input: {
  cashRegisterId: number;
  userId: number;
  initialCash: number;
  notes: string | null;
  prefix: string;
}) {
  const cash = input.initialCash.toFixed(2);
  return sql`
    WITH eligible AS MATERIALIZED (
      SELECT r.id AS register_id, u.id AS user_id
      FROM cash_registers r
      JOIN users u ON u.id = ${input.userId}
      WHERE r.id = ${input.cashRegisterId}
        AND r.is_active = true
        AND u.is_active = true
        AND u.role <> 'warehouse'
        AND NOT EXISTS (
          SELECT 1 FROM cash_shifts s WHERE s.cash_register_id = ${input.cashRegisterId} AND s.status = 'open'
        )
        AND NOT EXISTS (
          SELECT 1 FROM cash_shifts s WHERE s.user_id = ${input.userId} AND s.status = 'open'
        )
    ), numbered AS (
      SELECT nextval(pg_get_serial_sequence('cash_shifts', 'id'))::integer AS id
      FROM eligible
    )
    INSERT INTO cash_shifts (
      id, shift_number, cash_register_id, user_id,
      initial_cash, cash_sales, card_sales, transfer_sales, other_sales,
      expected_cash, status, notes
    )
    SELECT
      id,
      ${input.prefix} || lpad(id::text, greatest(3, length(id::text)), '0'),
      ${input.cashRegisterId},
      ${input.userId},
      ${cash}::numeric,
      0, 0, 0, 0,
      ${cash}::numeric,
      'open',
      ${input.notes}
    FROM numbered
    RETURNING
      id,
      shift_number AS "shiftNumber",
      cash_register_id AS "cashRegisterId",
      user_id AS "userId",
      initial_cash AS "initialCash",
      cash_sales AS "cashSales",
      card_sales AS "cardSales",
      transfer_sales AS "transferSales",
      other_sales AS "otherSales",
      expected_cash AS "expectedCash",
      status,
      opened_at AS "openedAt",
      notes
  `;
}

export function submitCashCountQuery(shiftId: number, operatorId: number, cash: string) {
  return sql`
    UPDATE cash_shifts
    SET actual_cash = ${cash}::numeric
    WHERE id = ${shiftId} AND user_id = ${operatorId} AND status = 'open' AND actual_cash IS NULL
    RETURNING id
  `;
}

export function approveCashCountQuery(shiftId: number, supervisorId: number, notes: string | null) {
  return sql`
    UPDATE cash_shifts
    SET difference = actual_cash - expected_cash, closed_by_user_id = ${supervisorId},
        closed_at = now(), status = 'closed',
        notes = NULLIF(concat_ws(' | ', NULLIF(notes, ''), ${notes}::text), '')
    WHERE id = ${shiftId} AND status = 'open' AND actual_cash IS NOT NULL
      AND (actual_cash = expected_cash OR ${notes}::text IS NOT NULL)
    RETURNING id
  `;
}

export function archiveCashRegisterQuery(registerId: number, archive: boolean) {
  if (archive) {
    return sql`
      UPDATE cash_registers
      SET is_active = false
      WHERE id = ${registerId}
        AND NOT EXISTS (
          SELECT 1 FROM cash_shifts s
          WHERE s.cash_register_id = ${registerId} AND s.status = 'open'
        )
      RETURNING id, name, code, location, is_active AS "isActive"
    `;
  }
  return sql`
    UPDATE cash_registers
    SET is_active = true
    WHERE id = ${registerId}
    RETURNING id, name, code, location, is_active AS "isActive"
  `;
}

export function deleteUnusedCashRegisterQuery(registerId: number) {
  return sql`
    DELETE FROM cash_registers
    WHERE id = ${registerId}
      AND NOT EXISTS (
        SELECT 1 FROM cash_shifts s
        WHERE s.cash_register_id = ${registerId}
      )
    RETURNING id, name, code
  `;
}
