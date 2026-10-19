"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  TrendingUp,
  LogOut,
  FileText,
  UserCheck,
  UserX,
  BarChart3,
  Coins,
  CheckCircle2,
  Clock,
  Gauge,
} from "lucide-react";

import type { PayrollEmployee, PayrollEmployeeAnnualSummary } from "@/lib/types/planilla";
import { Button } from "@/components/payroll-ui/button";
import { Badge } from "@/components/payroll-ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/payroll-ui/popover";
import { MONTHS_ES, periodKey, currentPeriod, periodOrdinal, formatCents } from "@/lib/planilla/payroll-period";
import { formatDisplayDate } from "@/lib/planilla/format-date";
import { LoadError } from "@/components/planilla/load-error";
import { getAnnualSummaryAction, setEmployeeLiquidationAction, getEmployeeAnnualDetailAction } from "@/app/actions/planilla";
import { EmployeeAvatar } from "@/components/planilla/employee-avatar";
import { LiquidationDialog } from "@/components/planilla/liquidation-dialog";
import {
  PAYROLL_CATEGORY,
  PAYROLL_CATEGORY_LABEL,
  payrollCategoryTint,
  payrollCategoryTextStyle,
  employeeAccentColor,
  type PayrollCategoryKey,
} from "@/lib/planilla/payroll-colors";

const PROJECTING_STORAGE_KEY = "coronado:planilla-resumen-projecting";

type DetailRow = Awaited<ReturnType<typeof getEmployeeAnnualDetailAction>>[number];

/** Which of Resumen Anual's 6 "Desglose anual por concepto" badges map
 *  to which conceptTotals field / semantic color -- one distinct color
 *  per badge, matching the mockup's own 6-dot legend (Salario, Décimo,
 *  Vacación, Prima Antigüedad, Descuentos, Préstamos each get their
 *  own hue) rather than grouping the three prestaciones under one
 *  color. See payroll-colors.ts's own comment on why this follows the
 *  mockup over the written spec's rougher "Benefits -> one color"
 *  suggestion. */
const CONCEPT_BADGES: {
  key: keyof PayrollEmployeeAnnualSummary["conceptTotals"];
  label: string;
  category: PayrollCategoryKey;
}[] = [
  { key: "salarioCents", label: "Salario Base", category: "salario" },
  { key: "decimoCents", label: "Décimo", category: "decimo" },
  { key: "vacacionCents", label: "Vacaciones", category: "vacacion" },
  { key: "primaCents", label: "Prima Antigüedad", category: "prima" },
  { key: "descuentosCents", label: "Descuentos", category: "descuentos" },
  { key: "prestamosCents", label: "Préstamos", category: "prestamos" },
];

const LEGEND_CATEGORIES: PayrollCategoryKey[] = ["salario", "decimo", "vacacion", "prima", "descuentos", "prestamos"];

const CHART_HEIGHT = 96; // px, tallest real bar

function StatBlock({
  icon: Icon,
  color,
  label,
  value,
  pct,
}: {
  icon: LucideIcon;
  color: string;
  label: string;
  value: string;
  pct?: number;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 size-4 shrink-0" style={{ color }} />
      <div>
        <p className="whitespace-nowrap text-[11px] text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold tabular-nums text-foreground">
          {value}
          {pct !== undefined && <span className="ml-1 text-[11px] font-normal text-muted-foreground">{pct}%</span>}
        </p>
      </div>
    </div>
  );
}

/** The expanded card's monthly bar chart -- real months in the
 *  employee's own accent color (see employeeAccentColor's comment on
 *  why identity color is a separate axis from category color), months
 *  with no data yet a thin dashed placeholder outline.
 *
 *  When "Proyectar próximos meses" is on, a STRICTLY FUTURE month
 *  (never the current or a past one, even if it happens to be real
 *  $0 -- a past empty month is just zero, not something to estimate)
 *  for an active employee gets a projected bar. That projection is
 *  the REAL formula output, not a flat base-salary guess: it fetches
 *  `getEmployeeAnnualDetailAction(employeeId, year, true)` -- the
 *  exact same projection machinery Registro's own projected cells and
 *  EmployeeDetailSheet already use -- so a Décimo/Vacación/Prima
 *  installment month (Abr/Ago/Dic) correctly projects HIGHER than a
 *  regular month instead of flatlining at bare salary. Fetched lazily
 *  (only while this card is expanded AND projecting is on, since
 *  MonthlyBarChart only ever mounts inside an open card), cached per
 *  employee/year so toggling the card open/closed doesn't refetch. */
