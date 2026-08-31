"use server";

import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { hourlyRate, dailyRate, type Period } from "@/lib/payroll-accrual";
import type { PaymentMethod } from "@/lib/types/database";

export type EntryFormValues = {
  base_pay: number;
  extra_hours: number;
  extra_days: number;
  bonus: number;
  dias_libres: number;
  horas_descontadas: number;
  dias_descontados: number;
  other_deduction: number;
  decimo_paid: number;
  vacation_paid: number;
  prima_paid: number;
  payment_method: PaymentMethod;
};

// Quantity-derived amounts are computed once here, from this submission's
// own base_pay — never recomputed later from a since-changed salary (the
// skill's "frozen-rate" lesson).
export async function saveEntry(personId: string, period: Period, values: EntryFormValues) {
  const profile = await requireOwner();
  const supabase = await createClient();

  await supabase.from("payroll_entries").upsert(
    {
      person_id: personId,
      period_year: period.year,
      period_month: period.month,
      period_half: period.half,
      base_pay: values.base_pay,
      extra_hours: values.extra_hours,
      extra_hours_amount: values.extra_hours * hourlyRate(values.base_pay),
      extra_days: values.extra_days,
      extra_days_amount: values.extra_days * dailyRate(values.base_pay),
      bonus: values.bonus,
      dias_libres: values.dias_libres,
      horas_descontadas: values.horas_descontadas,
      horas_descontadas_amount: values.horas_descontadas * hourlyRate(values.base_pay),
      dias_descontados: values.dias_descontados,
      dias_descontados_amount: values.dias_descontados * dailyRate(values.base_pay),
      other_deduction: values.other_deduction,
      decimo_paid: values.decimo_paid,
      vacation_paid: values.vacation_paid,
      prima_paid: values.prima_paid,
      payment_method: values.payment_method,
      notes: null,
      created_by: profile.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "person_id,period_year,period_month,period_half" }
  );

  revalidatePath("/finance/payroll/registro");
  revalidatePath(`/finance/payroll/${personId}`);
  revalidatePath("/finance/payroll/audit");
  revalidatePath("/finance/payroll", "layout");
}
