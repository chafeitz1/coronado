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
import { MONTHS_ES, currentPeriod, periodOrdinal, formatCents } from "@/lib/planilla/payroll-period";
import { formatDisplayDate } from "@/lib/planilla/format-date";
import { setEmployeeLiquidationAction, getEmployeeAnnualDetailAction } from "@/app/actions/planilla";
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

const SEGMENTS: { key: "salario" | "decimo" | "vacacion" | "prima"; label: string; category: PayrollCategoryKey }[] = [
  { key: "salario", label: "Salario", category: "salario" },
  { key: "decimo", label: "Décimo", category: "decimo" },
  { key: "vacacion", label: "Vacación", category: "vacacion" },
  { key: "prima", label: "Prima", category: "prima" },
];

/** Gráfica de barras apiladas por mes: salario (base + extras − descuentos)
 *  en su color y, encima, décimo, vacación y prima cuando se pagaron ese mes.
 *  Al pasar el mouse (o tocar) una barra sale el desglose completo. El
 *  descuento de préstamo y los préstamos otorgados se muestran aparte, en el
 *  detalle, para no mezclarlos con lo que gana el empleado.
 *
 *  Con "Proyectar próximos meses", un mes FUTURO sin datos reales se dibuja
 *  con una barra tenue a partir de la misma fórmula que usa Registro. */
