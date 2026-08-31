"use server";

import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { PayrollSubcategory } from "@/lib/types/database";

export async function addExpense(personId: string, formData: FormData) {
  const profile = await requireOwner();
  const supabase = await createClient();

  const date = String(formData.get("date") ?? "").trim();
  const subcategory = String(formData.get("subcategory") ?? "").trim() as PayrollSubcategory;
  const amountRaw = String(formData.get("amount") ?? "").trim();
  const amount = Number(amountRaw);
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!date || !subcategory || !amountRaw || Number.isNaN(amount)) return;

  await supabase.from("expenses").insert({
    date,
    category: "planilla",
    subcategory,
    amount,
    expected_amount: null,
    person_id: personId,
    vendor_id: null,
    asset_id: null,
    payment_method: null,
    loan_id: null,
    notes,
    created_by: profile.id,
  });

  revalidatePath(`/finance/payroll/${personId}`);
  revalidatePath("/finance/payroll", "layout");
}

export async function deleteExpense(expenseId: string, personId: string) {
  await requireOwner();
  const supabase = await createClient();

  await supabase.from("expenses").delete().eq("id", expenseId);

  revalidatePath(`/finance/payroll/${personId}`);
  revalidatePath("/finance/payroll", "layout");
}
