import { sql } from "drizzle-orm";

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
