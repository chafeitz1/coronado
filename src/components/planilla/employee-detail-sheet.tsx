"use client";

import * as React from "react";
import { ChevronDown, ListTree } from "lucide-react";

import type { PayrollEmployee } from "@/lib/types/planilla";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/payroll-ui/sheet";
import { MONTHS_ES, periodOrdinal, currentPeriod, formatCents } from "@/lib/planilla/payroll-period";
import { getEmployeeAnnualDetailAction } from "@/app/actions/planilla";
import { LedgerSection } from "@/components/planilla/ledger-section";
import type { LedgerPeriodOption } from "@/components/planilla/ledger-entry-dialog";

type DetailRow = Awaited<ReturnType<typeof getEmployeeAnnualDetailAction>>[number];

/** Every distinct payroll concept that's a plain sum with no
 *  "accruing vs. paid" distinction. `sign` controls whether the
 *  monthly figure adds to or subtracts from the Total row directly
 *  beneath it, so the breakdown always foots to the same number
 *  the ledger table above already shows. Décimo, Vacación and Prima
 *  de Antigüedad are NOT here -- they have their own renderAccrualRow
 *  below, since each needs the light-accruing/bold-paid convention
 *  the real spreadsheet uses instead of a flat monthly figure. */
const BREAKDOWN_ROWS: {
  key: string;
  label: string;
  sign: 1 | -1;
  pick: (r: DetailRow) => number;
}[] = [
  { key: "base", label: "Salario base", sign: 1, pick: (r) => r.entry?.basePayCents ?? 0 },
  {
    key: "extras",
    label: "Horas/días extra, viáticos, bonos",
    sign: 1,
    pick: (r) => (r.entry ? r.entry.extraHoursCents + r.entry.extraDaysCents + r.entry.viaticosCents + r.entry.bonusCents : 0),
  },
  { key: "dias_libres", label: "Días libres", sign: 1, pick: (r) => r.entry?.diasLibresCents ?? 0 },
  { key: "descuentos", label: "Descuentos", sign: -1, pick: (r) => r.entry?.otherDeductionCents ?? 0 },
  { key: "abono", label: "Abono a préstamo/adelanto", sign: -1, pick: (r) => r.ledgerPaymentCents },
];

/** Money handed to the employee outside payroll (a loan/advance
 *  granted this month) -- shown for visibility since it's real
 *  activity the user tracks, but deliberately excluded from
 *  BREAKDOWN_ROWS and the Total row: it isn't pay, it's a debt the
 *  employee now owes, repaid later via "Abono a préstamo" above. */
const LOAN_GRANTED_ROW = { key: "prestamo", label: "Préstamo/adelanto otorgado (no es pago)", pick: (r: DetailRow) => r.ledgerDebtCents };

