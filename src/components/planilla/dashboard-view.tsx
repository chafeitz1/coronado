"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, Wallet, CalendarClock, Banknote, Award, TrendingDown, HandCoins, AlertCircle } from "lucide-react";

import type { PayrollEmployeeAnnualSummary } from "@/lib/types/planilla";
import type { UpcomingObligations } from "@/lib/types/planilla";
import { Button } from "@/components/payroll-ui/button";
import { MONTHS_ES, periodKey, currentPeriod, formatCents } from "@/lib/planilla/payroll-period";
import { employeeAccentColor } from "@/lib/planilla/payroll-colors";
import { LoadError } from "@/components/planilla/load-error";
import { getDashboardDataAction } from "@/app/actions/planilla";
import { EmployeeAvatar } from "@/components/planilla/employee-avatar";
import { PayrollKpiCard } from "@/components/planilla/payroll-kpi-card";
import { MonthlyEvolutionChart } from "@/components/planilla/monthly-evolution-chart";
import { ProximasObligacionesCard } from "@/components/planilla/proximas-obligaciones-card";

/**
 * The executive view -- "How is my payroll doing?" per the redesign
 * spec, answered without reading a spreadsheet. Deliberately does NOT
 * reproduce Registro's detailed grid (that anti-pattern is called out
 * explicitly in the spec); every number here is a rollup of the exact
 * same PayrollEmployeeAnnualSummary/UpcomingObligations data Resumen Anual
 * and Registro already fetch, so nothing on this page can disagree
 * with what those views show if the user clicks through.
 *
 * Scope note: the spec also lists "distribution by property" as a
 * possible Dashboard chart. This view is scoped to the property
 * already selected in PayrollClient (same as Registro and Resumen
 * Anual), so a by-property breakdown doesn't apply here -- there's
 * only one property in context. Distribution by employee is included
 * instead, since that's meaningful even within a single property.
 */
