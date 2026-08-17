"use client";

import { useActionState, useRef } from "react";
import { updatePassword } from "@/app/actions/profile";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { SuccessBanner } from "@/components/ui/success-banner";
import { buttonPrimary, input } from "@/lib/ui";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export function PasswordForm({ dict }: { dict: Dictionary }) {
  const [state, action] = useActionState(updatePassword, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (formData: FormData) => {
        await action(formData);
        formRef.current?.reset();
      }}
      className="space-y-4"
    >
      <Field label={dict.passwordForm.newPassword}>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={input}
        />
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
      {state?.success && <SuccessBanner message={dict.passwordForm.success} />}

      <SubmitButton className={buttonPrimary} pendingLabel={dict.passwordForm.submitPending}>
        {dict.passwordForm.submit}
      </SubmitButton>
    </form>
  );
}
