"use server";

import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { periodRepresentativeDate, type Period } from "@/lib/payroll-accrual";
import type { PayrollSubcategory } from "@/lib/types/database";

const GRID_SUBCATEGORIES: PayrollSubcategory[] = ["quincena", "decimo", "vacacion", "adelanto"];

export async function saveRegistroRow(personId: string, period: Period, formData: FormData) {
  const profile = await requireOwner();
  const supabase = await createClient();

  const date = periodRepresentativeDate(period);
  const rows = GRID_SUBCATEGORIES.map((subcategory) => {
    const raw = String(formData.get(subcategory) ?? "").trim();
    if (!raw) return null;
    const amount = Number(raw);
    if (Number.isNaN(amount) || amount <= 0) return null;
    return {
      date,
      category: "planilla" as const,
      subcategory,
      amount,
      expected_amount: null,
      person_id: personId,
      vendor_id: null,
      asset_id: null,
      payment_method: null,
      loan_id: null,
      notes: null,
      created_by: profile.id,
    };
  }).filter((r) => r !== null);

  if (rows.length === 0) return;

  await supabase.from("expenses").insert(rows);

  revalidatePath("/finance/payroll/registro");
  revalidatePath(`/finance/payroll/${personId}`);
  revalidatePath("/finance/payroll", "layout");
}
