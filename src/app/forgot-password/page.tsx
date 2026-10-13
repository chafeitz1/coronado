"use client";

import { Suspense, useActionState } from "react";
import Image from "next/image";
import { requestPasswordReset } from "@/app/actions/auth";
import { Field } from "@/components/ui/field";
import { buttonPrimary } from "@/lib/ui";

// Same glass-over-photo treatment as /login's card — this is still a
// pre-auth page (no session, no profile, no locale yet), so it follows
// that page's hardcoded-Spanish pattern rather than the i18n dict used
// once a profile exists.
const glassInput =
  "w-full rounded-md border border-white/25 bg-white/10 px-3 py-2 text-sm text-ink outline-none backdrop-blur-sm transition-colors placeholder:text-ink-faint/70 focus:border-primary focus:ring-2 focus:ring-primary/20";

function ForgotPasswordCard() {
  const [state, action, pending] = useActionState(requestPasswordReset, null);

  return (
    <div className="w-full max-w-sm space-y-5 rounded-2xl border border-white/25 bg-surface/25 p-8 shadow-2xl backdrop-blur-2xl backdrop-saturate-150">
      <div className="space-y-2 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset, not a Next/Image candidate */}
        <img
          src="/brand/bonsai-logo-principal-bronce.svg"
          alt="Bonsai"
          className="mx-auto h-32 w-auto [filter:drop-shadow(0_0_3px_rgba(255,255,255,0.9))_drop-shadow(0_0_10px_rgba(255,255,255,0.7))]"
        />
        <p className="text-sm text-ink-secondary">Te enviamos un link para que puedas crear una nueva contraseña.</p>
      </div>

      {state?.ok ? (
        <p className="rounded-lg bg-status-done-bg px-3 py-2 text-center text-sm text-status-done-fg">
          Si ese email tiene una cuenta, te enviamos un link para restablecer tu contraseña. Revisá tu correo.
        </p>
      ) : (
        <form action={action} className="space-y-4">
          <Field label="Email">
            <input name="email" type="email" required autoComplete="email" className={glassInput} />
          </Field>

          {state && !state.ok && (
            <p className="rounded-lg bg-status-overdue-bg px-3 py-2 text-sm text-status-overdue-fg">{state.error}</p>
          )}

          <button type="submit" disabled={pending} className={`w-full ${buttonPrimary}`}>
            {pending ? "Enviando..." : "Enviar link"}
          </button>
        </form>
      )}

      <a href="/login" className="block text-center text-sm font-medium text-ink-secondary hover:underline active:underline">
        Volver a iniciar sesión
      </a>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <div className="relative flex flex-1 items-center justify-center overflow-hidden p-6">
      <div className="fixed inset-0 -z-10">
        <Image src="/login-bg.jpg" alt="" fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/10 to-black/55" />
      </div>

      <Suspense fallback={null}>
        <ForgotPasswordCard />
      </Suspense>
    </div>
  );
}
