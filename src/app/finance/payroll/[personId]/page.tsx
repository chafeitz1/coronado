import { notFound } from "next/navigation";
import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PayrollDetail, type PayrollExpense } from "@/components/payroll-detail";
import type { Loan } from "@/components/payroll-loans-section";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { LoanCategory, LoanStatus, PayrollSubcategory } from "@/lib/types/database";

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

  const [{ data: expenseRows }, { data: staffDetails }, { data: salaryHistory }, { data: loanRows }] =
    await Promise.all([
      supabase
        .from("expenses")
        .select("id, date, subcategory, amount, expected_amount, notes")
        .eq("category", "planilla")
        .eq("person_id", personId)
        .order("date", { ascending: false }),
      supabase.from("staff_details").select("hire_date, termination_date").eq("user_id", personId).maybeSingle(),
      supabase
        .from("staff_salary_history")
        .select("salary, effective_date")
        .eq("user_id", personId)
        .order("effective_date", { ascending: false }),
      supabase
        .from("payroll_loans")
        .select(
          "id, category, principal_amount, num_installments, request_date, start_year, start_month, start_half, status, notes, payroll_loan_payments(id, amount, payment_date, notes)"
        )
        .eq("person_id", personId)
        .order("request_date", { ascending: false }),
    ]);

  const expenses: PayrollExpense[] = (expenseRows ?? []).map((e) => ({
    ...e,
    subcategory: e.subcategory as PayrollSubcategory,
  }));

  const loans: Loan[] = (loanRows ?? []).map(({ payroll_loan_payments, ...loan }) => ({
    ...loan,
    category: loan.category as LoanCategory,
    start_half: loan.start_half as 1 | 2,
    status: loan.status as LoanStatus,
    payments: payroll_loan_payments,
  }));

  return (
    <PayrollDetail
      person={person}
      expenses={expenses}
      hireDate={staffDetails?.hire_date ?? null}
      terminationDate={staffDetails?.termination_date ?? null}
      salaryHistory={salaryHistory ?? []}
      loans={loans}
      dict={dict}
      locale={profile.locale}
    />
  );
}
