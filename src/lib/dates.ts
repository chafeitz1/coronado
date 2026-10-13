// new Date() alone is fine under the purity lint; Date.now() arithmetic
// inside a render body is not, so these wrap the offset math.
export function isoDateOffset(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function isoDateTimeOffset(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const target = new Date(`${dateStr}T00:00:00Z`);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// 6 weeks (42 days) covering the given month, Monday-start, including the
// leading/trailing days from adjacent months that fill out the grid.
export function getMonthGrid(year: number, month: number): Date[] {
  const first = new Date(Date.UTC(year, month, 1));
  const firstWeekday = (first.getUTCDay() + 6) % 7; // Monday = 0
  const start = new Date(first);
  start.setUTCDate(first.getUTCDate() - firstWeekday);

  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    days.push(d);
  }
  return days;
}

const LONG_MONTH_NAMES: Record<"es" | "en", string[]> = {
  es: [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ],
  en: [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ],
};

// "Julio 1, 2024" — deliberately "Month Day, Year" in both languages
// rather than Spanish's usual "1 de julio de 2024", to match the rest of
// the app's date displays. Parses the ISO string directly (no Date/
// timezone conversion) so a stored "2024-07-01" never shifts a day.
export function formatLongDate(dateStr: string, locale: "es" | "en"): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  return `${LONG_MONTH_NAMES[locale][month - 1]} ${day}, ${year}`;
}

// "Julio 2024" — for grouping a list of dated entries by month.
export function formatMonthYear(yearMonth: string, locale: "es" | "en"): string {
  const [year, month] = yearMonth.split("-").map(Number);
  return `${LONG_MONTH_NAMES[locale][month - 1]} ${year}`;
}

// Monday-start week (matches getMonthGrid's own week start) — the last day
// (Sunday) of the week containing dateStr, as an ISO date string.
export function endOfWeek(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const weekday = (d.getUTCDay() + 6) % 7; // Monday = 0 ... Sunday = 6
  d.setUTCDate(d.getUTCDate() + (6 - weekday));
  return d.toISOString().slice(0, 10);
}

export function advanceDate(dateStr: string, unit: "days" | "weeks" | "months" | "years", value: number): string {
  const date = new Date(`${dateStr}T00:00:00Z`);
  if (unit === "days") date.setUTCDate(date.getUTCDate() + value);
  if (unit === "weeks") date.setUTCDate(date.getUTCDate() + value * 7);
  if (unit === "months") date.setUTCMonth(date.getUTCMonth() + value);
  if (unit === "years") date.setUTCFullYear(date.getUTCFullYear() + value);
  return date.toISOString().slice(0, 10);
}
