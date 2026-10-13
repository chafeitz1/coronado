"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updatePassword } from "@/app/actions/profile";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { buttonPrimary, input } from "@/lib/ui";
import type { Dictionary } from "@/lib/i18n/dictionaries";

// Same updatePassword action /profile's PasswordForm uses — a recovery
// link's session (set via /auth/confirm's setSession) is a real session,
// so there's no separate "reset" action needed. Kept as its own component
// rather than reusing PasswordForm directly: arriving here means the whole
// point was to get back into the app, so success redirects to "/" instead
// of just showing a banner and leaving the person sitting on this page.
export function ResetPasswordForm({ dict }: { dict: Dictionary }) {
  const [state, action] = useActionState(updatePassword, undefined);
  const router = useRouter();

  useEffect(() => {
    if (state?.success) router.replace("/");
  }, [state, router]);

  return (
    <form action={action} className="space-y-4">
      <Field label={dict.passwordForm.newPassword}>
        <input name="password" type="password" required minLength={8} autoComplete="new-password" className={input} />
      </Field>

      <Field label={dict.passwordForm.confirmPassword}>
        <input
          name="confirm_password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={input}
        />
      </Field>

      {state?.error && (
        <p className="rounded-lg bg-status-overdue-bg px-3 py-2 text-sm text-status-overdue-fg">{state.error}</p>
      )}

      <SubmitButton className={buttonPrimary} pendingLabel={dict.passwordForm.submitPending}>
        {dict.passwordForm.submit}
      </SubmitButton>
    </form>
  );
}
