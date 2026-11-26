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
    SET actual_cash = ${cash}::numeric,
        recount_requested_at = NULL,
        recount_reason = NULL
    WHERE id = ${shiftId} AND user_id = ${operatorId} AND status = 'open' AND actual_cash IS NULL
    RETURNING id
  `;
}

export function requestCashRecountQuery(
  shiftId: number,
  supervisorId: number,
  reason: string,
  supervisorName: string
) {
  const auditPrefix = `[Reconteo solicitado por ${supervisorName.trim() || "Supervisor"}`;
  return sql`
    UPDATE cash_shifts
    SET actual_cash = NULL,
        recount_requested_at = now(),
        recount_reason = ${reason},
        notes = NULLIF(
          concat_ws(
            ' | ',
            NULLIF(notes, ''),
            ${auditPrefix} || ' (conteo previo ' || to_char(actual_cash, 'FM9999999990.00') || '): ' || ${reason} || ']'
          ),
          ''
        )
    WHERE id = ${shiftId}
      AND status = 'open'
      AND actual_cash IS NOT NULL
      AND ${supervisorId}::integer > 0
    RETURNING id
  `;
}

export function approveCashCountQuery(
  shiftId: number,
  supervisorId: number,
  notes: string | null,
  options?: {
    adjustedActualCash?: string | null;
    actualTransfer?: string | null;
    actualCard?: string | null;
    supervisorName?: string;
  }
) {
  const adjustedCash = options?.adjustedActualCash ?? null;
  const actualTransfer = options?.actualTransfer ?? null;
  const actualCard = options?.actualCard ?? null;
  const editPrefix = `[Conteo editado por ${options?.supervisorName?.trim() || "Supervisor"}`;

  return sql`
    UPDATE cash_shifts
    SET actual_cash = COALESCE(${adjustedCash}::numeric, actual_cash),
        difference = COALESCE(${adjustedCash}::numeric, actual_cash) - expected_cash,
        actual_transfer = COALESCE(${actualTransfer}::numeric, transfer_sales),
        transfer_difference = COALESCE(${actualTransfer}::numeric, transfer_sales) - transfer_sales,
        actual_card = COALESCE(${actualCard}::numeric, card_sales),
        card_difference = COALESCE(${actualCard}::numeric, card_sales) - card_sales,
        recount_requested_at = NULL,
        recount_reason = NULL,
        closed_by_user_id = ${supervisorId},
        closed_at = now(),
        status = 'closed',
        notes = NULLIF(
          concat_ws(
            ' | ',
            NULLIF(notes, ''),
            CASE
              WHEN ${adjustedCash}::numeric IS NOT NULL AND ${adjustedCash}::numeric <> actual_cash
              THEN ${editPrefix} || ': cajero ' || to_char(actual_cash, 'FM9999999990.00') || ' -> final ' || to_char(${adjustedCash}::numeric, 'FM9999999990.00') || ']'
              ELSE NULL
            END,
            ${notes}::text
          ),
          ''
        )
    WHERE id = ${shiftId}
      AND status = 'open'
      AND actual_cash IS NOT NULL
      AND (
        (
          COALESCE(${adjustedCash}::numeric, actual_cash) = expected_cash
          AND COALESCE(${actualTransfer}::numeric, transfer_sales) = transfer_sales
          AND COALESCE(${actualCard}::numeric, card_sales) = card_sales
          AND (${adjustedCash}::numeric IS NULL OR ${adjustedCash}::numeric = actual_cash)
        )
        OR ${notes}::text IS NOT NULL
      )
    RETURNING id
  `;
}

export function directCloseShiftQuery(
  shiftId: number,
  supervisorId: number,
  cash: string,
  notes: string | null,
  expectedCash: string | null = null,
  options?: {
    actualTransfer?: string | null;
    expectedTransfer?: string | null;
    actualCard?: string | null;
    expectedCard?: string | null;
  }
) {
  const actualTransfer = options?.actualTransfer ?? null;
  const expectedTransfer = options?.expectedTransfer ?? null;
  const actualCard = options?.actualCard ?? null;
  const expectedCard = options?.expectedCard ?? null;

  return sql`
    UPDATE cash_shifts
    SET actual_cash = ${cash}::numeric,
        difference = ${cash}::numeric - expected_cash,
        actual_transfer = COALESCE(${actualTransfer}::numeric, transfer_sales),
        transfer_difference = COALESCE(${actualTransfer}::numeric, transfer_sales) - transfer_sales,
        actual_card = COALESCE(${actualCard}::numeric, card_sales),
        card_difference = COALESCE(${actualCard}::numeric, card_sales) - card_sales,
        recount_requested_at = NULL,
        recount_reason = NULL,
        closed_by_user_id = ${supervisorId},
        closed_at = now(),
        status = 'closed',
        notes = NULLIF(concat_ws(' | ', NULLIF(notes, ''), ${notes}::text), '')
    WHERE id = ${shiftId}
      AND status = 'open'
      AND actual_cash IS NULL
      AND (${expectedCash}::numeric IS NULL OR expected_cash = ${expectedCash}::numeric)
      AND (${expectedTransfer}::numeric IS NULL OR transfer_sales = ${expectedTransfer}::numeric)
      AND (${expectedCard}::numeric IS NULL OR card_sales = ${expectedCard}::numeric)
      AND (
        (
          ${cash}::numeric = expected_cash
          AND COALESCE(${actualTransfer}::numeric, transfer_sales) = transfer_sales
          AND COALESCE(${actualCard}::numeric, card_sales) = card_sales
        )
        OR ${notes}::text IS NOT NULL
      )
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
