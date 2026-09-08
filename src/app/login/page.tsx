"use client";

import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { login } from "@/app/actions/auth";
import { Field } from "@/components/ui/field";
import { buttonPrimary, card, input, mutedText } from "@/lib/ui";

function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);
  const searchParams = useSearchParams();
  // Staff/residents sign in via a magic link the owner sends from
  // Directorio, not a password — this is what they land on if that link
  // already expired or was already used.
  const linkError = searchParams.get("error") === "invalid_link";

  return (
    <form action={action} className={`w-full max-w-sm space-y-5 p-7 ${card}`}>
      <div className="space-y-1 text-center">
        <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-base font-bold text-on-primary">
          C
        </span>
        <h1 className="pt-1 text-xl font-bold tracking-tight text-ink">Casa Coronado</h1>
        <p className={mutedText}>Inicia sesión para ver tus tareas.</p>
      </div>

      <div className="space-y-4">
        <Field label="Email">
          <input id="email" name="email" type="email" required autoComplete="email" className={input} />
        </Field>

        <Field label="Contraseña">
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className={input}
          />
        </Field>
      </div>

      {linkError && (
        <p className="rounded-lg bg-status-overdue-bg px-3 py-2 text-sm text-status-overdue-fg">
          Ese link ya no es válido. Pídele al dueño que te reenvíe la invitación desde el Directorio.
        </p>
      )}

      {state?.error && (
        <p className="rounded-lg bg-status-overdue-bg px-3 py-2 text-sm text-status-overdue-fg">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className={`w-full ${buttonPrimary}`}>
        {pending ? "Entrando..." : "Entrar"}
      </button>

      <p className={`${mutedText} text-center text-xs`}>
        ¿Sos staff o residente y no tenés contraseña? Pedile al dueño que te envíe (o reenvíe) tu link de acceso
        desde el Directorio — no hace falta llenar este formulario.
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
