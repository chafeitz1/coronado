import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { PayrollEmployee } from "@/lib/types/planilla";
import { currentPeriod } from "@/lib/planilla/payroll-period";
import { earliestSalary, salaryInEffect } from "@/lib/planilla/salary-history";
import { getAllSalaryChanges, isMissingTable, toSalaryChanges } from "@/lib/payroll-service/salary";

/**
 * Empleados de la Planilla = personal (`profiles.role = 'staff'`). Nombre,
 * fechas y sueldo los edita el Directorio; acá solo se leen y se arman en
 * la forma `PayrollEmployee` que esperan las fórmulas. La base de
 * prestaciones y las notas de liquidación sí viven en `staff_details`.
 */

interface ProfileRow {
  id: string;
  full_name: string;
}

interface DetailsRow {
  user_id: string;
  hire_date: string | null;
  termination_date: string | null;
  benefits_base_salary_cents: number | null;
  liquidation_notes: string | null;
}

interface FormerRow {
  id: string;
  full_name: string;
  hire_date: string | null;
  end_date: string | null;
  benefits_base_salary_cents: number | null;
  liquidation_notes: string | null;
  notes: string | null;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function build(
  profile: ProfileRow,
  details: DetailsRow | undefined,
  baseSalaryCents: number,
  benefitsBase: number | null
): PayrollEmployee {
  const endDate = details?.termination_date ?? null;
  return {
    id: profile.id,
    name: profile.full_name,
    position: null,
    startDate: details?.hire_date ?? null,
    endDate,
    status: endDate && endDate <= todayIso() ? "INACTIVE" : "ACTIVE",
    baseSalaryCents,
    benefitsBaseSalaryCents: benefitsBase,
    notes: null,
    liquidationNotes: details?.liquidation_notes ?? null,
    sortOrder: 0,
  };
}

export async function getPayrollEmployees(
  salaryPromise: Promise<Awaited<ReturnType<typeof getAllSalaryChanges>>> = getAllSalaryChanges()
): Promise<PayrollEmployee[]> {
  const supabase = await createClient();
  const [profilesRes, detailsRes, salaryByEmployee, formerRes] = await Promise.all([
    supabase.from("profiles").select("id, full_name").eq("role", "staff").order("full_name"),
    supabase
      .from("staff_details")
      .select("user_id, hire_date, termination_date, benefits_base_salary_cents, liquidation_notes"),
    salaryPromise,
    supabase.from("payroll_former_staff").select("id, full_name, hire_date, end_date, benefits_base_salary_cents, liquidation_notes, notes"),
  ]);
  if (formerRes.error && !isMissingTable(formerRes.error)) throw new Error(formerRes.error.message);
  if (profilesRes.error) throw new Error(profilesRes.error.message);
  if (detailsRes.error) throw new Error(detailsRes.error.message);

  const detailsByUser = new Map(((detailsRes.data ?? []) as DetailsRow[]).map((d) => [d.user_id, d]));
  const now = currentPeriod();
  const staff = ((profilesRes.data ?? []) as ProfileRow[]).map((p) => {
    const changes = toSalaryChanges(salaryByEmployee.get(p.id) ?? []);
    const current = salaryInEffect(changes, now.year, now.month, now.half) ?? earliestSalary(changes);
    return build(p, detailsByUser.get(p.id), current?.monthlySalaryCents ?? 0, current?.benefitsBaseSalaryCents ?? null);
  });
  // Personal que ya no trabaja: datos propios de Planilla, sin cuenta (payroll_former_staff).
  const former = ((formerRes.data ?? []) as FormerRow[]).map((f) => {
    const changes = toSalaryChanges(salaryByEmployee.get(f.id) ?? []);
    const current = salaryInEffect(changes, now.year, now.month, now.half) ?? earliestSalary(changes);
    return {
      id: f.id,
      name: f.full_name,
      position: null,
      startDate: f.hire_date,
      endDate: f.end_date,
      status: f.end_date && f.end_date <= todayIso() ? ("INACTIVE" as const) : ("ACTIVE" as const),
      baseSalaryCents: current?.monthlySalaryCents ?? 0,
      benefitsBaseSalaryCents: f.benefits_base_salary_cents ?? current?.benefitsBaseSalaryCents ?? null,
      notes: f.notes,
      liquidationNotes: f.liquidation_notes,
      sortOrder: 0,
    } satisfies PayrollEmployee;
  });
  return [...staff, ...former];
}

export async function getPayrollEmployee(id: string): Promise<PayrollEmployee | null> {
  return (await getPayrollEmployees()).find((e) => e.id === id) ?? null;
}

/** Notas de liquidación y base de prestaciones — lo único que Planilla
 *  escribe sobre el empleado (el resto lo edita el Directorio). */
export async function updatePayrollEmployeeBenefits(
  id: string,
  patch: { benefitsBaseSalaryCents?: number | null; liquidationNotes?: string | null }
): Promise<void> {
  const supabase = await createClient();
  if (await isFormerStaff(supabase, id)) {
    const patchFormer: Record<string, unknown> = {};
    if (patch.benefitsBaseSalaryCents !== undefined) patchFormer.benefits_base_salary_cents = patch.benefitsBaseSalaryCents;
    if (patch.liquidationNotes !== undefined) patchFormer.liquidation_notes = patch.liquidationNotes;
    if (Object.keys(patchFormer).length === 0) return;
    const { error } = await supabase.from("payroll_former_staff").update(patchFormer).eq("id", id);
    if (error) throw new Error(error.message);
    return;
  }
  const update: Record<string, unknown> = { user_id: id, updated_at: new Date().toISOString() };
  if (patch.benefitsBaseSalaryCents !== undefined) update.benefits_base_salary_cents = patch.benefitsBaseSalaryCents;
  if (patch.liquidationNotes !== undefined) update.liquidation_notes = patch.liquidationNotes;
  const { error } = await supabase.from("staff_details").upsert(update, { onConflict: "user_id" });
  if (error) throw new Error(error.message);
}

/** Fija (o limpia) la fecha de terminación y las notas de liquidación.
 *  `termination_date` es lo que el Directorio ya usa para "personal que
 *  ya no labora"; `endDate: null` reactiva. Las notas solo se tocan si
 *  se pasan. */
export async function setEmployeeLiquidation(
  id: string,
  endDate: string | null,
  liquidationNotes?: string | null
): Promise<void> {
  const supabase = await createClient();
  if (await isFormerStaff(supabase, id)) {
    const patchFormer: Record<string, unknown> = { end_date: endDate };
    if (liquidationNotes !== undefined) patchFormer.liquidation_notes = liquidationNotes;
    const { error } = await supabase.from("payroll_former_staff").update(patchFormer).eq("id", id);
    if (error) throw new Error(error.message);
    return;
  }
  const row: Record<string, unknown> = { user_id: id, termination_date: endDate, updated_at: new Date().toISOString() };
  if (liquidationNotes !== undefined) row.liquidation_notes = liquidationNotes;
  const { error } = await supabase.from("staff_details").upsert(row, { onConflict: "user_id" });
  if (error) throw new Error(error.message);
}

async function isFormerStaff(supabase: Awaited<ReturnType<typeof createClient>>, id: string): Promise<boolean> {
  const { data, error } = await supabase.from("payroll_former_staff").select("id").eq("id", id).maybeSingle();
  if (error) {
    if (isMissingTable(error)) return false;
    throw new Error(error.message);
  }
  return !!data;
}
