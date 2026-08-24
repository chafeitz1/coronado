import { notFound } from "next/navigation";
import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PayrollDetail, type PayrollExpense } from "@/components/payroll-detail";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { PayrollSubcategory } from "@/lib/types/database";

export default async function PayrollPersonPage({ params }: { params: Promise<{ personId: string }> }) {
  const { personId } = await params;
  const profile = await requireOwner();
  const dict = getDictionary(profile.locale);
  const supabase = await createClient();

  const { data: person } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .eq("id", personId)
    .eq("role", "staff")
    .single();

  if (!person) notFound();

  const { data: expenseRows } = await supabase
    .from("expenses")
    .select("id, date, subcategory, amount, expected_amount, notes")
    .eq("category", "planilla")
    .eq("person_id", personId)
    .order("date", { ascending: false });

  const expenses: PayrollExpense[] = (expenseRows ?? []).map((e) => ({
    ...e,
    subcategory: e.subcategory as PayrollSubcategory,
  }));

  return <PayrollDetail person={person} expenses={expenses} dict={dict} locale={profile.locale} />;
}
