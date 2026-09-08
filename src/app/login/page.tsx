"use client";

import { Suspense, useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { login, sendMagicLink } from "@/app/actions/auth";
import { Field } from "@/components/ui/field";
import { buttonPrimary, card, input, mutedText } from "@/lib/ui";

type Mode = "password" | "link";

function PasswordForm() {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <form action={action} className="space-y-4">
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

      {state?.error && (
        <p className="rounded-lg bg-status-overdue-bg px-3 py-2 text-sm text-status-overdue-fg">{state.error}</p>
      )}

      <button type="submit" disabled={pending} className={`w-full ${buttonPrimary}`}>
        {pending ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}

// Staff/residents don't have a password — they request a one-time link here
// instead. shouldCreateUser is off in the action itself, so this only ever
// works for accounts the owner already created; the confirmation message is
// the same either way so this can't be used to check who has an account.
function MagicLinkForm({ expiredNotice }: { expiredNotice: boolean }) {
  const [state, action, pending] = useActionState(sendMagicLink, null);

  if (state?.ok) {
    return (
      <p className="rounded-lg bg-status-done-bg px-3 py-2 text-sm text-status-done-fg">
        Si ese email tiene una cuenta, te enviamos un link para entrar. Revisá tu correo.
      </p>
    );
  }

  return (
    <form action={action} className="space-y-4">
      {expiredNotice && (
        <p className={`${mutedText} text-center`}>Ese link ya no es válido — pedí uno nuevo acá.</p>
      )}

      <Field label="Email">
        <input name="email" type="email" required autoComplete="email" className={input} />
      </Field>

      {state && !state.ok && (
        <p className="rounded-lg bg-status-overdue-bg px-3 py-2 text-sm text-status-overdue-fg">{state.error}</p>
      )}

      <button type="submit" disabled={pending} className={`w-full ${buttonPrimary}`}>
        {pending ? "Enviando..." : "Enviar link de acceso"}
      </button>
    </form>
  );
}

function LoginCard() {
  const searchParams = useSearchParams();
  const expiredNotice = searchParams.get("error") === "invalid_link";
  const [mode, setMode] = useState<Mode>(expiredNotice ? "link" : "password");

  return (
    <div className={`w-full max-w-sm space-y-5 p-7 ${card}`}>
      <div className="space-y-1 text-center">
        <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-base font-bold text-on-primary">
          C
        </span>
        <h1 className="pt-1 text-xl font-bold tracking-tight text-ink">Casa Coronado</h1>
        <p className={mutedText}>Inicia sesión para ver tus tareas.</p>
      </div>

      <div className="inline-flex w-full rounded-md border border-hairline bg-canvas-soft p-1">
        {(["password", "link"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`flex-1 rounded px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === m ? "bg-surface text-ink shadow-[var(--shadow-soft)]" : "text-ink-muted"
            }`}
          >
            {m === "password" ? "Contraseña" : "Link mágico"}
          </button>
        ))}
      </div>

      {mode === "password" ? <PasswordForm /> : <MagicLinkForm expiredNotice={expiredNotice} />}
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Suspense fallback={null}>
        <LoginCard />
      </Suspense>
    </div>
  );
}