export function DashboardView({
  year,
  onYearChange,
}: {
  year: number;
  onYearChange: (year: number) => void;
}) {
  const [rows, setRows] = React.useState<PayrollEmployeeAnnualSummary[] | null>(null);
  const [obligations, setObligations] = React.useState<UpcomingObligations | null>(null);

  const [loadError, setLoadError] = React.useState<string | null>(null);
  const load = React.useCallback(() => {
    getDashboardDataAction(year)
      .then((res) => {
        if (res.ok) {
          setRows(res.data.rows);
          setObligations(res.data.obligations);
          setLoadError(null);
        } else {
          setLoadError(res.error);
        }
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : "Error de conexión"));
  }, [year]);

  React.useEffect(() => {
    load();
  }, [load]);

  const loading = !rows || !obligations;

  // "Activos ahora" -- current roster headcount, used only for the KPI
  // sublabel below. Deliberately status-based (it's a real "who's on
  // payroll today" fact), unlike `withData` below.
  const active = React.useMemo(() => (rows ?? []).filter((r) => r.employee.status === "ACTIVE"), [rows]);
  // Everyone with real paid history THIS year, regardless of current
  // status -- an employee who left still has real, already-paid
  // months that year (e.g. Jessica's whole 2025), and CLAUDE.md's own
  // rule is "never remove or simplify historical information," so
  // "Distribución por empleado" and the evolution chart below must
  // never drop a real paid month just because someone is INACTIVE
  // *today*. See monthly-evolution-chart.tsx's doc comment for the
  // same reasoning in more detail.
  const withData = React.useMemo(() => (rows ?? []).filter((r) => r.monthsWithActivity > 0), [rows]);
  const totalYTD = React.useMemo(() => (rows ?? []).reduce((s, r) => s + r.totalPaidCents, 0), [rows]);
  const current = currentPeriod();
  const currentMonthCents = React.useMemo(
    () =>
      (rows ?? []).reduce(
        (s, r) => s + (r.totalsByPeriod[periodKey(current.month, 1)] ?? 0) + (r.totalsByPeriod[periodKey(current.month, 2)] ?? 0),
        0
      ),
    [rows, current.month]
  );
  const salariosCents = React.useMemo(() => (rows ?? []).reduce((s, r) => s + r.conceptTotals.salarioCents, 0), [rows]);
  const prestacionesCents = React.useMemo(
    () => (rows ?? []).reduce((s, r) => s + r.conceptTotals.decimoCents + r.conceptTotals.vacacionCents + r.conceptTotals.primaCents, 0),
    [rows]
  );
  const descuentosCents = React.useMemo(() => (rows ?? []).reduce((s, r) => s + r.conceptTotals.descuentosCents, 0), [rows]);
  const prestamosCents = React.useMemo(() => (rows ?? []).reduce((s, r) => s + r.conceptTotals.prestamosCents, 0), [rows]);
  const obligacionesPendientesCents = obligations
    ? obligations.decimoPendingCents + obligations.vacacionPendingCents + obligations.prestamosPendingCents
    : 0;

  const maxEmployeeCents = Math.max(...withData.map((r) => r.totalPaidCents), 1);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium text-foreground">Dashboard</p>
          <p className="text-xs text-muted-foreground">Cómo va tu planilla, de un vistazo.</p>
        </div>
        <div className="flex items-center gap-1 rounded-md border border-border px-1">
          <Button variant="ghost" size="icon" className="size-7" onClick={() => onYearChange(year - 1)}>
            <ChevronLeft className="size-4" />
          </Button>
          <span className="min-w-16 text-center text-sm font-medium text-foreground">{year}</span>
          <Button variant="ghost" size="icon" className="size-7" onClick={() => onYearChange(year + 1)}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        loadError ? <LoadError message={loadError} onRetry={load} /> : <p className="text-xs text-muted-foreground">Cargando…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <PayrollKpiCard
              icon={Wallet}
              label="Total Planilla YTD"
              value={formatCents(totalYTD)}
              sublabel={`${active.length} empleados activos`}
              color="var(--success)"
            />
            <PayrollKpiCard
              icon={CalendarClock}
              label="Planilla del mes actual"
              value={formatCents(currentMonthCents)}
              sublabel={MONTHS_ES[current.month - 1]}
              color="var(--chart-5)"
            />
            <PayrollKpiCard icon={Banknote} label="Salarios totales" value={formatCents(salariosCents)} category="salario" />
            <PayrollKpiCard icon={Award} label="Prestaciones totales" value={formatCents(prestacionesCents)} category="decimo" />
            <PayrollKpiCard icon={TrendingDown} label="Descuentos totales" value={formatCents(descuentosCents)} category="descuentos" />
            <PayrollKpiCard icon={HandCoins} label="Préstamos otorgados" value={formatCents(prestamosCents)} category="prestamos" />
            <PayrollKpiCard
              icon={AlertCircle}
              label="Obligaciones pendientes"
              value={formatCents(obligacionesPendientesCents)}
              sublabel="Décimo + Vacación + Préstamos"
              color="var(--destructive)"
            />
          </div>

          <MonthlyEvolutionChart rows={rows} />

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {obligations && <ProximasObligacionesCard obligations={obligations} />}

            <div className="rounded-xl border border-border bg-card p-4">
              <p className="mb-3 text-sm font-medium text-foreground">Distribución por empleado</p>
              {withData.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin datos de planilla este año.</p>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {[...withData]
                    .sort((a, b) => b.totalPaidCents - a.totalPaidCents)
                    .map((r) => (
                      <div key={r.employee.id} className="flex items-center gap-2">
                        <EmployeeAvatar name={r.employee.name} employeeId={r.employee.id} sortOrder={r.employee.sortOrder} />
                        <span className="w-20 shrink-0 truncate text-xs text-foreground">{r.employee.name}</span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${(r.totalPaidCents / maxEmployeeCents) * 100}%`,
                              backgroundColor: employeeAccentColor(r.employee.sortOrder),
                            }}
                          />
                        </div>
                        <span className="w-20 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                          {formatCents(r.totalPaidCents)}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