export function EmployeeDetailSheet({
  employee,
  year,
  open,
  onOpenChange,
}: {
  employee: PayrollEmployee | null;
  year: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const employeeId = employee?.id ?? null;
  const [rows, setRows] = React.useState<DetailRow[] | null>(null);
  // The detailed month-by-month breakdown below is dense -- collapsed
  // by default so the sheet opens on the compact ledger table first,
  // same "scannable first, exhaustive on request" idea as Resumen
  // Anual's cards.
  const [breakdownOpen, setBreakdownOpen] = React.useState(false);

  // Extracted so LedgerSection can trigger a refetch after it creates
  // a loan, cancels one, or edits a generic movement -- those all
  // change this table's numbers (a loan's future cuotas show up here
  // as real quincena rows, per createLoan in services/payroll.ts) but
  // live in a child component's own state, not this effect.
  const loadRows = React.useCallback(() => {
    if (!employeeId || !open) return;
    getEmployeeAnnualDetailAction(employeeId, year).then(setRows);
  }, [employeeId, year, open]);

  React.useEffect(() => {
    loadRows();
  }, [loadRows]);
  // Clears any stale previous employee's rows the moment the sheet's
  // target changes, so there's a brief empty/loading state instead of
  // showing the wrong employee's numbers while the fetch above is in
  // flight -- a plain derived reset, not a fetch, so it belongs in its
  // own effect rather than sharing the one above (which would trip
  // react-hooks/set-state-in-effect for calling setState synchronously
  // ahead of the async fetch).
  /* eslint-disable react-hooks/set-state-in-effect -- synchronizing displayed rows with a changed identity (employeeId/open), not deriving state from props during render. */
  React.useEffect(() => {
    setRows(null);
  }, [employeeId, open]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const withActivity = (rows ?? []).filter((r) => r.entry !== null || r.ledgerDebtCents > 0 || r.ledgerPaymentCents > 0);

  // Every real quincena this employee has this year, for the "apply
  // this movement to a quincena" picker in the ledger's add dialog --
  // built straight from what's already loaded here, no extra fetch.
  const periodOptions: LedgerPeriodOption[] = (rows ?? [])
    .filter((r) => r.entry !== null)
    .map((r) => ({ payrollEntryId: r.entry!.id, year: r.year, month: r.month, half: r.half }));

  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const current = currentPeriod();
  const currentOrdinal = periodOrdinal(current.year, current.month, current.half);
  const hasBenefitsBase =
    !!employee && employee.benefitsBaseSalaryCents != null && employee.benefitsBaseSalaryCents !== employee.baseSalaryCents;

  /** Renders one Décimo/Vacación/Prima de Antigüedad line: bold and
   *  counted in the year total for a month where a real payout was
   *  recorded, light italic and excluded from the total for a month
   *  where it's only accruing -- the exact "letra clarita hasta que se
   *  ejecuta el pago, luego negrita y se resetea" convention the user
   *  described from the real spreadsheet. Passing `null` for `paidPick`
   *  (used for the "si fuera sobre salario real" reference lines) pins
   *  a row to the light/informational style permanently, since those
   *  are comparison-only and never represent a real payout. */
  function renderAccrualRow(
    key: string,
    label: string,
    detail: DetailRow[],
    accrualPick: (r: DetailRow) => number,
    paidPick: ((r: DetailRow) => number) | null
  ) {
    const monthly = months.map((month) => {
      const rowsThisMonth = detail.filter((r) => r.month === month);
      const paidRow = paidPick ? rowsThisMonth.find((r) => paidPick(r) > 0) : undefined;
      // The formula prevails over whatever dollar figure is stored on
      // that period, even when the entry is the source of truth for
      // "this got paid" -- see payroll.ts's own comments on this same
      // principle for why paidPick is only ever a yes/no signal.
      const paid = paidRow ? accrualPick(paidRow) : 0;
      const monthHasStarted = periodOrdinal(year, month, 1) <= currentOrdinal;
      // The light preview should show the month's PEAK accrual, not
      // reflexively its 2nd quincena -- Abr/Ago/Dic are installment
      // months where the segment resets partway through, so the 2nd
      // quincena is the SMALLEST value of the two.
      const peak = Math.max(...rowsThisMonth.map((r) => accrualPick(r)), 0);
      const accrual = paid > 0 || monthHasStarted ? peak : 0;
      return { accrual, paid };
    });
    const yearTotal = monthly.reduce((s, v) => s + v.paid, 0);
    const hasAnything = yearTotal > 0 || monthly.some((v) => v.accrual > 0);
    if (!hasAnything) return null;
    return (
      <tr key={key} className="border-b border-border bg-muted/10 text-xs">
        <td className="sticky left-0 bg-muted/10 py-1 pl-6 pr-3 text-muted-foreground">{label}</td>
        {monthly.map((v, i) => (
          <td
            key={i}
            className={`px-2 py-1 text-right tabular-nums ${
              v.paid > 0 ? "font-semibold text-foreground" : "italic text-muted-foreground/45"
            }`}
          >
            {v.paid > 0 ? formatCents(v.paid) : v.accrual > 0 ? formatCents(v.accrual) : "–"}
          </td>
        ))}
        <td className="px-3 py-1 text-right tabular-nums text-muted-foreground">{formatCents(yearTotal)}</td>
      </tr>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{employee?.name ?? ""}</SheetTitle>
          <SheetDescription>Detalle de planilla — {year}</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {withActivity.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">Sin pagos registrados en {year}.</p>
          )}
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="py-2 font-medium">Quincena</th>
                <th className="py-2 text-right font-medium">Base</th>
                <th className="py-2 text-right font-medium">Extras</th>
                <th className="py-2 text-right font-medium">Descuentos</th>
                <th className="py-2 text-right font-medium">Préstamos</th>
                <th className="py-2 text-right font-medium">Total</th>
                <th className="py-2 text-right font-medium">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {withActivity.map((row) => (
                <tr key={`${row.month}-${row.half}`} className="border-b border-border last:border-0">
                  <td className="py-1.5 text-foreground">
                    {MONTHS_ES[row.month - 1]} · {row.half === 1 ? "1ra" : "2da"}
                  </td>
                  <td className="py-1.5 text-right tabular-nums text-muted-foreground">
                    {row.entry ? formatCents(row.entry.basePayCents) : "–"}
                  </td>
                  <td className="py-1.5 text-right tabular-nums text-muted-foreground">
                    {row.entry
                      ? formatCents(
                          row.entry.extraHoursCents +
                            row.entry.extraDaysCents +
                            row.entry.viaticosCents +
                            row.entry.bonusCents +
                            row.entry.diasLibresCents +
                            row.entry.decimoPaidCents +
                            row.entry.vacationPaidCents
                        )
                      : "–"}
                  </td>
                  <td className="py-1.5 text-right tabular-nums text-muted-foreground">
                    {row.entry ? formatCents(row.entry.otherDeductionCents + row.ledgerPaymentCents) : "–"}
                  </td>
                  <td className="py-1.5 text-right tabular-nums text-muted-foreground">
                    {row.ledgerDebtCents > 0 ? `+${formatCents(row.ledgerDebtCents)}` : "–"}
                  </td>
                  <td className="py-1.5 text-right font-medium tabular-nums text-foreground">
                    {formatCents(row.totalCents)}
                  </td>
                  <td className="py-1.5 text-right tabular-nums text-muted-foreground">
                    {formatCents(row.runningLedgerBalanceCents)}
                  </td>
                </tr>
              ))}
            </tbody>
            {withActivity.length > 0 && (
              <tfoot>
                <tr className="border-t border-border font-medium">
                  <td className="py-2 text-foreground">Total {year}</td>
                  <td colSpan={4} />
                  <td className="py-2 text-right tabular-nums text-foreground">
                    {formatCents(withActivity.reduce((sum, r) => sum + r.totalCents, 0))}
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>

          {rows && (
            <div className="mt-4 rounded-lg border border-border">
              <button
                type="button"
                className="flex w-full items-center gap-1.5 px-3 py-2 text-xs font-medium text-foreground hover:bg-muted/40"
                onClick={() => setBreakdownOpen((v) => !v)}
              >
                <ListTree className="size-3.5 text-muted-foreground" />
                Desglose mensual por concepto (Décimo, Vacación, Prima Antigüedad)
                <ChevronDown className={`ml-auto size-3.5 text-muted-foreground transition-transform ${breakdownOpen ? "" : "-rotate-90"}`} />
              </button>
              {breakdownOpen && (
                <div className="overflow-x-auto border-t border-border">
                  <table className="w-full min-w-[820px] border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-border bg-muted/40 text-muted-foreground">
                        <th className="sticky left-0 bg-muted/40 px-3 py-1.5 text-left font-medium">Concepto</th>
                        {months.map((m) => (
                          <th key={m} className="px-2 py-1.5 text-center font-medium">
                            {MONTHS_ES[m - 1].slice(0, 3)}
                          </th>
                        ))}
                        <th className="px-3 py-1.5 text-right font-medium">Total {year}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {BREAKDOWN_ROWS.map((b) => {
                        const monthlyRaw = months.map((month) => rows.filter((r) => r.month === month).reduce((sum, r) => sum + b.pick(r), 0));
                        const yearTotal = monthlyRaw.reduce((s, v) => s + v, 0);
                        if (yearTotal === 0) return null;
                        return (
                          <tr key={b.key} className="border-b border-border bg-muted/10 text-xs">
                            <td className="sticky left-0 bg-muted/10 py-1 pl-3 pr-3 text-muted-foreground">{b.label}</td>
                            {monthlyRaw.map((v, i) => (
                              <td key={i} className="px-2 py-1 text-right tabular-nums text-muted-foreground">
                                {v !== 0 ? formatCents(v * b.sign) : "–"}
                              </td>
                            ))}
                            <td className="px-3 py-1 text-right tabular-nums text-muted-foreground">{formatCents(yearTotal * b.sign)}</td>
                          </tr>
                        );
                      })}
                      {(() => {
                        const monthlyLoan = months.map((month) => rows.filter((r) => r.month === month).reduce((sum, r) => sum + LOAN_GRANTED_ROW.pick(r), 0));
                        const yearLoan = monthlyLoan.reduce((s, v) => s + v, 0);
                        if (yearLoan === 0) return null;
                        return (
                          <tr className="border-b border-border bg-muted/10 text-xs italic">
                            <td className="sticky left-0 bg-muted/10 py-1 pl-3 pr-3 text-muted-foreground">{LOAN_GRANTED_ROW.label}</td>
                            {monthlyLoan.map((v, i) => (
                              <td key={i} className="px-2 py-1 text-right tabular-nums text-muted-foreground">
                                {v !== 0 ? formatCents(v) : "–"}
                              </td>
                            ))}
                            <td className="px-3 py-1 text-right tabular-nums text-muted-foreground">{formatCents(yearLoan)}</td>
                          </tr>
                        );
                      })()}
                      {renderAccrualRow(
                        "decimo",
                        hasBenefitsBase
                          ? `Décimo (calculado sobre ${formatCents(employee!.benefitsBaseSalaryCents ?? 0)} — prestaciones)`
                          : "Décimo",
                        rows,
                        hasBenefitsBase ? (r) => r.decimoAccrualBenefitsCents ?? 0 : (r) => r.decimoAccrualCents,
                        (r) => r.entry?.decimoPaidCents ?? 0
                      )}
                      {hasBenefitsBase &&
                        renderAccrualRow(
                          "decimo-real-reference",
                          `Décimo (si fuera sobre salario real ${formatCents(employee!.baseSalaryCents)}) — referencia`,
                          rows,
                          (r) => r.decimoAccrualCents,
                          null
                        )}
                      {renderAccrualRow(
                        "vacacion",
                        hasBenefitsBase
                          ? `Vacación (calculado sobre ${formatCents(employee!.benefitsBaseSalaryCents ?? 0)} — prestaciones)`
                          : "Vacación proporcional",
                        rows,
                        hasBenefitsBase ? (r) => r.vacationAccrualBenefitsCents ?? 0 : (r) => r.vacationAccrualCents,
                        (r) => r.entry?.vacationPaidCents ?? 0
                      )}
                      {hasBenefitsBase &&
                        renderAccrualRow(
                          "vacacion-real-reference",
                          `Vacación (si fuera sobre salario real ${formatCents(employee!.baseSalaryCents)}) — referencia`,
                          rows,
                          (r) => r.vacationAccrualCents,
                          null
                        )}
                      {renderAccrualRow(
                        "prima",
                        "Prima de antigüedad (se paga solo al terminar o liquidar)",
                        rows,
                        (r) => r.primaAntiguedadAccrualCents,
                        (r) => r.entry?.primaAntiguedadPaidCents ?? 0
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {employeeId && <LedgerSection employeeId={employeeId} periodOptions={periodOptions} onChanged={loadRows} />}
        </div>
      </SheetContent>
    </Sheet>
  );
}
