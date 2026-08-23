import { Bell } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AvatarForm } from "@/app/profile/avatar-form";
import { ProfileInfoForm } from "@/app/profile/profile-info-form";
import { PasswordForm } from "@/app/profile/password-form";
import { LanguageForm } from "@/app/profile/language-form";
import { PrefToggle } from "@/components/pref-toggle";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { card, mutedText, pageHeading, sectionHeading } from "@/lib/ui";

export default async function ProfilePage() {
  const profile = await requireUser();
  const dict = getDictionary(profile.locale);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isOwner = profile.role === "owner";

  let noteFlaggedEmailEnabled = true;
  if (isOwner) {
    const { data: pref } = await supabase
      .from("notification_preferences")
      .select("enabled")
      .eq("user_id", profile.id)
      .eq("event_type", "note_flagged")
      .eq("channel", "email")
      .maybeSingle();
    noteFlaggedEmailEnabled = pref?.enabled ?? true;
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

      {isOwner && (
        <section className="space-y-3">
          <h2 className={sectionHeading}>{dict.profile.notifications}</h2>
          <div className={`p-5 ${card}`}>
            <label className="flex items-center gap-2 text-sm text-ink-muted">
              <PrefToggle
                userId={profile.id}
                eventType="note_flagged"
                channel="email"
                defaultEnabled={noteFlaggedEmailEnabled}
              />
              <Bell className="size-3.5" /> {dict.profile.notifyMe}
            </label>
          </div>
        </section>
      )}
    </div>
  );
}
