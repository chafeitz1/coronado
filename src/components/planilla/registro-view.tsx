"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, Copy, Wallet, Banknote, Award, TrendingDown, CalendarClock, Gift, SlidersHorizontal } from "lucide-react";

import type { PayrollEmployee, PaymentMethod, PayrollPeriodTotal } from "@/lib/types/planilla";
import { Button } from "@/components/payroll-ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/payroll-ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/payroll-ui/popover";
import { MONTHS_ES, currentPeriod, nextPeriod, formatCents } from "@/lib/planilla/payroll-period";
import {
  getRegistroAction,
  upsertPayrollEntryAction,
  upsertPayrollQuantityFieldAction,
  duplicatePreviousPeriodAction,
} from "@/app/actions/planilla";
import { COLUMN_DEFS, QUANTITY_FIELD_META, type ColumnKey, type FieldKey } from "./registro-columns";
import { PAYROLL_CATEGORY, type PayrollCategoryKey } from "@/lib/planilla/payroll-colors";
import { PayrollKpiCard } from "./payroll-kpi-card";
import { EmployeeAvatar } from "./employee-avatar";
import { PayBenefitsDialog } from "./pay-benefits-dialog";
import { MenuSection, SwitchRow, CheckRow, SaveDefaultLink } from "./view-menu";

/** A quincena's actual pay date -- the 15th for the 1st half, the
 *  month's last day for the 2nd -- used only for the "Próximo pago"
 *  KPI card's date label. */
function periodPayDate(p: { year: number; month: number; half: 1 | 2 }): Date {
  return p.half === 1 ? new Date(p.year, p.month - 1, 15) : new Date(p.year, p.month, 0);
}

function formatPayDate(d: Date): string {
  return d.toLocaleDateString("es-PA", { day: "numeric", month: "short", year: "numeric" });
}

/** Column header tint -- same category colors Auditoría already uses
 *  (see registro-columns.ts's COLUMN_DEFS comment), applied as a soft
 *  translucent wash (color-mix against transparent) over the header
 *  row's existing bg-muted/40, plus colored label text. Undefined
 *  category (Método/Pagado) renders with no extra style, unchanged. */
function fieldHeaderStyle(category: PayrollCategoryKey | undefined, minWidth: number, sober = false): React.CSSProperties {
  if (!category || sober) return { minWidth };
  const color = PAYROLL_CATEGORY[category].color;
  return { minWidth, backgroundColor: `color-mix(in oklch, ${color} 14%, transparent)`, color };
}

/** Same idea for a data cell, much lighter (4%) so the number stays
 *  the visual focus and the tint just reads as "this column belongs
 *  to that category" while scanning down the table. */
function fieldCellStyle(category: PayrollCategoryKey | undefined, minWidth: number, sober = false): React.CSSProperties {
  if (!category || sober) return { minWidth };
  const color = PAYROLL_CATEGORY[category].color;
  return { minWidth, backgroundColor: `color-mix(in oklch, ${color} 4%, transparent)` };
}

/** Quantity columns (Horas/Días Extra, Horas/Días Descontados) need
 *  more room than a plain dollar input -- a qty+unit row plus the
 *  computed-amount row beneath it -- so they get a wider floor than
 *  every other field column. Without an explicit min-width, the
 *  browser's table auto-layout let these wider cells win space at the
 *  other columns' expense once they were added, crushing plain ones
 *  like Base down to a couple of visible digits. */
function fieldMinWidth(c: { key: FieldKey }): number {
  return QUANTITY_FIELD_META[c.key] ? 96 : 88;
}

const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  yappy: "Yappy",
  cheque: "Cheque",
};

interface Row {
  employee: PayrollEmployee;
  total: PayrollPeriodTotal;
}

/** Comprimida: the green (Bonificaciones), red (Descuentos) and
 *  Prestaciones columns each collapse into ONE read-only total -- the
 *  person asked for a summarized view (Oct 2026). Editing those
 *  individual pieces stays in Expandida. */
