"use client";

import { useActionState } from "react";
import { updateProfile } from "@/app/actions/profile";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { SuccessBanner } from "@/components/ui/success-banner";
import { buttonPrimary, input } from "@/lib/ui";

export function ProfileInfoForm({
  fullName,
  phone,
  email,
}: {
  fullName: string;
  phone: string | null;
  email: string;
}) {
  const [state, action] = useActionState(updateProfile, undefined);

  return (
    <form action={action} className="space-y-4">
      <Field label="Nombre">
        <input name="full_name" type="text" required defaultValue={fullName} className={input} />
      </Field>

      <Field label="Email">
        <input type="email" value={email} disabled className={`${input} opacity-60`} />
      </Field>

      <Field label="Teléfono">
        <input name="phone" type="tel" defaultValue={phone ?? ""} placeholder="+507 6000-0000" className={input} />
      </Field>

      {state?.error && (
        <p className="rounded-lg bg-status-overdue-bg px-3 py-2 text-sm text-status-overdue-fg">{state.error}</p>
      )}
      {state?.success && <SuccessBanner message="Perfil actualizado." />}

      <SubmitButton className={buttonPrimary} pendingLabel="Guardando...">
        Guardar cambios
      </SubmitButton>
    </form>
  );
}
