import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SuccessBanner } from "@/components/ui/success-banner";
import { DirectoryExplorer } from "@/components/directory-explorer";
import { mutedText, pageHeading } from "@/lib/ui";
import { getDictionary, format } from "@/lib/i18n/dictionaries";
import type { NotificationEventType } from "@/lib/types/database";

export default async function DirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; deleted?: string }>;
}) {
  const profile = await requireUser();
  const dict = getDictionary(profile.locale);
  const supabase = await createClient();
  const { created, deleted } = await searchParams;
  const isOwner = profile.role === "owner";

  const [{ data: vendors }, { data: people }] = await Promise.all([
    supabase
      .from("vendors")
      .select("id, name, contact_name, trades, phone, email, notes, is_emergency")
      .order("name"),
    supabase.from("profiles").select("id, full_name, role, phone, avatar_url").order("full_name"),
  ]);

  let prefLookup: Record<string, boolean> = {};

  if (isOwner) {
    const { data: prefs } = await supabase
      .from("notification_preferences")
      .select("user_id, event_type, channel, enabled");

    prefLookup = Object.fromEntries(
      (prefs ?? []).map((p) => [`${p.user_id}:${p.event_type}:${p.channel}`, p.enabled])
    );
  }

  const notifEvents: { key: NotificationEventType; label: string }[] = [
    { key: "task_assigned", label: dict.directory.eventTaskAssigned },
    { key: "status_changed", label: dict.directory.eventStatusChanged },
    { key: "due_soon", label: dict.directory.eventDueSoon },
    { key: "overdue", label: dict.directory.eventOverdue },
  ];

  return (
    <div className="space-y-6">
      {created && <SuccessBanner message={dict.directory.createdBanner} />}
      {deleted && <SuccessBanner message={dict.directory.deletedBanner} />}

      <div>
        <h1 className={pageHeading}>{dict.directory.title}</h1>
        <p className={mutedText}>
          {format(dict.directory.subtitleCount, { count: (vendors?.length ?? 0) + (people?.length ?? 0) })}
        </p>
      </div>

      <DirectoryExplorer
        vendors={vendors ?? []}
        people={people ?? []}
        currentUserId={profile.id}
        isOwner={isOwner}
        dict={dict}
        locale={profile.locale}
        notifEvents={notifEvents}
        prefLookup={prefLookup}
      />
    </div>
  );
}