function MonthlyBarChart({
  row,
  projecting,
  year,
}: {
  row: PayrollEmployeeAnnualSummary;
  accent?: string;
  projecting: boolean;
  year: number;
}) {
  const canProject = projecting && row.employee.status === "ACTIVE" && row.employee.baseSalaryCents > 0;
  const [projectedDetail, setProjectedDetail] = React.useState<DetailRow[] | null>(null);
  const [hover, setHover] = React.useState<number | null>(null);

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

  const current = currentPeriod();
  const currentOrdinal = periodOrdinal(current.year, current.month, current.half);

  const bars = row.monthly.map((mb) => {
    const salario = mb.baseCents + mb.extrasCents - mb.descuentosCents;
    const gross = Math.max(salario, 0) + mb.decimoCents + mb.vacacionCents + mb.primaCents;
    const monthIsFuture = periodOrdinal(year, mb.month, 1) > currentOrdinal;
    const projected =
      !mb.hasEntry && canProject && monthIsFuture && projectedDetail
        ? projectedDetail.filter((r) => r.month === mb.month).reduce((sum, r) => sum + r.totalCents, 0)
        : 0;
    return { mb, salario, gross, projected };
  });
  const max = Math.max(...bars.map((b) => Math.max(b.gross, b.projected)), 1);
  const segValue = (b: (typeof bars)[number], key: (typeof SEGMENTS)[number]["key"]) =>
    key === "salario" ? Math.max(b.salario, 0) : key === "decimo" ? b.mb.decimoCents : key === "vacacion" ? b.mb.vacacionCents : b.mb.primaCents;

  return (
    <div>
      <div className="flex items-end gap-2" style={{ height: CHART_HEIGHT + 34 }}>
        {bars.map((b) => {
          const active = hover === b.mb.month;
          return (
            <div
              key={b.mb.month}
              className="relative flex flex-1 flex-col items-center justify-end gap-1"
              onMouseEnter={() => setHover(b.mb.month)}
              onMouseLeave={() => setHover((h) => (h === b.mb.month ? null : h))}
              onClick={() => setHover((h) => (h === b.mb.month ? null : b.mb.month))}
            >
              {active && <BarTooltip b={b} year={year} />}
              {(b.gross > 0 || b.projected > 0) && (
                <span className={`text-[10px] font-medium tabular-nums ${b.gross ? "text-foreground" : "italic text-muted-foreground/60"}`}>
                  {formatCents(b.gross || b.projected)}
                </span>
              )}
              {b.gross > 0 ? (
                <div className="flex w-full flex-col-reverse overflow-hidden rounded-t-sm" style={{ height: Math.max((b.gross / max) * CHART_HEIGHT, 10) }}>
                  {SEGMENTS.map((seg) => {
                    const v = segValue(b, seg.key);
                    if (v <= 0) return null;
                    return <div key={seg.key} style={{ flex: v, backgroundColor: PAYROLL_CATEGORY[seg.category].color }} />;
                  })}
                </div>
              ) : b.projected > 0 ? (
                <div
                  className="w-full rounded-t-sm"
                  style={{ height: Math.max((b.projected / max) * CHART_HEIGHT, 10), backgroundColor: `color-mix(in oklch, ${PAYROLL_CATEGORY.salario.color} 30%, transparent)` }}
                />
              ) : (
                <div className="w-full rounded-t-sm" style={{ height: 22, border: "1px dashed var(--border)" }} />
              )}
              <span className={`text-[10px] ${active ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{MONTHS_ES[b.mb.month - 1].slice(0, 3)}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
        {SEGMENTS.map((seg) => (
          <span key={seg.key} className="flex items-center gap-1">
            <span className="size-2 rounded-sm" style={{ backgroundColor: PAYROLL_CATEGORY[seg.category].color }} />
            {seg.label}
          </span>
        ))}
        <span className="ml-auto">Pasa el mouse (o toca) una barra para ver el detalle del mes.</span>
      </div>
    </div>
  );
}

function BarTooltip({ b, year }: { b: { mb: PayrollEmployeeAnnualSummary["monthly"][number]; salario: number; gross: number }; year: number }) {
  const { mb } = b;
  const line = (label: string, value: number, opts?: { color?: PayrollCategoryKey; strong?: boolean; sign?: "-" | "+" }) => (
    <div className={`flex items-center justify-between gap-4 ${opts?.strong ? "border-t border-border pt-1 font-semibold" : ""}`}>
      <span className="flex items-center gap-1.5 text-muted-foreground">
        {opts?.color && <span className="size-2 rounded-sm" style={{ backgroundColor: PAYROLL_CATEGORY[opts.color].color }} />}
        {label}
      </span>
      <span className="tabular-nums text-foreground">
        {opts?.sign === "-" ? "−" : ""}
        {formatCents(Math.abs(value))}
      </span>
    </div>
  );
  return (
    <div className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 w-56 -translate-x-1/2 rounded-lg border border-border bg-popover p-2.5 text-[11px] shadow-lg">
      <p className="mb-1 text-xs font-semibold text-foreground">
        {MONTHS_ES[mb.month - 1]} {year}
      </p>
      {!mb.hasEntry ? (
        <p className="text-muted-foreground">Sin quincenas registradas este mes.</p>
      ) : (
        <div className="flex flex-col gap-0.5">
          {line("Quincenas (salario base)", mb.baseCents, { color: "salario" })}
          {mb.extrasCents > 0 && line("Extras / bonos", mb.extrasCents, { color: "bonos" })}
          {mb.descuentosCents > 0 && line("Descuentos varios", mb.descuentosCents, { color: "descuentos", sign: "-" })}
          {mb.decimoCents > 0 && line("Décimo", mb.decimoCents, { color: "decimo" })}
          {mb.vacacionCents > 0 && line("Vacación", mb.vacacionCents, { color: "vacacion" })}
          {mb.primaCents > 0 && line("Prima de antigüedad", mb.primaCents, { color: "prima" })}
          {line("Total devengado", b.gross, { strong: true })}
          {mb.prestamoDescuentoCents > 0 && line("Descuento de préstamo", mb.prestamoDescuentoCents, { color: "descuentoPrestamos", sign: "-" })}
          {line("Pagado (neto)", mb.netCents, { strong: true })}
        </div>
      )}
      {mb.prestamoOtorgadoCents > 0 && (
        <div className="mt-1.5 border-t border-border pt-1.5">{line("Préstamo otorgado (no es pago)", mb.prestamoOtorgadoCents, { color: "prestamos" })}</div>
      )}
    </div>
  );
}

export function ResumenView({
  rows,
  year,
  onYearChange,
  onViewDetail,
  onRefresh,
}: {
  rows: PayrollEmployeeAnnualSummary[];
  year: number;
  onYearChange: (year: number) => void;
  onViewDetail: (employeeId: string) => void;
  /** Recarga los datos de la página (router.refresh). */
  onRefresh: () => void;
}) {
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
      onRefresh();
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

  const active = rows.filter((r) => r.employee.status === "ACTIVE");
  const inactive = rows.filter((r) => r.employee.status === "INACTIVE");

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
            <MonthlyBarChart row={row} projecting={projecting} year={year} />
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

      {active.length > 0 && (
        <div className="overflow-hidden rounded-lg border" style={{ borderColor: "color-mix(in oklch, var(--success) 40%, var(--border))" }}>
          <div
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wide"
            style={{ backgroundColor: "color-mix(in oklch, var(--success) 14%, var(--card))", color: "var(--success)" }}
          >
            <span className="size-2 rounded-full" style={{ backgroundColor: "var(--success)" }} />
            Empleados activos ({active.length})
          </div>
          <div className="flex flex-col gap-3 p-3">{active.map(renderCard)}</div>
        </div>
      )}

      {inactive.length > 0 && (
        <div className="overflow-hidden rounded-lg border" style={{ borderColor: "color-mix(in oklch, var(--payroll-vacacion) 45%, var(--border))" }}>
          <button
            type="button"
            className="flex w-full items-center gap-1.5 px-3 py-2 text-xs font-semibold uppercase tracking-wide hover:brightness-95"
            style={{ backgroundColor: "color-mix(in oklch, var(--payroll-vacacion) 18%, var(--card))", color: "color-mix(in oklch, var(--payroll-vacacion) 55%, black)" }}
            onClick={() => setShowInactive((v) => !v)}
          >
            <ChevronDown className={`size-3.5 shrink-0 transition-transform ${showInactive ? "" : "-rotate-90"}`} />
            Empleados que ya no laboran ({inactive.length})
          </button>
          {showInactive && <div className="flex flex-col gap-3 border-t border-border bg-muted/10 p-3">{inactive.map(renderCard)}</div>}
        </div>
      )}

      {active.length === 0 && inactive.length === 0 && (
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
          onSaved={onRefresh}
        />
      )}
    </div>
  );
}