type RegistroMode = "expandida" | "comprimida";
/** Sobria: same table without the category color washes. */
type RegistroColorMode = "color" | "sobria";
interface RegistroDefaultView {
  mode: RegistroMode;
  colorMode: RegistroColorMode;
  visibleColumns?: Record<ColumnKey, boolean>;
}
const REGISTRO_PREF_KEY = "coronado:planilla-registro-default-view";

function readStoredView(): RegistroDefaultView | null {
  try {
    const raw = window.localStorage.getItem(REGISTRO_PREF_KEY);
    return raw ? (JSON.parse(raw) as RegistroDefaultView) : null;
  } catch {
    return null;
  }
}

const COMPACT_GROUPS: { key: string; label: string; category: PayrollCategoryKey; fields: FieldKey[]; sign: 1 | -1 }[] = [
  {
    key: "bonificaciones",
    label: "Bonificaciones",
    category: "bonos",
    fields: ["extraHoursCents", "extraDaysCents", "bonusCents", "diasLibresCents"],
    sign: 1,
  },
  {
    key: "descuentos",
    label: "Descuentos totales",
    category: "descuentos",
    fields: ["horasDescontadasCents", "diasDescontadosCents", "otherDeductionCents"],
    sign: -1,
  },
  {
    key: "prestaciones",
    label: "Prestaciones",
    category: "decimo",
    fields: ["decimoPaidCents", "vacationPaidCents", "primaAntiguedadPaidCents"],
    sign: 1,
  },
];


/** visibleColumns is owned by PayrollClient (persisted to localStorage
 *  there), not this component, so the chosen set survives switching to
 *  Resumen Anual and back — this view would otherwise unmount when its
 *  TabsContent goes inactive and reset to the defaults on remount. */
