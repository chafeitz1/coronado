import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { PayrollSalaryChange } from "@/lib/types/planilla";
import { periodOrdinal } from "@/lib/planilla/payroll-period";
import type { SalaryChange } from "@/lib/planilla/salary-history";

/**
 * Historial de sueldos para la Planilla, armado desde lo que ya edita el
 * Directorio: `staff_salary_history` (sueldo mensual en dólares + fecha
 * efectiva) y `staff_details` (fecha de ingreso, base de prestaciones).
 * Una sola fuente de verdad: acá NO se escribe sueldo.
 *
 * El modelo de Planilla piensa en quincenas (año/mes/mitad) y centavos;
 * este adaptador convierte `effective_date` -> quincena y dólares -> centavos.
 */

interface SalaryRow {
  id: string;
  user_id: string;
  salary: number | string;
  effective_date: string;
  created_at: string;
}

interface StaffDetailsRow {
  user_id: string;
  hire_date: string | null;
  benefits_base_salary_cents: number | null;
}

function periodOfDate(d: string): { year: number; month: number; half: 1 | 2 } {
  const [y, m, day] = d.split("-").map(Number);
  return { year: y, month: m, half: day <= 15 ? 1 : 2 };
}

function toCents(v: number | string): number {
  return Math.round(Number(v) * 100);
}

function buildChanges(rows: SalaryRow[], details: StaffDetailsRow | undefined): PayrollSalaryChange[] {
  const sorted = [...rows].sort((a, b) => a.effective_date.localeCompare(b.effective_date));
  const benefits = details?.benefits_base_salary_cents ?? null;
  const changes = sorted.map((r): PayrollSalaryChange => {
    const p = periodOfDate(r.effective_date);
    return {
      id: r.id,
      employeeId: r.user_id,
      monthlySalaryCents: toCents(r.salary),
      benefitsBaseSalaryCents: benefits,
      effectiveYear: p.year,
      effectiveMonth: p.month,
      effectiveHalf: p.half,
      notes: null,
      createdAt: r.created_at,
    };
  });
  // El primer sueldo cubre desde el ingreso: si se registró después de la
  // fecha de ingreso, se extiende hacia atrás hasta esa quincena.
  if (changes.length > 0 && details?.hire_date) {
    const hire = periodOfDate(details.hire_date);
    const first = changes[0];
    if (periodOrdinal(hire.year, hire.month, hire.half) < periodOrdinal(first.effectiveYear, first.effectiveMonth, first.effectiveHalf)) {
      changes[0] = { ...first, effectiveYear: hire.year, effectiveMonth: hire.month, effectiveHalf: hire.half };
    }
  }
  return changes;
}

/** Todos los historiales agrupados por empleado (2 queries). */
export async function getAllSalaryChanges(): Promise<Map<string, PayrollSalaryChange[]>> {
  const supabase = await createClient();
  const [historyRes, detailsRes] = await Promise.all([
    supabase.from("staff_salary_history").select("id, user_id, salary, effective_date, created_at"),
    supabase.from("staff_details").select("user_id, hire_date, benefits_base_salary_cents"),
  ]);
  if (historyRes.error) throw new Error(historyRes.error.message);
  if (detailsRes.error) throw new Error(detailsRes.error.message);

  const rowsByUser = new Map<string, SalaryRow[]>();
  for (const r of (historyRes.data ?? []) as SalaryRow[]) {
    const list = rowsByUser.get(r.user_id) ?? [];
    list.push(r);
    rowsByUser.set(r.user_id, list);
  }
  const detailsByUser = new Map(((detailsRes.data ?? []) as StaffDetailsRow[]).map((d) => [d.user_id, d]));

  const out = new Map<string, PayrollSalaryChange[]>();
  for (const [userId, rows] of rowsByUser) out.set(userId, buildChanges(rows, detailsByUser.get(userId)));
  return out;
}

/** Historial de un empleado, ordenado por quincena efectiva. */
export async function getSalaryChanges(employeeId: string): Promise<PayrollSalaryChange[]> {
  const supabase = await createClient();
  const [historyRes, detailsRes] = await Promise.all([
    supabase
      .from("staff_salary_history")
      .select("id, user_id, salary, effective_date, created_at")
      .eq("user_id", employeeId),
    supabase
      .from("staff_details")
      .select("user_id, hire_date, benefits_base_salary_cents")
      .eq("user_id", employeeId)
      .maybeSingle(),
  ]);
  if (historyRes.error) throw new Error(historyRes.error.message);
  if (detailsRes.error) throw new Error(detailsRes.error.message);
  return buildChanges((historyRes.data ?? []) as SalaryRow[], (detailsRes.data ?? undefined) as StaffDetailsRow | undefined);
}

/** Forma que consume el helper puro `src/lib/planilla/salary-history.ts`. */
export function toSalaryChanges(rows: PayrollSalaryChange[]): SalaryChange[] {
  return rows.map((c) => ({
    monthlySalaryCents: c.monthlySalaryCents,
    benefitsBaseSalaryCents: c.benefitsBaseSalaryCents,
    effectiveYear: c.effectiveYear,
    effectiveMonth: c.effectiveMonth,
    effectiveHalf: c.effectiveHalf,
  }));
}
