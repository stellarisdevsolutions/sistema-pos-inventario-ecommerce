export const BUSINESS_TIME_ZONE = "America/La_Paz";

const DAY_MS = 86_400_000;
const boliviaDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: BUSINESS_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function businessDate(date = new Date()): string {
  return boliviaDate.format(date);
}

export function businessDayStart(day: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error("Fecha inválida.");
  const date = new Date(`${day}T00:00:00-04:00`);
  if (!Number.isFinite(date.getTime()) || businessDate(date) !== day) throw new Error("Fecha inválida.");
  return date;
}

export function businessMonthStart(date = new Date()): Date {
  return businessDayStart(`${businessDate(date).slice(0, 7)}-01`);
}

export function businessMonthEnd(date = new Date()): Date {
  const [year, month] = businessDate(date).split("-").map(Number);
  const nextMonthStr =
    month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, "0")}-01`;
  return businessDayStart(nextMonthStr);
}

export function addBusinessDays(date: Date, numberOfDays: number): Date {
  return new Date(date.getTime() + numberOfDays * DAY_MS);
}

export function formatBusinessDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("es-BO", {
    timeZone: BUSINESS_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatBusinessTime(date: Date | string, includeSeconds = false): string {
  return new Date(date).toLocaleTimeString("es-BO", {
    timeZone: BUSINESS_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    ...(includeSeconds ? { second: "2-digit" } : {}),
  });
}

export function formatBusinessDateTime(date: Date | string): string {
  return new Date(date).toLocaleDateString("es-BO", {
    timeZone: BUSINESS_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatBusinessShortDateTime(date: Date | string): string {
  return new Date(date).toLocaleDateString("es-BO", {
    timeZone: BUSINESS_TIME_ZONE,
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatBusinessShortDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("es-BO", {
    timeZone: BUSINESS_TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
