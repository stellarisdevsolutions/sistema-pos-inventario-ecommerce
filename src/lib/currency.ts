/**
 * Configuración centralizada de moneda para el sistema.
 * Lee desde la variable de entorno NEXT_PUBLIC_CURRENCY_SYMBOL (por defecto "Bs")
 * y NEXT_PUBLIC_CURRENCY_NAME (por defecto "Bolivianos").
 */
export const CURRENCY_SYMBOL = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || "Bs";
export const CURRENCY_NAME = process.env.NEXT_PUBLIC_CURRENCY_NAME || "Bolivianos";

/**
 * Formatea un valor monetario incluyendo el símbolo de moneda (ej: "Bs 150.00")
 */
export function formatCurrency(amount: number | string | null | undefined): string {
  const numeric = typeof amount === "number" ? amount : parseFloat(String(amount || 0)) || 0;
  return `${CURRENCY_SYMBOL} ${numeric.toFixed(2)}`;
}

/**
 * Formatea un monto numérico con separadores de miles y 2 decimales para totales
 */
export function formatCurrencyLocale(amount: number | string | null | undefined): string {
  const numeric = typeof amount === "number" ? amount : parseFloat(String(amount || 0)) || 0;
  return `${CURRENCY_SYMBOL} ${numeric.toLocaleString("es-BO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
