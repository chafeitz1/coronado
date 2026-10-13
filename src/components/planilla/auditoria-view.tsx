"use client";

import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ClipboardCheck,
  AlertTriangle,
  AlertOctagon,
  Filter,
  SlidersHorizontal,
} from "lucide-react";

import type { AuditFinding, AuditoriaData, AuditoriaEmployeeRow } from "@/lib/types/planilla";
import { Button } from "@/components/payroll-ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/payroll-ui/popover";
import { MultiSelectFilter, type MultiSelectOption } from "@/components/planilla/multi-select-filter";
import { MONTHS_ES, formatCents } from "@/lib/planilla/payroll-period";
import { PAYROLL_CATEGORY, PAYROLL_CATEGORY_LABEL, type PayrollCategoryKey } from "@/lib/planilla/payroll-colors";
import { getAuditoriaDataAction } from "@/app/actions/planilla";
import { EmployeeAvatar } from "@/components/planilla/employee-avatar";
import { MenuSection, SwitchRow, CheckRow, SaveDefaultLink } from "@/components/planilla/view-menu";

function halfLabel(half: 1 | 2 | undefined): string {
  return half === 1 ? "1ra" : "2da";
}

/** Texto en español de un hallazgo estructurado. */
function findingMessage(f: AuditFinding): string {
  if (f.kind === "gap") {
    return `Sin registros entre ${MONTHS_ES[(f.monthA ?? 1) - 1]} y ${MONTHS_ES[(f.monthB ?? 1) - 1]} ${f.year}.`;
  }
  const when = `${halfLabel(f.half)} quincena de ${MONTHS_ES[(f.month ?? 1) - 1]} ${f.year}`;
  if (f.kind === "negative") return `${when}: el total a pagar es negativo (${formatCents(f.totalCents ?? 0)}).`;
  return `${when}: marcada como pagada pero el total es ${formatCents(f.totalCents ?? 0)}.`;
}

const LEGEND_CATEGORIES: PayrollCategoryKey[] = ["salario", "decimo", "bonos", "descuentos", "descuentoPrestamos", "prestamos"];

/** Which color each of the 6 concept groups reads as -- Prestaciones
 *  bundles Décimo/Vacación/Prima into one group row here (unlike
 *  Resumen Anual's separate badges), so it takes Décimo's gold as its
 *  single representative color. Préstamos & Otros stays neutral gray
 *  (it's a debt ledger, not money paid out). Descuento a Préstamos --
 *  the real deduction side -- gets its own wine-red
 *  (`descuentoPrestamos`, distinct from Descuentos' plain red) per
 *  explicit user request: two red groups need to read as "related but
 *  different" at a glance, not identical or a totally unrelated hue. */
const GROUP_CATEGORY: Record<string, PayrollCategoryKey> = {
  salarios: "salario",
  prestaciones: "decimo",
  bonificaciones: "bonos",
  descuentos: "descuentos",
  prestamos_otros: "prestamos",
  descuento_prestamos: "descuentoPrestamos",
};

/** Static mirror of the 6 real groups `getAuditoriaData` builds --
 *  needed for the "Secciones" show/hide menu, which has to render
 *  before `data` loads (and stay stable even for an employee with 0
 *  groups some year), so it can't just be derived from `data.rows`. */
const GROUP_DEFS: { key: string; label: string }[] = [
  { key: "salarios", label: "Salarios" },
  { key: "prestaciones", label: "Prestaciones" },
  { key: "bonificaciones", label: "Bonificaciones & Extras" },
  { key: "descuentos", label: "Descuentos" },
  { key: "prestamos_otros", label: "Préstamos & Otros" },
  { key: "descuento_prestamos", label: "Descuento a Préstamos" },
];

function defaultVisibleGroups(): Record<string, boolean> {
  const result: Record<string, boolean> = {};
  for (const g of GROUP_DEFS) result[g.key] = true;
  return result;
}

const AUDITORIA_GROUPS_STORAGE_KEY = "coronado.planilla.auditoria.visibleGroups";
const AUDITORIA_PREVIEW_STORAGE_KEY = "coronado.planilla.auditoria.showPrestacionesPreview";
const AUDITORIA_BASE_COMPARISON_STORAGE_KEY = "coronado.planilla.auditoria.showBaseComparison";

/** Same restore-from-localStorage pattern as payroll-client.tsx's
 *  readStoredColumns -- kept outside the component so the effect that
 *  calls it is a plain `if (x) setState(x)` (see that file's comment
 *  for why: reading localStorage has to happen in an effect, not
 *  during render, to avoid a hydration mismatch). Per-group visibility
 *  is a genuinely long-lived preference (the user's stated reason:
 *  Atlas's future "residencia" mode won't need Bonificaciones/
 *  Descuentos at all), so it's persisted the same way Registro's
 *  column visibility is. */
