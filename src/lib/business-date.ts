const DAY_MS = 86_400_000;
const boliviaDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/La_Paz",
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

export function addBusinessDays(date: Date, numberOfDays: number): Date {
  return new Date(date.getTime() + numberOfDays * DAY_MS);
}
