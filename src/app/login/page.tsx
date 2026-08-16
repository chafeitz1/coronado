"use client";

import { useActionState } from "react";
import { login } from "@/app/actions/auth";
import { Field } from "@/components/ui/field";
import { buttonPrimary, card, input, mutedText } from "@/lib/ui";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <div className="flex flex-1 items-center justify-center p-6">
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

        {state?.error && (
          <p className="rounded-lg bg-status-overdue-bg px-3 py-2 text-sm text-status-overdue-fg">
            {state.error}
          </p>
        )}

        <button type="submit" disabled={pending} className={`w-full ${buttonPrimary}`}>
          {pending ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