function readStoredVisibleGroups(): Record<string, boolean> | null {
  const raw = window.localStorage.getItem(AUDITORIA_GROUPS_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<Record<string, boolean>>;
    return { ...defaultVisibleGroups(), ...parsed } as Record<string, boolean>;
  } catch {
    return null;
  }
}

/** Given a legend's category color key, find the one group that maps
 *  to it (see GROUP_CATEGORY above -- currently a clean 1:1, one
 *  group per color) so the bottom legend can hide a swatch when its
 *  matching group has been toggled off in "Secciones". */
function groupKeyForCategory(key: PayrollCategoryKey): string | undefined {
  return Object.entries(GROUP_CATEGORY).find(([, cat]) => cat === key)?.[0];
}

/** Row density -- a separate axis from "Nivel de Detalle" below. This
 *  is what "Vista: Comprimida/Expandida" actually means per the
 *  mockup (row size/padding), not expand state -- expand state is now
 *  Nivel de Detalle's job. Comprimida keeps a lot of quincena columns
 *  from making rows feel enormous; Expandida trades density for
 *  legibility. */
type Densidad = "comprimida" | "expandida";
const DENSITY: Record<Densidad, { table: string; head: string; empRow: string; groupRow: string; lineRow: string }> = {
  comprimida: { table: "text-[11px]", head: "py-1", empRow: "py-1", groupRow: "py-0.5", lineRow: "py-0.5" },
  expandida: { table: "text-xs", head: "py-1.5", empRow: "py-1.5", groupRow: "py-1", lineRow: "py-1" },
};

/** How much of each employee's breakdown is expanded by default, and
 *  (for Macro/Quincenal) how the columns themselves collapse.
 *
 *  - Macro: just the employee total row, columns summed to 12 months.
 *    Nobody's looking for quincena-level or group-level detail here,
 *    so both the groups AND the 1Q/2Q split are just noise.
 *  - Quincenal: same as Macro (employee total row only, no groups) but
 *    keeps the real 24 quincena columns -- for "how much per quincena"
 *    without any conceptual breakdown.
 *  - Por concepto: the 6 groups, no line items, 24 quincena columns.
 *  - Micro: groups + every line item, 24 quincena columns (the
 *    mockup's "Quincenas"/"Transacciones" levels collapse into this
 *    one, since Atlas doesn't track a separate transaction ledger
 *    under most line items -- Horas Extras, Bonos, etc. are single
 *    fields per quincena on payroll_entries, not a list of individual
 *    transactions, so a distinct 4th tier there would show fake
 *    detail).
 *
 *  A click on any individual employee/group row still overrides
 *  whichever default a level sets. */
type NivelDetalle = "macro" | "quincenal" | "concepto" | "micro";
const DETAIL_LEVELS: { key: NivelDetalle; label: string }[] = [
  { key: "macro", label: "Macro" },
  { key: "quincenal", label: "Quincenal" },
  { key: "concepto", label: "Por concepto" },
  { key: "micro", label: "Micro" },
];

interface AuditoriaDefaultView {
  vista: Densidad;
  nivel: NivelDetalle;
  visibleGroups: Record<string, boolean>;
  showPrestacionesPreview: boolean;
  showBaseComparison: boolean;
}
const AUDITORIA_PREF_KEY = "coronado.planilla.auditoria.defaultView";

const STATUS_FILTERS: { key: "todos" | "activo" | "inactivo"; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "activo", label: "Activo" },
  { key: "inactivo", label: "Inactivo" },
];

/** Backgrounds for the pinned "Empleado" column. They must be OPAQUE:
 *  the 24 quincena columns scroll underneath, and the old translucent
 *  classes (bg-muted/40, bg-foreground/90 ...) let those numbers show
 *  through the names (Oct 2026 report). Same tints, mixed into the page
 *  background instead of see-through. */
const STICKY_BG: Record<"head" | "muted" | "planilla", React.CSSProperties> = {
  head: { backgroundColor: "color-mix(in oklch, var(--muted) 40%, var(--background))", boxShadow: "1px 0 0 var(--border)" },
  muted: { backgroundColor: "color-mix(in oklch, var(--muted) 30%, var(--background))", boxShadow: "1px 0 0 var(--border)" },
  planilla: { backgroundColor: "color-mix(in oklch, var(--foreground) 90%, var(--background))", boxShadow: "1px 0 0 var(--border)" },
};

function fmtSigned(cents: number): string {
  if (cents < 0) return `(${formatCents(Math.abs(cents))})`;
  return formatCents(cents);
}

/** i is a 0-23 index into a `periods` array, in getEmployeeAnnualDetail's
 *  PERIODS_IN_YEAR order -- see AuditoriaLineItem's doc comment. */
