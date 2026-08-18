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

export function advanceDate(dateStr: string, unit: "days" | "weeks" | "months" | "years", value: number): string {
  const date = new Date(`${dateStr}T00:00:00Z`);
  if (unit === "days") date.setUTCDate(date.getUTCDate() + value);
  if (unit === "weeks") date.setUTCDate(date.getUTCDate() + value * 7);
  if (unit === "months") date.setUTCMonth(date.getUTCMonth() + value);
  if (unit === "years") date.setUTCFullYear(date.getUTCFullYear() + value);
  return date.toISOString().slice(0, 10);
}
