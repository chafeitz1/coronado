import { Users, Bell } from "lucide-react";
import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { inviteMember } from "@/app/actions/admin";
import { PrefToggle } from "@/components/pref-toggle";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { buttonPrimary, card, input, mutedText, pageHeading, sectionHeading } from "@/lib/ui";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { NotificationEventType } from "@/lib/types/database";

export default async function StaffAdminPage() {
  const owner = await requireOwner();
  const dict = getDictionary(owner.locale);
  const supabase = await createClient();

  const events: { key: NotificationEventType; label: string }[] = [
    { key: "task_assigned", label: dict.admin.eventTaskAssigned },
    { key: "status_changed", label: dict.admin.eventStatusChanged },
    { key: "due_soon", label: dict.admin.eventDueSoon },
    { key: "overdue", label: dict.admin.eventOverdue },
  ];

  const [{ data: members }, { data: prefs }, { data: ownerPrefs }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, role").neq("role", "owner").order("full_name"),
    supabase.from("notification_preferences").select("user_id, event_type, channel, enabled"),
    supabase
      .from("notification_preferences")
      .select("channel, enabled")
      .eq("user_id", owner.id)
      .eq("event_type", "note_flagged"),
  ]);

  const prefLookup = new Map(
    (prefs ?? []).map((p) => [`${p.user_id}:${p.event_type}:${p.channel}`, p.enabled])
  );
  const ownerNoteEmailEnabled =
    ownerPrefs?.find((p) => p.channel === "email")?.enabled ?? true;

  return (
    <div className="space-y-10">
      <div>
        <h1 className={pageHeading}>{dict.admin.title}</h1>
        <p className={mutedText}>{dict.admin.subtitle}</p>
      </div>

      <section className={`space-y-3 p-5 ${card}`}>
        <h2 className="font-semibold text-ink">{dict.admin.yourNotifications}</h2>
        <label className="flex items-center gap-2 text-sm text-ink-muted">
          <PrefToggle
            userId={owner.id}
            eventType="note_flagged"
            channel="email"
            defaultEnabled={ownerNoteEmailEnabled}
          />
          <Bell className="size-3.5" /> {dict.admin.notifyMe}
        </label>
      </section>

      <section className={`space-y-4 p-5 ${card}`}>
        <h2 className="font-semibold text-ink">{dict.admin.inviteSomeone}</h2>
        <form action={inviteMember} className="flex flex-wrap items-end gap-3">
          <Field label={dict.admin.nameLabel}>
            <input name="full_name" required className={input} />
          </Field>
          <Field label={dict.admin.emailLabel}>
            <input type="email" name="email" required className={input} />
          </Field>
          <Field label={dict.admin.roleLabel}>
            <select name="role" defaultValue="staff" className={input}>
              <option value="staff">{dict.admin.staffOption}</option>
              <option value="family">{dict.admin.familyOption}</option>
            </select>
          </Field>
          <SubmitButton className={buttonPrimary} pendingLabel={dict.admin.sendInvitePending}>
            {dict.admin.sendInvite}
          </SubmitButton>
        </form>
      </section>

      <section className="space-y-4">
        <h2 className={sectionHeading}>{dict.admin.staffAndFamily}</h2>

        {members && members.length > 0 ? (
          <div className="space-y-3">
            {members.map((member) => (
              <div key={member.id} className={`p-4 ${card}`}>
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary">
                    {member.full_name.slice(0, 1).toUpperCase()}
                  </span>
                  <div>
                    <p className="font-medium text-ink">{member.full_name}</p>
                    <p className={mutedText}>
                      {member.role === "staff" ? dict.admin.staffOption : dict.admin.familyOption}
                    </p>
                  </div>
                </div>

                {member.role === "staff" ? (
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-ink-faint">
                          <th className="pb-2 font-normal">{dict.admin.eventHeader}</th>
                          <th className="pb-2 font-normal">{dict.admin.pushHeader}</th>
                          <th className="pb-2 font-normal">{dict.admin.emailHeader}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-hairline">
                        {events.map((event) => (
                          <tr key={event.key}>
                            <td className="py-2 text-ink-secondary">{event.label}</td>
                            <td className="py-2">
                              <PrefToggle
                                userId={member.id}
                                eventType={event.key}
                                channel="push"
                                defaultEnabled={
                                  prefLookup.get(`${member.id}:${event.key}:push`) ?? true
                                }
                              />
                            </td>
                            <td className="py-2">
                              <PrefToggle
                                userId={member.id}
                                eventType={event.key}
                                channel="email"
                                defaultEnabled={
                                  prefLookup.get(`${member.id}:${event.key}:email`) ?? true
                                }
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className={`mt-2 ${mutedText}`}>{dict.admin.canCreateTasks}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={Users} message={dict.admin.empty} />
        )}
      </section>
    </div>
  );
}
