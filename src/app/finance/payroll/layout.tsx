import Link from "next/link";
import { ClipboardCheck, HandCoins, NotebookPen, Users } from "lucide-react";
import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar } from "@/components/ui/avatar";
import { PayrollShell } from "@/components/payroll-shell";
import { buttonPrimary, buttonUtility, listCard, mutedText, pageHeading, sectionHeading } from "@/lib/ui";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default async function PayrollLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireOwner();
  const dict = getDictionary(profile.locale);
  const supabase = await createClient();

  const [{ data: staff }, { data: staffDetails }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, avatar_url").eq("role", "staff").order("full_name"),
    supabase.from("staff_details").select("user_id, termination_date"),
  ]);

  const terminationByPerson = new Map<string, string>();
  for (const s of staffDetails ?? []) {
    if (s.termination_date) terminationByPerson.set(s.user_id, s.termination_date);
  }

  const activeStaff = (staff ?? []).filter((p) => !terminationByPerson.has(p.id));
  const formerStaff = (staff ?? []).filter((p) => terminationByPerson.has(p.id));

  function renderStaffList(list: typeof activeStaff) {
    return (
      <ul className={listCard}>
        {list.map((person) => (
          <li key={person.id}>
            <Link
              href={`/finance/payroll/${person.id}`}
              className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-hover active:bg-surface-hover"
            >
              <Avatar fullName={person.full_name} avatarUrl={person.avatar_url} size="sm" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{person.full_name}</span>
            </Link>
          </li>
        ))}
      </ul>
    );
  }

  const listPane = (
    <div className="space-y-6">
      <div>
        <h1 className={pageHeading}>{dict.payroll.title}</h1>
        <p className={mutedText}>{dict.payroll.subtitle}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/finance/payroll/registro" className={buttonPrimary}>
          <NotebookPen className="size-4" /> {dict.payroll.registroHeading}
        </Link>
        <Link href="/finance/payroll/requests" className={buttonUtility}>
          <HandCoins className="size-3.5" /> {dict.payroll.requestsHeading}
        </Link>
        <Link href="/finance/payroll/audit" className={buttonUtility}>
          <ClipboardCheck className="size-3.5" /> {dict.payroll.auditHeading}
        </Link>
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
