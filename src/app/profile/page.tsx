import { LogOut } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/actions/auth";
import { AvatarForm } from "@/app/profile/avatar-form";
import { ProfileInfoForm } from "@/app/profile/profile-info-form";
import { PasswordForm } from "@/app/profile/password-form";
import { LanguageForm } from "@/app/profile/language-form";
import { PrefToggle } from "@/components/pref-toggle";
import { PushSubscribeButton } from "@/components/push-subscribe-button";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { buttonSecondary, card, mutedText, pageHeading, sectionHeading } from "@/lib/ui";
import type { NotificationEventType } from "@/lib/types/database";

export default async function ProfilePage() {
  const profile = await requireUser();
  const dict = getDictionary(profile.locale);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isOwner = profile.role === "owner";

  // Only the event types that actually reach the owner (status_changed when
  // staff closes out a task, note_flagged, purchase_urgent, the daily cron's
  // digest/maintenance reminder, an announcement marked as happened) — not
  // task_assigned/due_soon/overdue, which either target staff instead or
  // (due_soon/overdue) aren't wired to notifyUser anywhere yet, so toggling
  // them here would do nothing.
  const notifEvents: { key: NotificationEventType; label: string }[] = [
    { key: "status_changed", label: dict.directory.eventStatusChanged },
    { key: "note_flagged", label: dict.directory.eventNoteFlagged },
    { key: "purchase_urgent", label: dict.directory.eventPurchaseUrgent },
    { key: "daily_digest", label: dict.directory.eventDailyDigest },
    { key: "maintenance_reminder", label: dict.directory.eventMaintenanceReminder },
    { key: "announcement_happened", label: dict.directory.eventAnnouncementHappened },
  ];

  let prefLookup: Record<string, boolean> = {};
  if (isOwner) {
    const { data: prefs } = await supabase
      .from("notification_preferences")
      .select("event_type, channel, enabled")
      .eq("user_id", profile.id);
    prefLookup = Object.fromEntries((prefs ?? []).map((p) => [`${p.event_type}:${p.channel}`, p.enabled]));
  }

  return (
    <div className="max-w-lg space-y-8">
      <div>
        <h1 className={pageHeading}>{dict.profile.title}</h1>
        <p className={mutedText}>{dict.roles[profile.role]}</p>
      </div>

      <section className="space-y-3">
        <h2 className={sectionHeading}>{dict.profile.photo}</h2>
        <div className={`p-5 ${card}`}>
          <AvatarForm fullName={profile.full_name} avatarUrl={profile.avatar_url} dict={dict} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className={sectionHeading}>{dict.profile.information}</h2>
        <div className={`p-5 ${card}`}>
          <ProfileInfoForm
            fullName={profile.full_name}
            phone={profile.phone}
            email={user?.email ?? ""}
            dict={dict}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className={sectionHeading}>{dict.profile.password}</h2>
        <div className={`p-5 ${card}`}>
          <PasswordForm dict={dict} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className={sectionHeading}>{dict.profile.language}</h2>
        <div className={`p-5 ${card}`}>
          <LanguageForm locale={profile.locale} dict={dict} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className={sectionHeading}>{dict.profile.notifications}</h2>
        <div className={`space-y-4 p-5 ${card}`}>
          <PushSubscribeButton locale={profile.locale} />
          {isOwner && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-ink-faint">
                    <th className="pb-2 font-normal">{dict.directory.eventHeader}</th>
                    <th className="pb-2 font-normal">{dict.directory.pushHeader}</th>
                    <th className="pb-2 font-normal">{dict.directory.emailHeader}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {notifEvents.map((event) => (
                    <tr key={event.key}>
                      <td className="py-2 text-ink-secondary">{event.label}</td>
                      <td className="py-2">
                        <PrefToggle
                          userId={profile.id}
                          eventType={event.key}
                          channel="push"
                          defaultEnabled={prefLookup[`${event.key}:push`] ?? true}
                        />
                      </td>
                      <td className="py-2">
                        <PrefToggle
                          userId={profile.id}
                          eventType={event.key}
                          channel="email"
                          defaultEnabled={prefLookup[`${event.key}:email`] ?? true}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <form action={logout}>
        <button type="submit" className={`w-full ${buttonSecondary}`}>
          <LogOut className="size-3.5" /> {dict.sidebar.logout}
        </button>
      </form>
    </div>
  );
}
