import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { LoanCategory } from "@/lib/types/planilla";

export interface LoanRequestRow {
  id: string;
  employeeId: string;
  employeeName: string;
  category: LoanCategory;
  amountCents: number;
  requestDate: string;
  status: "pending" | "approved" | "rejected";
  notes: string | null;
}

/** Cola de solicitudes de dinero (préstamos/adelantos pedidos por el personal). */
export async function getLoanRequests(): Promise<LoanRequestRow[]> {
  const supabase = await createClient();
  const [{ data, error }, { data: staff }] = await Promise.all([
    supabase
      .from("payroll_loan_requests")
      .select("id, person_id, category, amount, request_date, status, notes")
      .order("request_date", { ascending: false }),
    supabase.from("profiles").select("id, full_name").eq("role", "staff"),
  ]);
  if (error) throw new Error(error.message);
  const names = new Map((staff ?? []).map((p: { id: string; full_name: string }) => [p.id, p.full_name]));
  return (data ?? []).map(
    (r: {
      id: string;
      person_id: string;
      category: string;
      amount: number | string;
      request_date: string;
      status: string;
      notes: string | null;
    }) => ({
      id: r.id,
      employeeId: r.person_id,
      employeeName: names.get(r.person_id) ?? "—",
      category: (r.category === "adelanto" ? "adelanto" : "prestamo") as LoanCategory,
      amountCents: Math.round(Number(r.amount) * 100),
      requestDate: r.request_date,
      status: (r.status === "approved" || r.status === "rejected" ? r.status : "pending") as LoanRequestRow["status"],
      notes: r.notes,
    })
  );
}
