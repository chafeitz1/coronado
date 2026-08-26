// Décimo and vacación aren't discrete payments — they accrue continuously
// from salary and get paid down periodically. These are Panama's Código de
// Trabajo rates, not company-specific config.
export const DECIMO_MONTHLY_RATE = 1 / 12; // one month's salary per year
export const VACATION_MONTHLY_RATE = 0.0909; // 30 days per 11 months worked

export type SalaryEntry = { salary: number; effective_date: string };

// The clock resets at the most recent payment of that subcategory (partial
// or full — a payment is treated as settling everything accrued before it),
// or at hire if there's never been one.
export function accrualPeriodStart(paymentDates: string[], hireDate: string | null): string | null {
  if (paymentDates.length === 0) return hireDate;
  return paymentDates.reduce((latest, d) => (d > latest ? d : latest));
}

// Walks whole calendar months from periodStart to asOf, using whichever
// salary was in effect at the start of each month, plus a day-prorated
// partial final month.
export function computeAccrual(
  periodStart: string,
  asOf: string,
  salaryHistory: SalaryEntry[],
  monthlyRate: number
): number {
  const start = new Date(`${periodStart}T00:00:00Z`);
  const end = new Date(`${asOf}T00:00:00Z`);
  if (end <= start) return 0;

  const sorted = [...salaryHistory].sort((a, b) => b.effective_date.localeCompare(a.effective_date));
  function salaryAt(date: Date): number {
    const iso = date.toISOString().slice(0, 10);
    const entry = sorted.find((s) => s.effective_date <= iso);
    return entry?.salary ?? sorted[sorted.length - 1]?.salary ?? 0;
  }

  let total = 0;
  let cursor = start;
  while (true) {
    const nextMonth = new Date(cursor);
    nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);

    if (nextMonth <= end) {
      total += monthlyRate * salaryAt(cursor);
      cursor = nextMonth;
    } else {
      const daysInMonth = (nextMonth.getTime() - cursor.getTime()) / 86400000;
      const daysElapsed = (end.getTime() - cursor.getTime()) / 86400000;
      if (daysElapsed > 0) total += monthlyRate * salaryAt(cursor) * (daysElapsed / daysInMonth);
      break;
    }
  }
  return total;
}