export function RegistroView({
  employees,
  visibleColumns,
  onVisibleColumnsChange,
  onViewDetail,
  initialRegistro,
}: {
  employees: PayrollEmployee[];
  visibleColumns: Record<ColumnKey, boolean>;
  onVisibleColumnsChange: (columns: Record<ColumnKey, boolean>) => void;
  onViewDetail?: (employeeId: string) => void;
  /** Quincena ya cargada en el servidor (evita un viaje al abrir la página). */
  initialRegistro?: { period: { year: number; month: number; half: 1 | 2 }; rows: Row[] } | null;
}) {
  const [period, setPeriod] = React.useState(() => currentPeriod());
  const [rows, setRows] = React.useState<Row[] | null>(() =>
    initialRegistro &&
    initialRegistro.period.year === currentPeriod().year &&
    initialRegistro.period.month === currentPeriod().month &&
    initialRegistro.period.half === currentPeriod().half
      ? initialRegistro.rows
      : null
  );
  const skipFirstLoad = React.useRef(rows !== null);
  const [pending, startTransition] = React.useTransition();
  const [duplicating, setDuplicating] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [payBenefitsFor, setPayBenefitsFor] = React.useState<Row | null>(null);
  const [mode, setMode] = React.useState<RegistroMode>("expandida");
  const [colorMode, setColorMode] = React.useState<RegistroColorMode>("color");
  const [savedDefault, setSavedDefault] = React.useState<RegistroDefaultView | null>(null);
  const [savingDefault, setSavingDefault] = React.useState(false);
  const sober = colorMode === "sobria";

  // Apply the saved default view once, on mount (per browser — no server
  // preferences table in Coronado).
  /* eslint-disable react-hooks/set-state-in-effect -- reads browser-only localStorage after hydration */
  React.useEffect(() => {
    const pref = readStoredView();
    if (!pref) return;
    setSavedDefault(pref);
    setMode(pref.mode);
    setColorMode(pref.colorMode);
    if (pref.visibleColumns) onVisibleColumnsChange({ ...visibleColumns, ...pref.visibleColumns });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount only
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function saveAsDefault() {
    setSavingDefault(true);
    const pref: RegistroDefaultView = { mode, colorMode, visibleColumns };
    try {
      window.localStorage.setItem(REGISTRO_PREF_KEY, JSON.stringify(pref));
      setSavedDefault(pref);
    } catch {
      setSaveError("No se pudo guardar la vista predeterminada.");
    } finally {
      setSavingDefault(false);
    }
  }
  const isDefault =
    savedDefault !== null &&
    savedDefault.mode === mode &&
    savedDefault.colorMode === colorMode &&
    JSON.stringify(savedDefault.visibleColumns ?? null) === JSON.stringify(visibleColumns);

  // Only the LATEST request may update the table. Before (Oct 2026 bug):
  // flipping quincenas quickly let an older, slower load land last, so
  // e.g. "2da Quincena Sep" showed the 1ra's Base values -- numbers that
  // looked entered but weren't saved for that quincena, so they never
  // added up.
  const loadSeq = React.useRef(0);
  const load = React.useCallback(() => {
    const seq = ++loadSeq.current;
    startTransition(async () => {
      const data = await getRegistroAction(period.year, period.month, period.half);
      if (seq === loadSeq.current) setRows(data);
    });
  }, [period]);

  /** Every save goes through here so a failure is visible instead of
   *  silently leaving a number on screen that isn't in the database. */
  async function runSave(fn: () => Promise<{ registro?: Row[] } | unknown>) {
    setSaveError(null);
    const seq = ++loadSeq.current;
    try {
      const res = (await fn()) as { registro?: Row[] } | undefined;
      // La acción devuelve la quincena recalculada: se pinta sin recargar.
      // Si cambió de quincena mientras tanto, `seq` ya no coincide y se ignora.
      if (res?.registro) {
        if (seq === loadSeq.current) setRows(res.registro);
        return;
      }
    } catch (err) {
      console.error("payroll save failed", err);
      setSaveError("No se pudo guardar el último cambio. Revisa la conexión e intenta de nuevo.");
    }
    load();
  }

  React.useEffect(() => {
    if (skipFirstLoad.current) {
      skipFirstLoad.current = false;
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period.year, period.month, period.half]);

  function shiftPeriod(direction: -1 | 1) {
    setPeriod((p) => {
      if (direction === 1) {
        if (p.half === 1) return { ...p, half: 2 };
        if (p.month === 12) return { year: p.year + 1, month: 1, half: 1 };
        return { year: p.year, month: p.month + 1, half: 1 };
      }
      if (p.half === 2) return { ...p, half: 1 };
      if (p.month === 1) return { year: p.year - 1, month: 12, half: 2 };
      return { year: p.year, month: p.month - 1, half: 2 };
    });
  }

  async function saveField(employeeId: string, field: FieldKey, value: string) {
    const cents = Math.round(parseFloat(value || "0") * 100);
    await runSave(() =>
      upsertPayrollEntryAction({
        employeeId,
        periodYear: period.year,
        periodMonth: period.month,
        periodHalf: period.half,
        [field]: cents,
      })
    );
  }

  /** For the four qty-driven columns (Horas/Días Extra, Horas/Días
   *  Descontados) -- the server derives the dollar amount from the
   *  employee's current rate and stores both, see actions.ts. */
  async function saveQuantityField(
    employeeId: string,
    field: "extraHours" | "extraDays" | "horasDescontadas" | "diasDescontados",
    value: string
  ) {
    const quantity = parseFloat(value || "0");
    await runSave(() =>
      upsertPayrollQuantityFieldAction({
        employeeId,
        periodYear: period.year,
        periodMonth: period.month,
        periodHalf: period.half,
        field,
        quantity,
      })
    );
  }

  async function savePaymentMethod(employeeId: string, paymentMethod: PaymentMethod) {
    await runSave(() =>
      upsertPayrollEntryAction({
        employeeId,
        periodYear: period.year,
        periodMonth: period.month,
        periodHalf: period.half,
        paymentMethod,
      })
    );
  }

  async function togglePaid(employeeId: string, paid: boolean) {
    await runSave(() =>
      upsertPayrollEntryAction({
        employeeId,
        periodYear: period.year,
        periodMonth: period.month,
        periodHalf: period.half,
        paid,
      })
    );
  }

  async function handleDuplicate() {
    setDuplicating(true);
    try {
      await duplicatePreviousPeriodAction(period.year, period.month, period.half);
    } catch {
      setSaveError("No se pudo duplicar la quincena anterior.");
    } finally {
      load();
      setDuplicating(false);
    }
  }

  if (employees.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">
        No hay personal activo. Agrega a alguien con rol «staff» en el Directorio para empezar a registrar pagos.
      </div>
    );
  }

  const allFieldColumns = COLUMN_DEFS.filter(
    (c): c is { key: FieldKey; label: string; category?: PayrollCategoryKey } =>
      c.key !== "paymentMethod" && c.key !== "paid" && visibleColumns[c.key]
  );
  const compact = mode === "comprimida";
  // In Comprimida only Base stays an editable column; the rest of the
  // money columns are replaced by the three group totals.
  const fieldColumns = compact ? allFieldColumns.filter((c) => c.key === "basePayCents") : allFieldColumns;
  const compactGroups = compact ? COMPACT_GROUPS : [];
  const visibleCount =
    1 +
    fieldColumns.length +
    compactGroups.length +
    (visibleColumns.paymentMethod ? 1 : 0) +
    (visibleColumns.paid ? 1 : 0);

  // KPI row -- Registro's "executive summary" for the currently viewed
  // quincena, per the redesign spec. Deliberately derived from the
  // same `rows` the table below renders (never a separate query), so
  // these cards can never drift from what the grid itself shows.
  const totalCents = (rows ?? []).reduce((sum, r) => sum + r.total.totalCents, 0);
  const cashCents = (rows ?? []).reduce(
    (sum, r) => sum + ((r.total.entry?.paymentMethod ?? "efectivo") === "efectivo" ? r.total.totalCents : 0),
    0
  );
  const decimoCents = (rows ?? []).reduce((sum, r) => sum + (r.total.entry?.decimoPaidCents ?? 0), 0);
  const descuentosCents = (rows ?? []).reduce(
    (sum, r) =>
      sum +
      (r.total.entry?.horasDescontadasCents ?? 0) +
      (r.total.entry?.diasDescontadosCents ?? 0) +
      (r.total.entry?.otherDeductionCents ?? 0),
    0
  );
  const pct = (part: number) => (totalCents > 0 ? `${((part / totalCents) * 100).toFixed(1)}% del total` : "—");
  const upcoming = nextPeriod(period);

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <PayrollKpiCard
          icon={Wallet}
          label="Total a Pagar"
          value={formatCents(totalCents)}
          sublabel={`${(rows ?? []).length} empleados`}
          color="var(--success)"
        />
        <PayrollKpiCard
          icon={Banknote}
          label="Pago en Efectivo"
          value={formatCents(cashCents)}
          sublabel={pct(cashCents)}
          category="salario"
        />
        <PayrollKpiCard
          icon={Award}
          label="Décimo del período"
          value={formatCents(decimoCents)}
          sublabel={pct(decimoCents)}
          category="decimo"
        />
        <PayrollKpiCard
          icon={TrendingDown}
          label="Descuentos del período"
          value={formatCents(descuentosCents)}
          sublabel={pct(descuentosCents)}
          category="descuentos"
        />
        <PayrollKpiCard
          icon={CalendarClock}
          label="Próximo pago"
          value={formatPayDate(periodPayDate(upcoming))}
          sublabel={upcoming.half === 1 ? "1ra Quincena" : "2da Quincena"}
          color="var(--chart-5)"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-md border border-border px-1">
          <Button variant="ghost" size="icon" className="size-7" onClick={() => shiftPeriod(-1)}>
            <ChevronLeft className="size-4" />
          </Button>
          <span className="min-w-40 text-center text-sm font-medium text-foreground">
            {MONTHS_ES[period.month - 1]} {period.year} · {period.half === 1 ? "1ra Quincena" : "2da Quincena"}
          </span>
          <Button variant="ghost" size="icon" className="size-7" onClick={() => shiftPeriod(1)}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={handleDuplicate} disabled={duplicating}>
          <Copy className="size-3.5" />
          Duplicar quincena anterior
        </Button>

        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="ml-auto">
              <SlidersHorizontal className="size-3.5" />
              Vistas
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64" align="end">
            <div className="flex flex-col gap-4">
              <MenuSection title="Vista">
                <SwitchRow
                  label="Comprimida"
                  hint="Junta bonificaciones, descuentos y prestaciones en una columna cada una"
                  checked={mode === "comprimida"}
                  onChange={(on) => setMode(on ? "comprimida" : "expandida")}
                />
                <SwitchRow
                  label="Sobria (sin colores)"
                  checked={colorMode === "sobria"}
                  onChange={(on) => setColorMode(on ? "sobria" : "color")}
                />
              </MenuSection>
              <MenuSection title="Columnas">
                <div className="flex max-h-56 flex-col overflow-y-auto">
                  {COLUMN_DEFS.map((col) => (
                    <CheckRow
                      key={col.key}
                      label={col.label}
                      checked={visibleColumns[col.key]}
                      onChange={(checked) => onVisibleColumnsChange({ ...visibleColumns, [col.key]: checked })}
                    />
                  ))}
                </div>
              </MenuSection>
              <SaveDefaultLink isDefault={isDefault} saving={savingDefault} onSave={saveAsDefault} />
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[1040px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
              <th className="px-3 py-2 text-left font-medium">Empleado</th>
              {fieldColumns.map((c) => (
                <th
                  key={c.key}
                  className="px-3 py-2 text-right font-medium"
                  style={fieldHeaderStyle(c.category, fieldMinWidth(c), sober)}
                >
                  {c.label}
                </th>
              ))}
              {compactGroups.map((g) => (
                <th key={g.key} className="px-3 py-2 text-right font-medium" style={fieldHeaderStyle(g.category, 104, sober)}>
                  {g.label}
                </th>
              ))}
              {visibleColumns.paymentMethod && <th className="px-3 py-2 text-left font-medium">Método</th>}
              {visibleColumns.paid && <th className="px-3 py-2 text-center font-medium">Pagado</th>}
              <th className="px-3 py-2 text-right font-medium">Total</th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map(({ employee, total }) => {
              const key = employee.id;
              // Each field input is uncontrolled (defaultValue, so typing
              // doesn't fight the cursor on every keystroke) -- but that
              // means React only reads defaultValue on first mount. Without
              // the period in the key, navigating from a quincena with real
              // data to one that's genuinely empty (no payroll_entries row
              // yet) left the SAME <input> mounted, still showing the last
              // period's numbers even though nothing was actually saved --
              // exactly the "Base column says 375 but Total says $0.00"
              // report. Including the period forces a fresh mount (fresh
              // defaultValue) every time the visible quincena changes.
              const periodKeySuffix = `${period.year}-${period.month}-${period.half}`;
              return (
                // "Fila enfocada" -- with dozens of employees it's easy
                // to click/tab into an input and not notice you've
                // drifted to the wrong row after scrolling. Any input
                // inside this row getting focus (group-focus-within)
                // tints the whole row and lights up a left accent bar
                // on the name cell, so the row you're actually editing
                // stays visually obvious regardless of how far down the
                // table it is. Plain hover gets a lighter version of
                // the same tint for mouse users scanning before they
                // click.
                <tr
                  key={`${key}-${periodKeySuffix}`}
                  className="group/row border-b border-border transition-colors last:border-0 hover:bg-muted/40 focus-within:bg-primary/[0.07]"
                >
                  <td className="relative px-3 py-1.5 font-medium text-foreground">
                    <span className="absolute inset-y-0 left-0 w-0.5 scale-y-0 bg-primary transition-transform group-focus-within/row:scale-y-100" />
                    <div className="flex items-center gap-2">
                      <EmployeeAvatar name={employee.name} employeeId={employee.id} sortOrder={employee.sortOrder} />
                      {employee.name}
                    </div>
                  </td>
                  {fieldColumns.map((c) => {
                    const value = (total.entry?.[c.key] ?? 0) as number;
                    const quantityMeta = QUANTITY_FIELD_META[c.key];
                    if (quantityMeta) {
                      const quantity = (total.entry?.[quantityMeta.quantityField] ?? 0) as number;
                      return (
                        <td key={c.key} className="px-1 py-1" style={fieldCellStyle(c.category, fieldMinWidth(c), sober)}>
                          <div className="flex flex-col items-end gap-0.5">
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                step="0.01"
                                defaultValue={quantity ? quantity.toString() : ""}
                                placeholder="0"
                                onBlur={(e) => saveQuantityField(key, quantityMeta.quantityField, e.target.value)}
                                className="w-14 rounded-md border border-transparent bg-transparent px-1 py-1 text-right tabular-nums hover:border-input focus:border-ring focus:bg-background focus:outline-none"
                              />
                              <span className="text-xs text-muted-foreground">{quantityMeta.unit}</span>
                            </div>
                            <span className="text-[11px] tabular-nums text-muted-foreground">{formatCents(value)}</span>
                          </div>
                        </td>
                      );
                    }
                    return (
                      <td key={c.key} className="px-1 py-1" style={fieldCellStyle(c.category, fieldMinWidth(c), sober)}>
                        <div className="flex items-center">
                          <span className="pl-1 text-xs text-muted-foreground">$</span>
                          <input
                            type="number"
                            step="0.01"
                            defaultValue={value ? (value / 100).toFixed(2) : ""}
                            placeholder="0.00"
                            onBlur={(e) => saveField(key, c.key, e.target.value)}
                            className="w-full rounded-md border border-transparent bg-transparent px-1.5 py-1 text-right tabular-nums hover:border-input focus:border-ring focus:bg-background focus:outline-none"
                          />
                        </div>
                      </td>
                    );
                  })}
                  {compactGroups.map((g) => {
                    const sum = g.fields.reduce((acc, f) => acc + ((total.entry?.[f] ?? 0) as number), 0);
                    return (
                      <td
                        key={g.key}
                        className="px-3 py-1.5 text-right tabular-nums text-foreground"
                        style={fieldCellStyle(g.category, 104, sober)}
                        title="Para editar el detalle, cambia a la vista Expandida"
                      >
                        {sum === 0 ? <span className="text-muted-foreground">—</span> : formatCents(g.sign * sum)}
                      </td>
                    );
                  })}
                  {visibleColumns.paymentMethod && (
                    <td className="px-2 py-1">
                      <Select
                        value={total.entry?.paymentMethod ?? "efectivo"}
                        onValueChange={(v) => savePaymentMethod(key, v as PaymentMethod)}
                      >
                        <SelectTrigger className="h-8 w-32 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(PAYMENT_METHOD_LABEL).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                  )}
                  {visibleColumns.paid && (
                    <td className="px-3 py-1.5 text-center">
                      <input
                        type="checkbox"
                        checked={total.entry?.paid ?? false}
                        onChange={(e) => togglePaid(key, e.target.checked)}
                        className="size-4 rounded border-input accent-primary"
                      />
                    </td>
                  )}
                  <td className="px-3 py-1.5 text-right font-medium tabular-nums text-foreground">
                    {formatCents(total.totalCents)}
                  </td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6"
                      title="Pagar prestaciones (décimo, vacación, prima)"
                      onClick={() => setPayBenefitsFor({ employee, total })}
                    >
                      <Gift className="size-3.5" />
                    </Button>
                    {onViewDetail && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6"
                        title="Ver detalle anual"
                        onClick={() => onViewDetail(employee.id)}
                      >
                        <ChevronRight className="size-3.5" />
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          {rows && rows.length > 0 && (
            <tfoot>
              <tr className="border-t border-border bg-muted/30 text-sm font-medium">
                <td className="px-3 py-2 text-foreground" colSpan={visibleCount}>
                  Total quincena
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-foreground">
                  {formatCents(rows.reduce((sum, r) => sum + r.total.totalCents, 0))}
                </td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <PayBenefitsDialog
        open={payBenefitsFor !== null}
        onOpenChange={(o) => !o && setPayBenefitsFor(null)}
        employee={payBenefitsFor?.employee ?? null}
        entry={payBenefitsFor?.total.entry ?? null}
        period={period}
        onSaved={load}
      />
      {saveError && <p className="text-sm font-medium text-destructive">{saveError}</p>}
      {pending && <p className="text-xs text-muted-foreground">Cargando…</p>}
    </div>
  );
}