function MonthlyBarChart({
  row,
  accent,
  projecting,
  year,
}: {
  row: PayrollEmployeeAnnualSummary;
  accent: string;
  projecting: boolean;
  year: number;
}) {
  const canProject = projecting && row.employee.status === "ACTIVE" && row.employee.baseSalaryCents > 0;
  const [projectedDetail, setProjectedDetail] = React.useState<DetailRow[] | null>(null);

  React.useEffect(() => {
    if (!canProject) return;
    let cancelled = false;
    getEmployeeAnnualDetailAction(row.employee.id, year, true).then((data) => {
      if (!cancelled) setProjectedDetail(data);
    });
    return () => {
      cancelled = true;
    };
  }, [canProject, row.employee.id, year]);

  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const monthTotals = months.map((m) => (row.totalsByPeriod[periodKey(m, 1)] ?? 0) + (row.totalsByPeriod[periodKey(m, 2)] ?? 0));
  const current = currentPeriod();
  const currentOrdinal = periodOrdinal(current.year, current.month, current.half);

  function projectedMonthTotal(m: number): number {
    if (!projectedDetail) return 0;
    return projectedDetail.filter((r) => r.month === m).reduce((sum, r) => sum + r.totalCents, 0);
  }

  const allTotals = months.map((m, i) => {
    if (monthTotals[i] > 0) return monthTotals[i];
    const monthIsFuture = periodOrdinal(year, m, 1) > currentOrdinal;
    return canProject && monthIsFuture ? projectedMonthTotal(m) : 0;
  });
  const max = Math.max(...allTotals, 1);

  return (
    <div className="flex items-end gap-2" style={{ height: CHART_HEIGHT + 34 }}>
      {months.map((m, i) => {
        const real = monthTotals[i];
        const monthIsFuture = periodOrdinal(year, m, 1) > currentOrdinal;
        const projected = !real && canProject && monthIsFuture ? projectedMonthTotal(m) : 0;
        const value = real || projected;
        const barHeight = value > 0 ? Math.max((value / max) * CHART_HEIGHT, 10) : 22;
        return (
          <div key={m} className="flex flex-1 flex-col items-center justify-end gap-1">
            {value > 0 && (
              <span className={`text-[10px] font-medium tabular-nums ${real ? "text-foreground" : "italic text-muted-foreground/60"}`}>
                {formatCents(value)}
              </span>
            )}
            <div
              className="w-full rounded-t-sm"
              style={
                real
                  ? { height: barHeight, backgroundColor: accent }
                  : projected
                    ? { height: barHeight, backgroundColor: `color-mix(in oklch, ${accent} 30%, transparent)` }
                    : { height: barHeight, border: "1px dashed var(--border)" }
              }
            />
            <span className="text-[10px] text-muted-foreground">{MONTHS_ES[m - 1].slice(0, 3)}</span>
          </div>
        );
      })}
    </div>
  );
}

