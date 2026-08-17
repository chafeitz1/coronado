import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AvatarForm } from "@/app/profile/avatar-form";
import { ProfileInfoForm } from "@/app/profile/profile-info-form";
import { PasswordForm } from "@/app/profile/password-form";
import { card, mutedText, pageHeading, sectionHeading } from "@/lib/ui";

const ROLE_LABELS: Record<string, string> = {
  owner: "Dueño",
  family: "Familia",
  staff: "Personal",
};

export default async function ProfilePage() {
  const profile = await requireUser();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="max-w-lg space-y-8">
      <div>
        <h1 className={pageHeading}>Mi perfil</h1>
        <p className={mutedText}>{ROLE_LABELS[profile.role] ?? profile.role}</p>
      </div>

      <section className="space-y-3">
        <h2 className={sectionHeading}>Foto</h2>
        <div className={`p-5 ${card}`}>
          <AvatarForm fullName={profile.full_name} avatarUrl={profile.avatar_url} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className={sectionHeading}>Información</h2>
        <div className={`p-5 ${card}`}>
          <ProfileInfoForm fullName={profile.full_name} phone={profile.phone} email={user?.email ?? ""} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className={sectionHeading}>Contraseña</h2>
        <div className={`p-5 ${card}`}>
          <PasswordForm />
        </div>
      </section>
    </div>
  );
}
