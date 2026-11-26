/**
 * Calcula los montos esperados, reconocidos y penalidades de devoluciones a proveedores
 * sin alterar la valuación unitaria del inventario ni la ganancia bruta de ventas.
 */
export function summarizePurchaseReturnAmounts(
  items: { quantity: number; originalUnitCost: string | number }[],
  creditedAmount: string | number | null | undefined
) {
  const expectedAmount = items.reduce(
    (sum, item) => sum + item.quantity * (Number(item.originalUnitCost) || 0),
    0
  );
  const parsedCredited =
    creditedAmount !== null && creditedAmount !== undefined
      ? Number(creditedAmount) || 0
      : expectedAmount;

  return {
    expectedAmount,
    creditedAmount: parsedCredited,
    penaltyAmount: Math.max(0, expectedAmount - parsedCredited),
  };
}

export function sumPurchaseReturnPenalties(
  returns: {
    creditedAmount: string | number | null | undefined;
    items: { quantity: number; originalUnitCost: string | number }[];
  }[]
): number {
  return Number(
    returns
      .reduce(
        (sum, receipt) =>
          sum + summarizePurchaseReturnAmounts(receipt.items, receipt.creditedAmount).penaltyAmount,
        0
      )
      .toFixed(2)
  );
}
