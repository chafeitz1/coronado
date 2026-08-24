import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DirectoryExplorer } from "@/components/directory-explorer";
import { mutedText, pageHeading } from "@/lib/ui";
import { getDictionary, format } from "@/lib/i18n/dictionaries";
import type { NotificationEventType } from "@/lib/types/database";

export default async function DirectoryPage() {
  const profile = await requireUser();
  const dict = getDictionary(profile.locale);
  const supabase = await createClient();
  const isOwner = profile.role === "owner";

  const [{ data: vendorRows }, { data: people }] = await Promise.all([
    supabase
      .from("vendors")
      .select("id, name, trades, notes, is_emergency, vendor_contacts(id, contact_name, role_label, phone, email, position)")
      .order("name")
      .order("position", { referencedTable: "vendor_contacts" }),
    supabase.from("profiles").select("id, full_name, role, phone, avatar_url").order("full_name"),
  ]);

  const vendors = (vendorRows ?? []).map(({ vendor_contacts, ...vendor }) => ({
    ...vendor,
    contacts: vendor_contacts,
  }));

  let prefLookup: Record<string, boolean> = {};
  let hireDateLookup: Record<string, string | null> = {};
  let salaryHistoryLookup: Record<string, { salary: number; effective_date: string }[]> = {};

  if (isOwner) {
    const [{ data: prefs }, { data: staffDetails }, { data: salaryHistory }] = await Promise.all([
      supabase.from("notification_preferences").select("user_id, event_type, channel, enabled"),
      supabase.from("staff_details").select("user_id, hire_date"),
      supabase
        .from("staff_salary_history")
        .select("user_id, salary, effective_date")
        .order("effective_date", { ascending: false }),
    ]);

    prefLookup = Object.fromEntries(
      (prefs ?? []).map((p) => [`${p.user_id}:${p.event_type}:${p.channel}`, p.enabled])
    );
    hireDateLookup = Object.fromEntries((staffDetails ?? []).map((s) => [s.user_id, s.hire_date]));
    salaryHistoryLookup = {};
    for (const s of salaryHistory ?? []) {
      (salaryHistoryLookup[s.user_id] ??= []).push({ salary: s.salary, effective_date: s.effective_date });
    }
  }

  const notifEvents: { key: NotificationEventType; label: string }[] = [
    { key: "task_assigned", label: dict.directory.eventTaskAssigned },
    { key: "status_changed", label: dict.directory.eventStatusChanged },
    { key: "due_soon", label: dict.directory.eventDueSoon },
    { key: "overdue", label: dict.directory.eventOverdue },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className={pageHeading}>{dict.directory.title}</h1>
        <p className={mutedText}>
          {format(dict.directory.subtitleCount, { count: vendors.length + (people?.length ?? 0) })}
        </p>
      </div>

      <DirectoryExplorer
        vendors={vendors}
        people={people ?? []}
        currentUserId={profile.id}
        isOwner={isOwner}
        dict={dict}
        notifEvents={notifEvents}
        prefLookup={prefLookup}
        hireDateLookup={hireDateLookup}
        salaryHistoryLookup={salaryHistoryLookup}
      />
    </div>
  );
}
