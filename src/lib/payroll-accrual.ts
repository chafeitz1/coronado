// Décimo, vacación and prima de antigüedad aren't discrete payments — they
// accrue continuously and get paid down periodically. Ported from the
// anthropic-skills "payroll-ledger-system" blueprint (Panama Código de
// Trabajo / Ley 44 de 1995 formulas, validated against real payroll data),
// adapted to Coronado's data: there's no per-quincena capture-grid row here,
// so quincena compensation is derived from the `expenses` ledger instead of
// a stored PayrollEntry.

export type Period = { year: number; month: number; half: 1 | 2 };

export function periodOrdinal(year: number, month: number, half: 1 | 2): number {
  return year * 24 + (month - 1) * 2 + (half - 1);
}

export function nextPeriod(p: Period): Period {
  return p.half === 1
    ? { year: p.year, month: p.month, half: 2 }
    : { year: p.month === 12 ? p.year + 1 : p.year, month: p.month === 12 ? 1 : p.month + 1, half: 1 };
}

// day 1-15 -> half 1, 16-end -> half 2
export function periodFromDateString(dateStr: string): Period | null {
  const d = new Date(`${dateStr}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, half: d.getUTCDate() <= 15 ? 1 : 2 };
}

function periodApproxDate(p: Period): Date {
  return new Date(Date.UTC(p.year, p.month - 1, p.half === 1 ? 15 : 28));
}

// The clock resets at the most recent payment of the benefit's own
// subcategory OR a liquidación (a liquidación is a combined settlement that
// pays out whatever's accrued across décimo/vacación/prima at once, and can
// happen mid-tenure without ending employment — "se liquida y se reinicia
// el tiempo laboral"). Falls back to hire date if there's never been one.
export function accrualPeriodStart(paymentDates: string[], hireDate: string | null): string | null {
  if (paymentDates.length === 0) return hireDate;
  return paymentDates.reduce((latest, d) => (d > latest ? d : latest));
}

// Panama pays décimo in three fixed installments a year (mid-April,
// mid-August, mid-December), each covering the ~4-month segment since the
// previous one.
export function decimoSegmentStart(asOf: Period): Period {
  const asOfOrd = periodOrdinal(asOf.year, asOf.month, asOf.half);
  // The 4th candidate (Dec 16 of the SAME year) is easy to omit and looks
  // redundant with "Dec 16 of the prior year" — until asOf itself falls
  // after Dec 15. Without it, anything evaluated after Dec 15 keeps summing
  // from the August anchor instead of resetting: one segment too many.
  const candidates: Period[] = [
    { year: asOf.year - 1, month: 12, half: 2 },
    { year: asOf.year, month: 4, half: 2 },
    { year: asOf.year, month: 8, half: 2 },
    { year: asOf.year, month: 12, half: 2 },
  ];
  let best = candidates[0];
  let bestOrd = periodOrdinal(best.year, best.month, best.half);
  for (const c of candidates) {
    const ord = periodOrdinal(c.year, c.month, c.half);
    if (ord <= asOfOrd && ord > bestOrd) {
      best = c;
      bestOrd = ord;
    }
  }
  return best;
}

export function computeDecimoAccrual(lookupQuincenaCompCents: (p: Period) => number, asOf: Period): number {
  const start = decimoSegmentStart(asOf);
  const asOfOrd = periodOrdinal(asOf.year, asOf.month, asOf.half);
  let total = 0;
  let cur = start;
  while (periodOrdinal(cur.year, cur.month, cur.half) <= asOfOrd) {
    total += lookupQuincenaCompCents(cur);
    cur = nextPeriod(cur);
  }
  return total / 12;
}

// Not a fixed calendar year — resets the quincena right after a real payout
// and starts accruing again from zero.
export function computeVacationAccrual(
  realPeriodsWithEntries: Period[],
  lastPayout: Period | null,
  lookupQuincenaCompCents: (p: Period) => number,
  asOf: Period
): number {
  // Strict `<`, not `<=`: if the payout period itself were findable as "the
  // last payout," evaluating the formula AT that exact period would sum
  // zero periods and read $0 — precisely the one moment it most needs to
  // equal what was actually paid. "Last payout" means strictly before asOf.
  const lastPayoutOrd = lastPayout ? periodOrdinal(lastPayout.year, lastPayout.month, lastPayout.half) : -Infinity;
  const asOfOrd = periodOrdinal(asOf.year, asOf.month, asOf.half);
  const counted = realPeriodsWithEntries.filter((p) => {
    const ord = periodOrdinal(p.year, p.month, p.half);
    return ord > lastPayoutOrd && ord <= asOfOrd;
  });
  const total = counted.reduce((sum, p) => sum + lookupQuincenaCompCents(p), 0);
  return total * 0.0909; // 1/11, Panama's proporcional rate
}

// Código de Trabajo Art. 196 / Ley 44 de 1995: one week of salary per full
// year of service, expressed as a monthly provision = 1.92% of monthly
// salary per calendar month worked. Against CURRENT base salary (not a
// history walk like décimo/vacación) and floored to whole months.
export function computePrimaAntiguedadAccrual(
  baseSalary: number,
  startDate: string,
  resetAnchor: Period | null,
  asOf: Period
): number {
  const asOfOrd = periodOrdinal(asOf.year, asOf.month, asOf.half);
  const resetOrd = resetAnchor ? periodOrdinal(resetAnchor.year, resetAnchor.month, resetAnchor.half) : null;
  const anchorDate =
    resetAnchor && resetOrd !== null && asOfOrd > resetOrd ? periodApproxDate(resetAnchor) : new Date(startDate);
  const asOfDate = periodApproxDate(asOf);
  let months = (asOfDate.getUTCFullYear() - anchorDate.getUTCFullYear()) * 12 + (asOfDate.getUTCMonth() - anchorDate.getUTCMonth());
  if (asOfDate.getUTCDate() < anchorDate.getUTCDate()) months -= 1;
  return baseSalary * 0.0192 * Math.max(0, months);
}

// Equal fixed installments, remainder folded entirely into the last one so
// the sum of every installment always equals principal exactly.
export function computeLoanSchedule(
  principal: number,
  numInstallments: number,
  startPeriod: Period
): { period: Period; amount: number }[] {
  if (numInstallments < 1) throw new Error("numInstallments must be at least 1");
  const base = Math.floor((principal / numInstallments) * 100) / 100;
  const remainder = Math.round((principal - base * numInstallments) * 100) / 100;
  const installments: { period: Period; amount: number }[] = [];
  let period = startPeriod;
  for (let i = 0; i < numInstallments; i++) {
    installments.push({ period, amount: i === numInstallments - 1 ? base + remainder : base });
    period = nextPeriod(period);
  }
  return installments;
}

// An adelanto is requested before that quincena's own payday, so it
// defaults to the quincena the request date already falls IN. A préstamo
// defaults to the quincena right AFTER the grant date instead, so money
// handed out mid-quincena doesn't also try to claw back part of a quincena
// whose amount may already be near-final. Both are editable overrides in
// the UI, never enforced.
export function defaultLoanStartPeriod(category: "prestamo" | "adelanto", requestDate: string): Period | null {
  const requestPeriod = periodFromDateString(requestDate);
  if (!requestPeriod) return null;
  return category === "adelanto" ? requestPeriod : nextPeriod(requestPeriod);
}
