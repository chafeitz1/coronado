import { requireUser } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { ResetPasswordForm } from "./reset-password-form";
import { card, mutedText, pageHeading } from "@/lib/ui";

// Reached only after /auth/confirm turns a recovery-email link into a real
// session (setSession) and redirects here — requireUser() below is what
// actually gates this page: no session means straight back to /login, same
// as any other protected route.
export default async function ResetPasswordPage() {
  const profile = await requireUser();
  const dict = getDictionary(profile.locale);

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className={`w-full max-w-sm space-y-5 p-8 ${card}`}>
        <div className="space-y-1 text-center">
          <h1 className={pageHeading}>{dict.profile.password}</h1>
          <p className={mutedText}>Elegí tu nueva contraseña.</p>
        </div>
        <ResetPasswordForm dict={dict} />
      </div>
    </div>
  );
}
