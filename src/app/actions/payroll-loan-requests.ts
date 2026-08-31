"use server";

import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { insertApprovedLoan } from "@/app/actions/payroll-loans";
import type { LoanCategory } from "@/lib/types/database";

export async function createLoanRequest(formData: FormData) {
  const profile = await requireOwner();
  const supabase = await createClient();

  const personId = String(formData.get("person_id") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim() as LoanCategory;
  const requestDate = String(formData.get("request_date") ?? "").trim();
  const amountRaw = String(formData.get("amount") ?? "").trim();
  const amount = Number(amountRaw);
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!personId || !category || !requestDate || !amountRaw || Number.isNaN(amount) || amount <= 0) return;

  await supabase.from("payroll_loan_requests").insert({
    person_id: personId,
    category,
    amount,
    request_date: requestDate,
    status: "pending",
    notes,
    loan_id: null,
    created_by: profile.id,
  });

  revalidatePath("/finance/payroll/requests");
}

export async function approveLoanRequest(requestId: string, formData: FormData) {
  const profile = await requireOwner();
  const supabase = await createClient();

  const installmentsRaw = String(formData.get("num_installments") ?? "").trim();
  const numInstallments = Number(installmentsRaw);
  if (!installmentsRaw || Number.isNaN(numInstallments) || numInstallments < 1) return;

  const { data: request } = await supabase
    .from("payroll_loan_requests")
    .select("person_id, category, amount, request_date, notes")
    .eq("id", requestId)
    .single();
  if (!request) return;

  const loanId = await insertApprovedLoan(supabase, profile, {
    personId: request.person_id,
    category: request.category,
    principal: request.amount,
    numInstallments,
    date: request.request_date,
    notes: request.notes,
  });
  if (!loanId) return;

  await supabase.from("payroll_loan_requests").update({ status: "approved", loan_id: loanId }).eq("id", requestId);

  revalidatePath("/finance/payroll/requests");
  revalidatePath(`/finance/payroll/${request.person_id}`);
  revalidatePath("/finance/payroll", "layout");
}

export async function rejectLoanRequest(requestId: string, formData: FormData) {
  await requireOwner();
  const supabase = await createClient();

  const notes = String(formData.get("notes") ?? "").trim() || null;

  await supabase.from("payroll_loan_requests").update({ status: "rejected", notes }).eq("id", requestId);

  revalidatePath("/finance/payroll/requests");
}

export async function deleteLoanRequest(requestId: string) {
  await requireOwner();
  const supabase = await createClient();

  await supabase.from("payroll_loan_requests").delete().eq("id", requestId);

  revalidatePath("/finance/payroll/requests");
}
