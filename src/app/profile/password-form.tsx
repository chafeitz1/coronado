"use client";

import { useActionState, useRef } from "react";
import { updatePassword } from "@/app/actions/profile";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { SuccessBanner } from "@/components/ui/success-banner";
import { buttonPrimary, input } from "@/lib/ui";

export function PasswordForm() {
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
      <Field label="Nueva contraseña">
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={input}
        />
      </Field>

      <Field label="Confirmar contraseña">
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
      {state?.success && <SuccessBanner message="Contraseña actualizada." />}

      <SubmitButton className={buttonPrimary} pendingLabel="Cambiando...">
        Cambiar contraseña
      </SubmitButton>
    </form>
  );
}
