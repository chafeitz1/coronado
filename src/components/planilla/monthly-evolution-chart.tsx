"use client";

import * as React from "react";

import type { PayrollEmployeeAnnualSummary } from "@/lib/types/planilla";
import { MONTHS_ES, periodKey, formatCents } from "@/lib/planilla/payroll-period";
import { employeeAccentColor } from "@/lib/planilla/payroll-colors";

const CHART_HEIGHT = 176; // px, tallest real stacked bar

/**
 * "Evolución mensual del gasto total en planilla" -- a composed
 * (stacked) bar chart, one segment per employee-with-real-history per
 * month, so the shape of the property's total payroll cost is visible
 * at a glance while still being traceable back to who it's coming
 * from (same employee identity color used everywhere else --
 * Registro's avatars, Resumen Anual's cards -- so a color in this
 * chart always means the same person). Shared between Registro and
 * Dashboard rather than duplicated, since both need the exact same
 * chart per the redesign spec ("the three views share the same
 * underlying data and calculation engine").
 *
 * `rows` is PayrollEmployeeAnnualSummary[] -- callers already have this from
 * getAnnualSummaryAction, so this component does no fetching of its
 * own and can never show a number Resumen Anual disagrees with.
 *
 * Deliberately filters by `monthsWithActivity > 0` for the selected
 * year, NOT by `employee.status === "ACTIVE"` -- an employee who left
 * the company still has real, already-paid history that year (e.g.
 * Milagros's final Jan 2026 quincena, or Jessica's whole 2025), and
 * CLAUDE.md's own rule is "never remove or simplify historical
 * information" -- filtering a real paid month out of a payroll-cost
 * chart because someone is INACTIVE *today* is exactly that kind of
 * silent data loss. `status` is a "who's currently on payroll" fact,
 * not a "did this money get paid" fact; only the latter matters here.
 *
 * "Total" mode stacks each month's own pay; "Acumulado" stacks each
 * employee's running cumulative total through that month -- same
 * toggle as the mockup. Months with no real data yet (the rest of the
 * current year) render as a thin dashed placeholder in both modes,
 * matching Resumen Anual's own bar chart convention -- there's no
 * "Proyectar" toggle wired into this chart, so a future month simply
 * has nothing to show yet rather than a fabricated estimate.
 */
export function MonthlyEvolutionChart({ rows, title }: { rows: PayrollEmployeeAnnualSummary[]; title?: string }) {
  const [mode, setMode] = React.useState<"total" | "acumulado">("total");
  const withData = React.useMemo(() => rows.filter((r) => r.monthsWithActivity > 0), [rows]);
  const months = React.useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), []);

  const monthlyByEmployee = React.useMemo(
    () =>
      withData.map((row) => months.map((m) => (row.totalsByPeriod[periodKey(m, 1)] ?? 0) + (row.totalsByPeriod[periodKey(m, 2)] ?? 0))),
    [withData, months]
  );

  const hasDataForMonth = months.map((_, i) => monthlyByEmployee.some((arr) => arr[i] > 0));

  // Per-employee series for whichever mode is selected -- "total" uses
  // the raw monthly figure, "acumulado" a running sum, so the segment
  // stacking logic below never needs to know which mode is active.
  const seriesByEmployee = React.useMemo(() => {
    if (mode === "total") return monthlyByEmployee;
    return monthlyByEmployee.map((monthly) => {
      let running = 0;
      return monthly.map((v) => (running += v));
    });
  }, [monthlyByEmployee, mode]);

  const monthTotals = months.map((_, i) => seriesByEmployee.reduce((s, arr) => s + arr[i], 0));
  const max = Math.max(...monthTotals, 1);

  return (
    <div className="rounded-md border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">{title ?? "Evolución mensual del gasto total en planilla"}</p>
        <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setMode("total")}
            className={`rounded px-2 py-1 font-medium transition-colors ${mode === "total" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            Total
          </button>
          <button
            type="button"
            onClick={() => setMode("acumulado")}
            className={`rounded px-2 py-1 font-medium transition-colors ${mode === "acumulado" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            Acumulado
          </button>
        </div>
      </div>

      {withData.length === 0 ? (
        <p className="mt-6 text-center text-sm text-muted-foreground">Sin datos de planilla para graficar.</p>
      ) : (
        <>
          <div className="mt-4 flex items-end gap-2" style={{ height: CHART_HEIGHT + 34 }}>
            {months.map((m, i) => {
              const total = monthTotals[i];
              const hasData = hasDataForMonth[i];
              if (!hasData) {
                return (
                  <div key={m} className="flex flex-1 flex-col items-center justify-end gap-1">
                    <div className="w-full rounded-t-sm" style={{ height: 22, border: "1px dashed var(--border)" }} />
                    <span className="text-[10px] text-muted-foreground">{MONTHS_ES[m - 1].slice(0, 3)}</span>
                  </div>
                );
              }
              const barHeight = Math.max((total / max) * CHART_HEIGHT, 10);
              return (
                <div key={m} className="flex flex-1 flex-col items-center justify-end gap-1">
                  <span className="text-[10px] font-medium tabular-nums text-foreground">{formatCents(total)}</span>
                  <div className="flex w-full flex-col-reverse overflow-hidden rounded-t-sm" style={{ height: barHeight }}>
                    {withData.map((row, empIdx) => {
                      const value = seriesByEmployee[empIdx][i];
                      if (value <= 0) return null;
                      return (
                        <div
                          key={row.employee.id}
                          style={{ height: `${(value / total) * 100}%`, backgroundColor: employeeAccentColor(row.employee.sortOrder) }}
                          title={`${row.employee.name}: ${formatCents(value)}`}
                        />
                      );
                    })}
                  </div>
                  <span className="text-[10px] text-muted-foreground">{MONTHS_ES[m - 1].slice(0, 3)}</span>
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border pt-2 text-[11px] text-muted-foreground">
            {withData.map((row) => (
              <span key={row.employee.id} className="flex items-center gap-1.5">
                <span className="size-2 rounded-full" style={{ backgroundColor: employeeAccentColor(row.employee.sortOrder) }} />
                {row.employee.name}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
