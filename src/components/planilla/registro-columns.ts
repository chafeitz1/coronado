/**
 * Shared column definitions for Registro's "Columnas" show/hide toggle.
 * Lives outside registro-view.tsx so payroll-client.tsx can own the
 * visibleColumns state (and persist it) without duplicating this list —
 * lifting the state up is what lets the choice survive switching to
 * Resumen Anual and back, since RegistroView unmounts when its
 * TabsContent goes inactive but PayrollClient never does.
 */

import type { PayrollCategoryKey } from "@/lib/planilla/payroll-colors";

export type FieldKey =
  | "basePayCents"
  | "extraHoursCents"
  | "extraDaysCents"
  | "bonusCents"
  | "diasLibresCents"
  | "horasDescontadasCents"
  | "diasDescontadosCents"
  | "otherDeductionCents"
  | "decimoPaidCents"
  | "vacationPaidCents"
  | "primaAntiguedadPaidCents";
export type ColumnKey = FieldKey | "paymentMethod" | "paid";

/** The four Registro columns entered as a quantity (hours or days)
 *  rather than a typed dollar amount -- the grid renders these with a
 *  qty input + auto-calculated amount instead of the plain currency
 *  input every other column uses. Keyed by the *Cents FieldKey (the
 *  column's identity) so registro-view.tsx can special-case them with
 *  a single lookup; the value is the matching quantity field on
 *  PayrollEntry and its unit label. */
export const QUANTITY_FIELD_META: Partial<
  Record<FieldKey, { quantityField: "extraHours" | "extraDays" | "horasDescontadas" | "diasDescontados"; unit: "h" | "d" }>
> = {
  extraHoursCents: { quantityField: "extraHours", unit: "h" },
  extraDaysCents: { quantityField: "extraDays", unit: "d" },
  horasDescontadasCents: { quantityField: "horasDescontadas", unit: "h" },
  diasDescontadosCents: { quantityField: "diasDescontados", unit: "d" },
};

/** Every column but Empleado/Total is optional — a household with two
 *  employees on straight cash pay never touches Horas Extra, Décimo,
 *  etc., and a busier roster wants them all. Show/hide, not a fixed
 *  layout, same "Columnas" pattern already used in Finance's History
 *  tab. All on by default. */
/** Same category colors Auditoría already uses (payroll-colors.ts),
 *  so a field reads the same way in both views -- explicit user ask.
 *  Décimo/Vacación/Prima all use the "decimo" key on purpose: that's
 *  the exact color Auditoría's "2. Prestaciones" group header uses
 *  for all three combined (see auditoria-view.tsx's GROUP_CATEGORY),
 *  not the separate vacacion/prima entries PAYROLL_CATEGORY also
 *  happens to define for other uses. Método/Pagado carry no category
 *  -- they aren't a kind of money. */
export const COLUMN_DEFS: { key: ColumnKey; label: string; category?: PayrollCategoryKey }[] = [
  { key: "basePayCents", label: "Base", category: "salario" },
  { key: "extraHoursCents", label: "Horas Extra", category: "bonos" },
  { key: "extraDaysCents", label: "Días Extra", category: "bonos" },
  { key: "bonusCents", label: "Bonos", category: "bonos" },
  { key: "diasLibresCents", label: "Días Libres", category: "bonos" },
  { key: "horasDescontadasCents", label: "Horas Descontadas", category: "descuentos" },
  { key: "diasDescontadosCents", label: "Días Descontados", category: "descuentos" },
  { key: "otherDeductionCents", label: "Otros Descuentos", category: "descuentos" },
  { key: "decimoPaidCents", label: "Décimo", category: "decimo" },
  { key: "vacationPaidCents", label: "Vacación", category: "decimo" },
  { key: "primaAntiguedadPaidCents", label: "Prima Antigüedad", category: "decimo" },
  { key: "paymentMethod", label: "Método" },
  { key: "paid", label: "Pagado" },
];

export function defaultVisibleColumns(): Record<ColumnKey, boolean> {
  return Object.fromEntries(COLUMN_DEFS.map((c) => [c.key, true])) as Record<ColumnKey, boolean>;
}

export const REGISTRO_COLUMNS_STORAGE_KEY = "coronado:planilla-registro-columns";
