import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AvatarForm } from "@/app/profile/avatar-form";
import { ProfileInfoForm } from "@/app/profile/profile-info-form";
import { PasswordForm } from "@/app/profile/password-form";
import { LanguageForm } from "@/app/profile/language-form";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { card, mutedText, pageHeading, sectionHeading } from "@/lib/ui";

export default async function ProfilePage() {
  const profile = await requireUser();
  const dict = getDictionary(profile.locale);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
    </div>
  );
}