export function ResumenView({
  year,
  onYearChange,
  onViewDetail,
}: {
  year: number;
  onYearChange: (year: number) => void;
  onViewDetail: (employeeId: string) => void;
}) {
  const [rows, setRows] = React.useState<PayrollEmployeeAnnualSummary[] | null>(null);
  const [pending, startTransition] = React.useTransition();
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());
  // Terminated employees are real historical data that must stay
  // accessible (never hidden permanently, per CLAUDE.md), but there's
  // no reason to default to showing them every time the page loads.
  const [showInactive, setShowInactive] = React.useState(false);
  const [liquidationEmployee, setLiquidationEmployee] = React.useState<PayrollEmployee | null>(null);
  const [togglingStatusId, setTogglingStatusId] = React.useState<string | null>(null);

  const [projecting, setProjecting] = React.useState(false);
  /* eslint-disable react-hooks/set-state-in-effect -- reads browser-only localStorage post-hydration, see Registro's identical pattern in payroll-client.tsx. */
  React.useEffect(() => {
    if (window.localStorage.getItem(PROJECTING_STORAGE_KEY) === "true") setProjecting(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */
  React.useEffect(() => {
    window.localStorage.setItem(PROJECTING_STORAGE_KEY, String(projecting));
  }, [projecting]);

  const [loadError, setLoadError] = React.useState<string | null>(null);
  const loadSummary = React.useCallback(() => {
    startTransition(async () => {
      try {
        const res = await getAnnualSummaryAction(year);
        if (res.ok) {
          setRows(res.data);
          setLoadError(null);
          setExpanded(new Set());
        } else {
          setLoadError(res.error);
        }
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : "Error de conexión");
      }
    });
  }, [year]);

  React.useEffect(() => {
    loadSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  /** Deliberately separate from LiquidationDialog -- see its own
   *  comment for why. Whether an employee is currently active is its
   *  own fact, changed with its own explicit click, never a
   *  side-effect of marking a liquidación date. */
  async function handleToggleStatus(employee: PayrollEmployee) {
    setTogglingStatusId(employee.id);
    try {
      // Activo -> inactivo: termina hoy. Inactivo -> activo: limpia la fecha.
      await setEmployeeLiquidationAction({
        employeeId: employee.id,
        endDate: employee.status === "ACTIVE" ? new Date().toISOString().slice(0, 10) : null,
      });
      loadSummary();
    } finally {
      setTogglingStatusId(null);
    }
  }

  function toggleExpand(employeeId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(employeeId)) {
        next.delete(employeeId);
      } else {
        next.add(employeeId);
      }
      return next;
    });
  }

  const active = (rows ?? []).filter((r) => r.employee.status === "ACTIVE");
  const inactive = (rows ?? []).filter((r) => r.employee.status === "INACTIVE");

  function renderCard(row: PayrollEmployeeAnnualSummary) {
    const isOpen = expanded.has(row.employee.id);
    const accent = employeeAccentColor(row.employee.sortOrder);
    const pendienteCents = row.totalPaidCents - row.paidCents;
    const monthsPending = 12 - row.monthsPaid;
    const pagadoPct = row.totalPaidCents > 0 ? Math.round((row.paidCents / row.totalPaidCents) * 100) : 0;
    const pendientePct = 100 - pagadoPct;
    const promMensualCents = row.monthsWithActivity > 0 ? Math.round(row.totalPaidCents / row.monthsWithActivity) : 0;

    return (
      <div
        key={row.employee.id}
        className="overflow-hidden rounded-xl border bg-card"
        style={{
          borderLeftWidth: 4,
          borderLeftColor: accent,
          borderTopColor: `color-mix(in oklch, ${accent} 20%, var(--border))`,
          borderRightColor: `color-mix(in oklch, ${accent} 20%, var(--border))`,
          borderBottomColor: `color-mix(in oklch, ${accent} 20%, var(--border))`,
          backgroundColor: `color-mix(in oklch, ${accent} 5%, var(--card))`,
        }}
      >
        <div className="flex flex-wrap items-center gap-4 px-4 py-3">
          <button type="button" className="flex flex-1 flex-wrap items-center gap-4 text-left" onClick={() => toggleExpand(row.employee.id)}>
            <EmployeeAvatar name={row.employee.name} employeeId={row.employee.id} sortOrder={row.employee.sortOrder} size="md" />
            <div className="min-w-[150px]">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">{row.employee.name}</span>
                <Badge variant={row.employee.status === "ACTIVE" ? "success" : "outline"}>
                  {row.employee.status === "ACTIVE" ? "Activo" : "Inactivo"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">Salario base: {formatCents(row.employee.baseSalaryCents)} / mes</p>
              {row.employee.endDate && (
                <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground" onClick={(e) => e.stopPropagation()}>
                  {row.employee.status === "INACTIVE" ? "Liquidado" : "Última liquidación"}: {formatDisplayDate(row.employee.endDate)}
                  {row.employee.liquidationNotes && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <button type="button" title="Ver notas de liquidación" className="text-muted-foreground/70 hover:text-foreground">
                          <FileText className="size-3" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 text-xs">
                        <p className="mb-1 font-medium text-foreground">Notas de liquidación</p>
                        <p className="whitespace-pre-wrap text-muted-foreground">{row.employee.liquidationNotes}</p>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              )}
            </div>

            <div className="ml-auto flex flex-wrap items-center gap-5">
              <StatBlock icon={Coins} color="var(--success)" label="Total Anual" value={formatCents(row.totalPaidCents)} />
              <StatBlock
                icon={CheckCircle2}
                color="var(--chart-1)"
                label={`Pagado (${row.monthsPaid} meses)`}
                value={formatCents(row.paidCents)}
                pct={pagadoPct}
              />
              <StatBlock
                icon={Clock}
                color="var(--chart-3)"
                label={`Pendiente (${monthsPending} meses)`}
                value={formatCents(pendienteCents)}
                pct={pendientePct}
              />
              <StatBlock icon={Gauge} color="var(--chart-5)" label="Prom. mensual" value={formatCents(promMensualCents)} />
            </div>
          </button>

          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              title={row.employee.status === "ACTIVE" ? "Marcar como inactivo" : "Reactivar"}
              disabled={togglingStatusId === row.employee.id}
              onClick={() => handleToggleStatus(row.employee)}
            >
              {row.employee.status === "ACTIVE" ? <UserX className="size-3.5" /> : <UserCheck className="size-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              title={row.employee.endDate ? "Editar liquidación" : "Marcar liquidación"}
              onClick={() => setLiquidationEmployee(row.employee)}
            >
              <LogOut className="size-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="size-7" onClick={() => toggleExpand(row.employee.id)}>
              <ChevronDown className={`size-4 text-muted-foreground transition-transform ${isOpen ? "" : "-rotate-90"}`} />
            </Button>
          </div>
        </div>

        {isOpen && (
          <div className="border-t border-border bg-muted/10 px-4 py-4">
            <MonthlyBarChart row={row} accent={accent} projecting={projecting} year={year} />
            <p className="mb-2 mt-4 text-xs font-medium text-muted-foreground">Desglose anual por concepto</p>
            <div className="flex flex-wrap items-center gap-2">
              {CONCEPT_BADGES.map((b) => {
                const cents = row.conceptTotals[b.key];
                return (
                  <div key={b.key} className="rounded-lg px-3 py-1.5" style={payrollCategoryTint(b.category, 12)}>
                    <p className="text-[11px] font-medium" style={payrollCategoryTextStyle(b.category)}>
                      {b.label}
                    </p>
                    <p className="text-sm font-semibold tabular-nums text-foreground">{formatCents(cents)}</p>
                  </div>
                );
              })}
              <Button variant="outline" size="sm" className="ml-auto" onClick={() => onViewDetail(row.employee.id)}>
                Ver detalle
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
            <BarChart3 className="size-4 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium text-foreground">Resumen Anual</p>
            <p className="text-xs text-muted-foreground">
              Vista anual por empleado. Haz clic en un empleado para ver el desglose mensual y por concepto.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-md border border-border px-1">
            <Button variant="ghost" size="icon" className="size-7" onClick={() => onYearChange(year - 1)}>
              <ChevronLeft className="size-4" />
            </Button>
            <span className="min-w-16 text-center text-sm font-medium text-foreground">{year}</span>
            <Button variant="ghost" size="icon" className="size-7" onClick={() => onYearChange(year + 1)}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
          <Button type="button" variant={projecting ? "default" : "outline"} size="sm" onClick={() => setProjecting((p) => !p)}>
            <TrendingUp className="size-3.5" />
            Proyectar próximos meses
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3">{active.map(renderCard)}</div>

      {inactive.length > 0 && (
        <div className="rounded-lg border border-border">
          <button
            type="button"
            className="flex w-full items-center gap-1.5 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:bg-muted/40"
            onClick={() => setShowInactive((v) => !v)}
          >
            <ChevronDown className={`size-3.5 shrink-0 transition-transform ${showInactive ? "" : "-rotate-90"}`} />
            Empleados que no laboran más ({inactive.length})
          </button>
          {showInactive && <div className="flex flex-col gap-3 border-t border-border bg-muted/10 p-3">{inactive.map(renderCard)}</div>}
        </div>
      )}

      {loadError && <LoadError message={loadError} onRetry={loadSummary} />}
      {pending && !loadError && <p className="text-xs text-muted-foreground">Cargando…</p>}
      {!pending && active.length === 0 && inactive.length === 0 && (
        <p className="text-sm text-muted-foreground">Sin empleados todavía.</p>
      )}

      {(active.length > 0 || inactive.length > 0) && (
        <div className="flex flex-wrap items-center gap-4 border-t border-border pt-3 text-xs text-muted-foreground">
          {LEGEND_CATEGORIES.map((k) => (
            <span key={k} className="flex items-center gap-1.5">
              <span className="size-2 rounded-full" style={{ backgroundColor: PAYROLL_CATEGORY[k].color }} />
              {PAYROLL_CATEGORY_LABEL[k]}
            </span>
          ))}
        </div>
      )}

      {liquidationEmployee && (
        <LiquidationDialog
          employee={liquidationEmployee}
          open={liquidationEmployee !== null}
          onOpenChange={(open) => !open && setLiquidationEmployee(null)}
          onSaved={loadSummary}
        />
      )}
    </div>
  );
}