function periodLabel(i: number): { month: number; half: 1 | 2 } {
  return { month: Math.floor(i / 2) + 1, half: ((i % 2) + 1) as 1 | 2 };
}

/** 24 quincenas -> 12 months, summing each month's pair. Only ever
 *  applied to the employee-total row at the Macro level (Macro never
 *  renders groups/line items, so nothing else needs this). */
function toMonthly(periods: number[]): number[] {
  return Array.from({ length: 12 }, (_, m) => periods[m * 2] + periods[m * 2 + 1]);
}

function downloadCsv(data: AuditoriaData, year: number) {
  const header = ["Empleado", ...Array.from({ length: 24 }, (_, i) => {
    const { month, half } = periodLabel(i);
    return `${MONTHS_ES[month - 1].slice(0, 3)} ${half}Q`;
  }), `Total ${year}`];
  const lines = [header.join(",")];
  for (const row of data.rows) {
    const cells = [row.employee.name, ...row.periods.map((v) => (v / 100).toFixed(2)), (row.totalCents / 100).toFixed(2)];
    lines.push(cells.join(","));
  }
  lines.push(
    ["TOTAL GENERAL", ...data.periodTotals.map((v) => (v / 100).toFixed(2)), (data.grandTotalCents / 100).toFixed(2)].join(",")
  );
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `auditoria-planilla-${year}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function AuditoriaView({
  year,
  onYearChange,
  onExportReady,
}: {
  year: number;
  onYearChange: (year: number) => void;
  /** Lets the page-level header's "Exportar" button (next to "Agregar
   *  empleado" -- see payroll-client.tsx) trigger this view's CSV
   *  download without lifting `data` itself up a level. Called with a
   *  ready-to-invoke export function whenever data is loaded, and with
   *  `null` while it isn't (e.g. between property switches). */
  onExportReady?: (exportFn: (() => void) | null) => void;
}) {
  const [data, setData] = React.useState<AuditoriaData | null>(null);
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(new Set());
  const [vista, setVista] = React.useState<Densidad>("comprimida");
  const [nivel, setNivel] = React.useState<NivelDetalle>("concepto");
  const [showInactive, setShowInactive] = React.useState(false);
  const [vistaOpen, setVistaOpen] = React.useState(false);
  const [filtroOpen, setFiltroOpen] = React.useState(false);
  const [employeeFilter, setEmployeeFilter] = React.useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = React.useState<"todos" | "activo" | "inactivo">("todos");
  const [visibleGroups, setVisibleGroups] = React.useState<Record<string, boolean>>(defaultVisibleGroups);
  // "Proyección de prestaciones" -- restores the pre-Round-20 light
  // (accruing)/bold (paid) convention for Décimo/Vacación/Prima,
  // scoped to Auditoría specifically and user-toggleable (unlike its
  // original home in EmployeeDetailSheet, which always showed it).
  // Defaults on since the user asked to have it back; the toggle is
  // there for whenever showing 3 extra "context" values per employee
  // isn't wanted (e.g. a fast scan of only real recorded payouts).
  const [showPrestacionesPreview, setShowPrestacionesPreview] = React.useState(true);
  // "Comparar con Quincena Base" -- an always-visible reference row
  // under every employee's total, showing pure base salary next to
  // the real (post-ajustes) total so the two routinely-different
  // figures the user needs to sanity-check are never more than one
  // glance apart. Defaults on for the same reason as the
  // prestaciones preview above: this IS the point of this screen.
  const [showBaseComparison, setShowBaseComparison] = React.useState(true);

  // "Vista predeterminada" (Oct 2026): the person picks which view
  // Auditoría opens with -- level, density, visible groups and the two
  // overlays -- and saves it; stored in the database (see
  // services/preferences.ts) so it applies on any device.
  const [savedDefault, setSavedDefault] = React.useState<AuditoriaDefaultView | null>(null);
  const [savingDefault, setSavingDefault] = React.useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const applyLevelRef = React.useRef<(level: NivelDetalle, d: AuditoriaData) => void>((_level, _d) => {});
  const nivelRef = React.useRef(nivel);
  const dataRef = React.useRef<AuditoriaData | null>(null);
  React.useEffect(() => {
    nivelRef.current = nivel;
    dataRef.current = data;
  });

  /* eslint-disable react-hooks/set-state-in-effect -- must run post-hydration, not during render, because it reads browser-only localStorage (see readStoredVisibleGroups's comment). */
  React.useEffect(() => {
    const stored = readStoredVisibleGroups();
    if (stored) setVisibleGroups(stored);
    const storedPreview = window.localStorage.getItem(AUDITORIA_PREVIEW_STORAGE_KEY);
    if (storedPreview !== null) setShowPrestacionesPreview(storedPreview === "true");
    const storedBaseComparison = window.localStorage.getItem(AUDITORIA_BASE_COMPARISON_STORAGE_KEY);
    if (storedBaseComparison !== null) setShowBaseComparison(storedBaseComparison === "true");
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */
  React.useEffect(() => {
    window.localStorage.setItem(AUDITORIA_GROUPS_STORAGE_KEY, JSON.stringify(visibleGroups));
  }, [visibleGroups]);
  React.useEffect(() => {
    window.localStorage.setItem(AUDITORIA_PREVIEW_STORAGE_KEY, String(showPrestacionesPreview));
  }, [showPrestacionesPreview]);
  React.useEffect(() => {
    window.localStorage.setItem(AUDITORIA_BASE_COMPARISON_STORAGE_KEY, String(showBaseComparison));
  }, [showBaseComparison]);

  /* eslint-disable react-hooks/set-state-in-effect -- reads browser-only localStorage after hydration */
  React.useEffect(() => {
    let pref: AuditoriaDefaultView | null = null;
    try {
      const raw = window.localStorage.getItem(AUDITORIA_PREF_KEY);
      pref = raw ? (JSON.parse(raw) as AuditoriaDefaultView) : null;
    } catch {
      pref = null;
    }
    if (!pref) return;
    setSavedDefault(pref);
    setVista(pref.vista);
    setNivel(pref.nivel);
    if (pref.visibleGroups) setVisibleGroups(pref.visibleGroups);
    setShowPrestacionesPreview(pref.showPrestacionesPreview);
    setShowBaseComparison(pref.showBaseComparison);
    if (dataRef.current) applyLevelRef.current(pref.nivel, dataRef.current);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const currentViewSnapshot: AuditoriaDefaultView = {
    vista,
    nivel,
    visibleGroups,
    showPrestacionesPreview,
    showBaseComparison,
  };
  const isDefault = savedDefault !== null && JSON.stringify(savedDefault) === JSON.stringify(currentViewSnapshot);
  async function saveAsDefault() {
    setSavingDefault(true);
    try {
      window.localStorage.setItem(AUDITORIA_PREF_KEY, JSON.stringify(currentViewSnapshot));
      setSavedDefault(currentViewSnapshot);
    } finally {
      setSavingDefault(false);
    }
  }

  const applyLevel = React.useCallback((level: NivelDetalle, d: AuditoriaData) => {
    if (level === "macro" || level === "quincenal") {
      setExpanded(new Set());
      setExpandedGroups(new Set());
    } else if (level === "concepto") {
      setExpanded(new Set(d.rows.map((r) => r.employee.id)));
      setExpandedGroups(new Set());
    } else {
      setExpanded(new Set(d.rows.map((r) => r.employee.id)));
      setExpandedGroups(new Set(d.rows.flatMap((r) => r.groups.map((g) => `${r.employee.id}-${g.key}`))));
    }
  }, []);


  React.useEffect(() => {
    applyLevelRef.current = applyLevel;
  }, [applyLevel]);

  React.useEffect(() => {
    getAuditoriaDataAction(year).then((d) => {
      setData(d);
      applyLevel(nivelRef.current, d);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  React.useEffect(() => {
    if (!onExportReady) return;
    if (data) {
      const exportFn = () => downloadCsv(data, year);
      onExportReady(() => exportFn);
    } else {
      onExportReady(null);
    }
    return () => onExportReady(null);
  }, [data, year, onExportReady]);

  function setNivelMode(level: NivelDetalle) {
    setNivel(level);
    if (data) applyLevel(level, data);
  }

  function toggleEmployee(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleGroup(rowKey: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(rowKey)) next.delete(rowKey);
      else next.add(rowKey);
      return next;
    });
  }

  function toggleEmployeeFilter(id: string) {
    setEmployeeFilter((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearFiltros() {
    setEmployeeFilter(new Set());
    setStatusFilter("todos");
  }

  const isMonthly = nivel === "macro";
  const columnCount = isMonthly ? 12 : 24;
  const totalColumns = columnCount + 2; // employee name + trailing total
  const cols = isMonthly ? Array.from({ length: 12 }, (_, i) => i) : Array.from({ length: 24 }, (_, i) => i);
  const d = DENSITY[vista];
  const displayPeriods = (periods: number[]) => (isMonthly ? toMonthly(periods) : periods);

  function renderEmployeeRow(row: AuditoriaEmployeeRow) {
    const isOpen = expanded.has(row.employee.id);
    const visibleRowGroups = row.groups.filter((g) => visibleGroups[g.key] !== false);
    return (
      <React.Fragment key={row.employee.id}>
        <tr className={`cursor-pointer border-b border-border hover:bg-accent/40`} onClick={() => toggleEmployee(row.employee.id)}>
          <td className={`sticky left-0 z-10 bg-background px-2 ${d.empRow}`}>
            <div className="flex items-center gap-1.5">
              <ChevronDown className={`size-3 shrink-0 text-muted-foreground transition-transform ${isOpen ? "" : "-rotate-90"}`} />
              <EmployeeAvatar name={row.employee.name} employeeId={row.employee.id} sortOrder={row.employee.sortOrder} />
              <span className="whitespace-nowrap font-medium text-foreground">{row.employee.name}</span>
            </div>
          </td>
          {displayPeriods(row.periods).map((v, i) => (
            <td key={i} className={`px-1.5 ${d.empRow} text-right tabular-nums text-muted-foreground`}>
              {v !== 0 ? formatCents(v) : "–"}
            </td>
          ))}
          <td className={`px-2 ${d.empRow} text-right font-semibold tabular-nums text-foreground`}>{formatCents(row.totalCents)}</td>
        </tr>
        {showBaseComparison && (
          // Independent of isOpen/nivel -- this is the one thing on
          // the whole screen the user asked to never have to expand
          // for: pure base salary right under the real total, so the
          // two routinely-different figures are always one glance
          // apart. Cells where they actually differ this quincena
          // stay legible (text-foreground/70); identical cells fade
          // out (text-muted-foreground/40) since there's nothing to
          // flag there.
          <tr className="border-b border-border/50 text-[11px]">
            <td className={`sticky left-0 z-10 bg-background pl-8 pr-2 ${d.groupRow} text-muted-foreground italic`}>Quincena Base</td>
            {displayPeriods(row.basePeriods).map((v, i) => {
              const totalV = displayPeriods(row.periods)[i];
              const differs = v !== totalV;
              return (
                <td
                  key={i}
                  className={`px-1.5 ${d.groupRow} text-right italic tabular-nums ${differs ? "text-foreground/70" : "text-muted-foreground/40"}`}
                >
                  {v !== 0 ? formatCents(v) : "–"}
                </td>
              );
            })}
            <td className={`px-2 ${d.groupRow} text-right italic tabular-nums text-muted-foreground/60`}>
              {formatCents(row.basePeriods.reduce((s, v) => s + v, 0))}
            </td>
          </tr>
        )}
        {isOpen && (
          // A little breathing room right under the employee row before
          // its first concept "package" starts.
          <tr aria-hidden style={{ height: 6 }}>
            <td className="sticky left-0 z-10 bg-background p-0" colSpan={totalColumns} />
          </tr>
        )}
        {isOpen &&
          visibleRowGroups.map((g, gi) => {
            const groupKey = `${row.employee.id}-${g.key}`;
            const groupOpen = expandedGroups.has(groupKey);
            const category = GROUP_CATEGORY[g.key];
            const color = PAYROLL_CATEGORY[category].color;
            const borderColor = `color-mix(in oklch, ${color} 38%, transparent)`;
            const headerBg = `color-mix(in oklch, ${color} 10%, var(--card))`;
            const lineBg = `color-mix(in oklch, ${color} 3%, var(--card))`;
            const isLastGroup = gi === visibleRowGroups.length - 1;
            const hasLineItems = groupOpen && g.lineItems.length > 0;
            // The header row is the box's top edge unconditionally; it's
            // also the bottom edge when there are no visible line items.
            const headerBorder: React.CSSProperties = {
              backgroundColor: headerBg,
              borderTop: `1px solid ${borderColor}`,
              borderBottom: hasLineItems ? "none" : `1px solid ${borderColor}`,
            };
            return (
              <React.Fragment key={g.key}>
                <tr className={`cursor-pointer text-[11px] ${d.groupRow}`} onClick={() => toggleGroup(groupKey)}>
                  <td
                    className={`sticky left-0 z-10 pl-8 pr-2 ${d.groupRow} ${hasLineItems ? "rounded-t-md" : "rounded-md"}`}
                    style={{ ...headerBorder, borderLeft: `1px solid ${borderColor}` }}
                  >
                    <div className="flex items-center gap-1">
                      <ChevronDown className={`size-2.5 shrink-0 transition-transform ${groupOpen ? "" : "-rotate-90"}`} style={{ color }} />
                      <span className="whitespace-nowrap font-semibold" style={{ color }}>
                        {g.label}
                      </span>
                    </div>
                  </td>
                  {g.periods.map((v, i) => (
                    <td key={i} className={`px-1.5 ${d.groupRow} text-right font-medium tabular-nums`} style={{ ...headerBorder, color }}>
                      {v !== 0 ? fmtSigned(v) : "–"}
                    </td>
                  ))}
                  <td
                    className={`px-2 ${d.groupRow} text-right font-semibold tabular-nums ${hasLineItems ? "rounded-tr-md" : "rounded-tr-md rounded-br-md"}`}
                    style={{ ...headerBorder, borderRight: `1px solid ${borderColor}`, color }}
                  >
                    {fmtSigned(g.totalCents)}
                  </td>
                </tr>
                {groupOpen &&
                  g.lineItems.map((li, li_i) => {
                    const isLastLine = li_i === g.lineItems.length - 1;
                    const lineBorder: React.CSSProperties = {
                      backgroundColor: lineBg,
                      borderBottom: isLastLine ? `1px solid ${borderColor}` : "none",
                    };
                    return (
                      <tr key={li.key} className={`text-[11px] ${d.lineRow}`}>
                        <td
                          className={`sticky left-0 z-10 pl-14 pr-2 ${d.lineRow} text-foreground/80 ${isLastLine ? "rounded-bl-md" : ""}`}
                          style={{ ...lineBorder, borderLeft: `1px solid ${borderColor}` }}
                        >
                          {li.label}
                        </td>
                        {li.periods.map((v, i) => {
                          // Décimo/Vacación/Prima only: a real payout
                          // (v !== 0) always wins and displays exactly
                          // as before. Otherwise, when the "Proyección
                          // de prestaciones" toggle is on, fall back to
                          // that quincena's live accrual formula --
                          // shown lighter since it's context, never a
                          // real recorded transaction, and never part
                          // of any total (li.totalCents/g.totalCents
                          // stay real-money-only regardless).
                          const preview = li.previewPeriods?.[i];
                          const showingPreview = v === 0 && showPrestacionesPreview && preview !== undefined && preview !== 0;
                          const display = v !== 0 ? v : showingPreview ? preview! : 0;
                          return (
                            <td
                              key={i}
                              className={`px-1.5 ${d.lineRow} text-right tabular-nums ${showingPreview ? "italic text-muted-foreground/50" : "text-foreground/80"}`}
                              style={lineBorder}
                            >
                              {display !== 0 ? fmtSigned(display) : "–"}
                            </td>
                          );
                        })}
                        <td
                          className={`px-2 ${d.lineRow} text-right tabular-nums text-foreground/80 ${isLastLine ? "rounded-br-md" : ""}`}
                          style={{ ...lineBorder, borderRight: `1px solid ${borderColor}` }}
                        >
                          {li.totalCents === 0 && showPrestacionesPreview && li.previewPeriods ? (
                            // Nothing paid this year yet: show what accrued
                            // (italic, like the preview cells) instead of 0.
                            <span className="italic text-muted-foreground/60" title="Acumulado en el año (aún no pagado)">
                              {fmtSigned(li.previewPeriods.reduce((a, b) => a + b, 0))}
                            </span>
                          ) : (
                            fmtSigned(li.totalCents)
                          )}
                        </td>
                      </tr>
                    );
                  })}
                {/* Spacer between one concept "package" and the next, so
                    groups read as separated boxes like the mockup -- not
                    needed after the last group (the employee row's
                    hairline border already closes it off). */}
                {!isLastGroup && (
                  <tr aria-hidden style={{ height: 6 }}>
                    <td className="sticky left-0 z-10 bg-background p-0" colSpan={totalColumns} />
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        {isOpen && (
          <tr aria-hidden className="border-b border-border" style={{ height: 6 }}>
            <td className="sticky left-0 z-10 bg-background p-0" colSpan={totalColumns} />
          </tr>
        )}
      </React.Fragment>
    );
  }

  const employeeOptions: MultiSelectOption[] = (data?.rows ?? []).map((r) => ({ id: r.employee.id, label: r.employee.name }));
  const filtroCount = employeeFilter.size + (statusFilter !== "todos" ? 1 : 0);
  const hiddenGroupCount = GROUP_DEFS.filter((g) => visibleGroups[g.key] === false).length;
  const filteredRows = (data?.rows ?? []).filter((r) => {
    if (employeeFilter.size > 0 && !employeeFilter.has(r.employee.id)) return false;
    if (statusFilter === "activo" && r.employee.status !== "ACTIVE") return false;
    if (statusFilter === "inactivo" && r.employee.status !== "INACTIVE") return false;
    return true;
  });
  const active = filteredRows.filter((r) => r.employee.status === "ACTIVE");
  const inactive = filteredRows.filter((r) => r.employee.status === "INACTIVE");
  // Picking "Inactivo" in Filtros is an explicit request to see those
  // rows -- don't also make the user click the collapsible header to
  // reveal what they just asked to see.
  const effectiveShowInactive = showInactive || statusFilter === "inactivo";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
            <ClipboardCheck className="size-4 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium text-foreground">Auditoría de Planilla {year}</p>
            <p className="text-xs text-muted-foreground">Vista anual detallada por quincena, para verificación y control de datos.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Popover open={filtroOpen} onOpenChange={setFiltroOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="size-3.5" />
                Filtros{filtroCount > 0 ? ` (${filtroCount})` : ""}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72" align="start">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <div className="text-xs font-medium text-muted-foreground">
                    Empleado{employeeFilter.size > 0 ? ` (${employeeFilter.size})` : ""}
                  </div>
                  <MultiSelectFilter
                    options={employeeOptions}
                    selected={employeeFilter}
                    onToggle={toggleEmployeeFilter}
                    placeholder="Buscar empleado…"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="text-xs font-medium text-muted-foreground">Estado</div>
                  <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5 text-xs">
                    {STATUS_FILTERS.map((s) => (
                      <button
                        key={s.key}
                        type="button"
                        onClick={() => setStatusFilter(s.key)}
                        className={`flex-1 rounded px-2 py-1 font-medium transition-colors ${statusFilter === s.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
                {filtroCount > 0 && (
                  <button
                    type="button"
                    onClick={clearFiltros}
                    className="self-start text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>
            </PopoverContent>
          </Popover>

          <Popover open={vistaOpen} onOpenChange={setVistaOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <SlidersHorizontal className="size-3.5" />
                Vistas · {DETAIL_LEVELS.find((l) => l.key === nivel)?.label}
                {hiddenGroupCount > 0 ? ` · ${hiddenGroupCount} oculta${hiddenGroupCount === 1 ? "" : "s"}` : ""}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72" align="start">
              <div className="flex flex-col gap-4">
                <MenuSection title="Nivel de detalle">
                  <div className="grid grid-cols-2 gap-1">
                    {DETAIL_LEVELS.map((l) => (
                      <button
                        key={l.key}
                        type="button"
                        onClick={() => setNivelMode(l.key)}
                        className={`rounded px-2 py-1.5 text-left text-sm font-medium transition-colors ${nivel === l.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}
                      >
                        {l.label}
                      </button>
                    ))}
                  </div>
                </MenuSection>
                <MenuSection title="Opciones">
                  <SwitchRow
                    label="Comprimida"
                    hint="Filas más bajas para ver más en pantalla"
                    checked={vista === "comprimida"}
                    onChange={(on) => setVista(on ? "comprimida" : "expandida")}
                  />
                  <SwitchRow
                    label="Proyección de prestaciones"
                    hint="Muestra en gris lo que se acumula de Décimo/Vacación/Prima en cada quincena"
                    checked={showPrestacionesPreview}
                    onChange={setShowPrestacionesPreview}
                  />
                  <SwitchRow
                    label="Comparar con base"
                    hint="Muestra la Quincena Base debajo del total real de cada empleado"
                    checked={showBaseComparison}
                    onChange={setShowBaseComparison}
                  />
                </MenuSection>
                <MenuSection title="Secciones visibles">
                  {GROUP_DEFS.map((g) => (
                    <CheckRow
                      key={g.key}
                      label={g.label}
                      checked={visibleGroups[g.key] !== false}
                      onChange={(checked) => setVisibleGroups((prev) => ({ ...prev, [g.key]: checked }))}
                    />
                  ))}
                </MenuSection>
                <SaveDefaultLink isDefault={isDefault} saving={savingDefault} onSave={saveAsDefault} />
              </div>
            </PopoverContent>
          </Popover>

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
      </div>

      <p
        className="rounded-lg px-3 py-2 text-xs"
        style={{ backgroundColor: "color-mix(in oklch, var(--chart-1) 8%, transparent)", color: "var(--muted-foreground)" }}
      >
        {isMonthly
          ? "Todos los valores están en USD, consolidados por mes. Cambia a Quincenal, Por concepto o Micro para ver el desglose por quincena."
          : "Todos los valores están en USD, desglosados por 1ra y 2da quincena de cada mes."}
      </p>

      {data && data.findings.length > 0 && (
        <div className="flex flex-col gap-1 rounded-lg border border-border bg-card p-3">
          <p className="text-xs font-medium text-foreground">Hallazgos de auditoría ({data.findings.length})</p>
          {data.findings.map((f, i) => (
            <div key={i} className="flex items-start gap-1.5 text-xs">
              {f.severity === "error" ? (
                <AlertOctagon className="mt-0.5 size-3.5 shrink-0 text-destructive" />
              ) : (
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" style={{ color: "var(--chart-3)" }} />
              )}
              <span className="text-muted-foreground">
                <span className="font-medium text-foreground">{f.employeeName}:</span> {findingMessage(f)}
              </span>
            </div>
          ))}
        </div>
      )}

      {!data ? (
        <p className="text-xs text-muted-foreground">Cargando…</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className={`w-full ${isMonthly ? "min-w-[1200px]" : "min-w-[2400px]"} ${d.table}`} style={{ borderCollapse: "separate", borderSpacing: 0 }}>
            <thead>
              {isMonthly ? (
                <tr className="border-b border-border bg-muted/40 text-muted-foreground">
                  <th className={`sticky left-0 z-10 px-2 ${d.head} text-left font-medium`} style={STICKY_BG.head}>Empleado</th>
                  {MONTHS_ES.map((m, i) => (
                    <th key={i} className={`border-l border-border px-1.5 ${d.head} text-center font-medium`}>
                      {m.slice(0, 3)}
                    </th>
                  ))}
                  <th className={`px-2 ${d.head} text-right font-medium`}>Total {year}</th>
                </tr>
              ) : (
                <>
                  <tr className="border-b border-border bg-muted/40 text-muted-foreground">
                    <th rowSpan={2} className={`sticky left-0 z-10 px-2 ${d.head} text-left align-bottom font-medium`} style={STICKY_BG.head}>
                      Empleado
                    </th>
                    {MONTHS_ES.map((m, i) => (
                      <th key={i} colSpan={2} className={`border-l border-border px-1.5 ${d.head} text-center font-medium`}>
                        {m.slice(0, 3)}
                      </th>
                    ))}
                    <th rowSpan={2} className={`px-2 ${d.head} text-right align-bottom font-medium`}>
                      Total {year}
                    </th>
                  </tr>
                  <tr className="border-b border-border bg-muted/40 text-muted-foreground">
                    {cols.map((i) => (
                      <th key={i} className={`px-1.5 ${d.head} text-center font-normal ${i % 2 === 0 ? "border-l border-border" : ""}`}>
                        {i % 2 === 0 ? "1Q" : "2Q"}
                      </th>
                    ))}
                  </tr>
                </>
              )}
            </thead>
            <tbody>
              <tr className="border-b-2 border-border bg-foreground/90 text-background">
                <td className={`sticky left-0 z-10 px-2 ${d.empRow} font-semibold uppercase tracking-wide`} style={STICKY_BG.planilla}>Total Planilla</td>
                {displayPeriods(data.periodTotals).map((v, i) => (
                  <td key={i} className={`px-1.5 ${d.empRow} text-right tabular-nums`}>
                    {formatCents(v)}
                  </td>
                ))}
                <td className={`px-2 ${d.empRow} text-right font-semibold tabular-nums`}>{formatCents(data.grandTotalCents)}</td>
              </tr>
            </tbody>
            <tbody>{active.map(renderEmployeeRow)}</tbody>
            {inactive.length > 0 && (
              <tbody>
                <tr
                  className="cursor-pointer border-b border-border bg-muted/30 hover:bg-muted/50"
                  onClick={() => setShowInactive((v) => !v)}
                >
                  <td colSpan={totalColumns} className={`sticky left-0 z-10 px-2 ${d.empRow}`} style={STICKY_BG.muted}>
                    <span className="flex items-center gap-1.5 font-semibold uppercase tracking-wide text-muted-foreground">
                      <ChevronDown className={`size-3 shrink-0 transition-transform ${effectiveShowInactive ? "" : "-rotate-90"}`} />
                      Empleados que no laboran más ({inactive.length})
                    </span>
                  </td>
                </tr>
                {effectiveShowInactive && inactive.map(renderEmployeeRow)}
              </tbody>
            )}
            <tfoot>
              <tr className="border-t-2 border-border bg-muted/30 font-semibold text-foreground">
                <td className={`sticky left-0 z-10 px-2 ${d.empRow}`} style={STICKY_BG.muted}>Total General</td>
                {displayPeriods(data.periodTotals).map((v, i) => (
                  <td key={i} className={`px-1.5 ${d.empRow} text-right tabular-nums`}>
                    {formatCents(v)}
                  </td>
                ))}
                <td className={`px-2 ${d.empRow} text-right tabular-nums`}>{formatCents(data.grandTotalCents)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {data && data.rows.length > 0 && (
        <div className="flex flex-wrap items-center gap-4 border-t border-border pt-3 text-xs text-muted-foreground">
          {LEGEND_CATEGORIES.filter((k) => {
            const gk = groupKeyForCategory(k);
            return !gk || visibleGroups[gk] !== false;
          }).map((k) => (
            <span key={k} className="flex items-center gap-1.5">
              <span className="size-2 rounded-full" style={{ backgroundColor: PAYROLL_CATEGORY[k].color }} />
              {k === "decimo" ? "Prestaciones" : PAYROLL_CATEGORY_LABEL[k]}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
