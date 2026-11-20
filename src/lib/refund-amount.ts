type SoldItem = { id: number; unitPrice: number | string; quantity: number };

export function refundUnitAmounts(items: SoldItem[], amountPaid: number) {
  const ordered = [...items].sort((a, b) => a.id - b.id);
  const grossCents = ordered.reduce((sum, item) => sum + Math.round(Number(item.unitPrice) * 100) * item.quantity, 0);
  const paidCents = Math.round(amountPaid * 100);
  const amounts = new Map<number, (returned: number, requested: number) => number>();
  let offset = 0;

  for (const item of ordered) {
    const unitCents = Math.round(Number(item.unitPrice) * 100);
    const lineStart = offset;
    const cumulativePaid = (quantity: number) => grossCents
      ? Math.round(((lineStart + quantity * unitCents) / grossCents) * paidCents)
      : 0;
    amounts.set(item.id, (returned, requested) => cumulativePaid(returned + requested) - cumulativePaid(returned));
    offset += unitCents * item.quantity;
  }

  return amounts;
}
