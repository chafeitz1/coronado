"use client";

import { useActionState } from "react";
import { updateProfile } from "@/app/actions/profile";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { SuccessBanner } from "@/components/ui/success-banner";
import { buttonPrimary, input } from "@/lib/ui";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export function ProfileInfoForm({
  fullName,
  phone,
  email,
  dict,
}: {
  fullName: string;
  phone: string | null;
  email: string;
  dict: Dictionary;
}) {
  const [state, action] = useActionState(updateProfile, undefined);

  return (
    <form action={action} className="space-y-4">
      <Field label={dict.profileInfoForm.nameLabel}>
        <input name="full_name" type="text" required defaultValue={fullName} className={input} />
      </Field>

      <Field label={dict.profileInfoForm.emailLabel}>
        <input type="email" value={email} disabled className={`${input} opacity-60`} />
      </Field>

      <Field label={dict.profileInfoForm.phoneLabel}>
        <input
          name="phone"
          type="tel"
          defaultValue={phone ?? ""}
          placeholder={dict.profileInfoForm.phonePlaceholder}
          className={input}
        />
      </Field>

      {state?.error && (
        <p className="rounded-lg bg-status-overdue-bg px-3 py-2 text-sm text-status-overdue-fg">{state.error}</p>
      )}
      {state?.success && <SuccessBanner message={dict.profileInfoForm.success} />}

      <SubmitButton className={buttonPrimary} pendingLabel={dict.profileInfoForm.submitPending}>
        {dict.profileInfoForm.submit}
      </SubmitButton>
    </form>
  );
}
