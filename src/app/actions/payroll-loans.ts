"use server";

import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { defaultLoanStartPeriod, type Period } from "@/lib/payroll-accrual";
import type { LoanCategory } from "@/lib/types/database";

export async function createLoan(personId: string, formData: FormData) {
  const profile = await requireOwner();
  const supabase = await createClient();

  const category = String(formData.get("category") ?? "").trim() as LoanCategory;
  const requestDate = String(formData.get("request_date") ?? "").trim();
  const principalRaw = String(formData.get("principal_amount") ?? "").trim();
  const principal = Number(principalRaw);
  const installmentsRaw = String(formData.get("num_installments") ?? "").trim();
  const numInstallments = Number(installmentsRaw);
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!category || !requestDate || !principalRaw || Number.isNaN(principal) || principal <= 0) return;
  if (!installmentsRaw || Number.isNaN(numInstallments) || numInstallments < 1) return;

  const startPeriod: Period | null = defaultLoanStartPeriod(category, requestDate);
  if (!startPeriod) return;

  const { data: loan, error } = await supabase
    .from("payroll_loans")
    .insert({
      person_id: personId,
      category,
      principal_amount: principal,
      num_installments: numInstallments,
      request_date: requestDate,
      start_year: startPeriod.year,
      start_month: startPeriod.month,
      start_half: startPeriod.half,
      status: "active",
      notes,
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (error || !loan) return;

  // Also log the disbursement in the normal payment timeline, tagged back
  // to this loan.
  await supabase.from("expenses").insert({
    date: requestDate,
    category: "planilla",
    subcategory: "adelanto",
    amount: principal,
    expected_amount: null,
    person_id: personId,
    vendor_id: null,
    asset_id: null,
    payment_method: null,
    loan_id: loan.id,
    notes,
    created_by: profile.id,
  });

  revalidatePath(`/finance/payroll/${personId}`);
  revalidatePath("/finance/payroll", "layout");
}

export async function deleteLoan(loanId: string, personId: string) {
  await requireOwner();
  const supabase = await createClient();

  await supabase.from("payroll_loans").delete().eq("id", loanId);

  revalidatePath(`/finance/payroll/${personId}`);
  revalidatePath("/finance/payroll", "layout");
}

export async function recordLoanPayment(loanId: string, personId: string, formData: FormData) {
  const profile = await requireOwner();
  const supabase = await createClient();

  const paymentDate = String(formData.get("payment_date") ?? "").trim();
  const amountRaw = String(formData.get("amount") ?? "").trim();
  const amount = Number(amountRaw);
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!paymentDate || !amountRaw || Number.isNaN(amount) || amount <= 0) return;

  await supabase.from("payroll_loan_payments").insert({
    loan_id: loanId,
    amount,
    payment_date: paymentDate,
    notes,
    created_by: profile.id,
  });

  revalidatePath(`/finance/payroll/${personId}`);
}

export async function deleteLoanPayment(paymentId: string, personId: string) {
  await requireOwner();
  const supabase = await createClient();

  await supabase.from("payroll_loan_payments").delete().eq("id", paymentId);

  revalidatePath(`/finance/payroll/${personId}`);
}
