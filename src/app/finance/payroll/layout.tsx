import Link from "next/link";
import { Users } from "lucide-react";
import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar } from "@/components/ui/avatar";
import { PayrollShell } from "@/components/payroll-shell";
import { formatCurrency } from "@/lib/money";
import { listCard, mutedText, pageHeading, sectionHeading } from "@/lib/ui";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default async function PayrollLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireOwner();
  const dict = getDictionary(profile.locale);
  const supabase = await createClient();

  const [{ data: staff }, { data: expenses }, { data: staffDetails }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, avatar_url").eq("role", "staff").order("full_name"),
    supabase.from("expenses").select("person_id, amount, expected_amount").eq("category", "planilla"),
    supabase.from("staff_details").select("user_id, termination_date"),
  ]);

  const pendingByPerson = new Map<string, number>();
  for (const e of expenses ?? []) {
    if (!e.person_id || e.expected_amount === null) continue;
    pendingByPerson.set(e.person_id, (pendingByPerson.get(e.person_id) ?? 0) + (e.expected_amount - e.amount));
  }

  const terminationByPerson = new Map<string, string>();
  for (const s of staffDetails ?? []) {
    if (s.termination_date) terminationByPerson.set(s.user_id, s.termination_date);
  }

  const activeStaff = (staff ?? []).filter((p) => !terminationByPerson.has(p.id));
  const formerStaff = (staff ?? []).filter((p) => terminationByPerson.has(p.id));

  function renderStaffList(list: typeof activeStaff) {
    return (
      <ul className={listCard}>
        {list.map((person) => {
          const pending = pendingByPerson.get(person.id) ?? 0;
          return (
            <li key={person.id}>
              <Link
                href={`/finance/payroll/${person.id}`}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-hover"
              >
                <Avatar fullName={person.full_name} avatarUrl={person.avatar_url} size="sm" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{person.full_name}</span>
                {pending > 0.004 && (
                  <span className="inline-flex shrink-0 items-center rounded-full bg-status-overdue-bg px-2.5 py-1 text-xs font-semibold text-status-overdue-fg">
                    {formatCurrency(pending)}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    );
  }

  const listPane = (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className={pageHeading}>{dict.payroll.title}</h1>
          <p className={mutedText}>{dict.payroll.subtitle}</p>
        </div>
      </div>

      {activeStaff.length > 0 || formerStaff.length > 0 ? (
        <div className="space-y-5">
          {activeStaff.length > 0 && renderStaffList(activeStaff)}
          {formerStaff.length > 0 && (
            <div className="space-y-2">
              <h2 className={sectionHeading}>{dict.payroll.formerStaffHeading}</h2>
              {renderStaffList(formerStaff)}
            </div>
          )}
        </div>
      ) : (
        <EmptyState icon={Users} message={dict.payroll.emptyStaff} />
      )}
    </div>
  );

  return (
    <PayrollShell listPane={listPane} dict={dict}>
      {children}
    </PayrollShell>
  );
}
