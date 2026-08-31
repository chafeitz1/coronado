import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PayrollRequestsView, type LoanRequest } from "@/components/payroll-requests-view";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { pageHeading } from "@/lib/ui";
import type { LoanCategory, LoanRequestStatus } from "@/lib/types/database";

export default async function PayrollRequestsPage() {
  const profile = await requireOwner();
  const dict = getDictionary(profile.locale);
  const supabase = await createClient();

  const [{ data: staff }, { data: requestRows }] = await Promise.all([
    supabase.from("profiles").select("id, full_name").eq("role", "staff").order("full_name"),
    supabase
      .from("payroll_loan_requests")
      .select("id, person_id, category, amount, request_date, status, notes, profiles(full_name)")
      .order("request_date", { ascending: false }),
  ]);

  const requests: LoanRequest[] = (requestRows ?? []).map((r) => ({
    id: r.id,
    person_id: r.person_id,
    person_name: r.profiles[0]?.full_name ?? "—",
    category: r.category as LoanCategory,
    amount: r.amount,
    request_date: r.request_date,
    status: r.status as LoanRequestStatus,
    notes: r.notes,
  }));

  return (
    <div className="space-y-6">
      <h1 className={pageHeading}>{dict.payroll.requestsHeading}</h1>
      <PayrollRequestsView staff={staff ?? []} requests={requests} dict={dict} locale={profile.locale} />
    </div>
  );
}
