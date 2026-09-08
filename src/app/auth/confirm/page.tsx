"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { confirmAccess } from "@/app/actions/auth";
import { buttonPrimary, card, mutedText, pageHeading } from "@/lib/ui";

// Where a magic-link / invite email actually lands. Supabase's default email
// template ({{ .ConfirmationURL }}) routes through its own /verify endpoint,
// which uses the implicit flow: it does the verification itself and hands
// back a ready session as #access_token=...&refresh_token=... in the URL
// FRAGMENT — never sent to our server, only readable client-side. That's
// the case this page mainly handles (auto, no click needed: the token was
// already spent by Supabase's /verify to produce this session, so there's
// nothing left to protect behind a gesture).
//
// It also supports the token_hash+type query-string flow (used if the email
// template is ever customized to link to this page directly, bypassing
// Supabase's /verify) — that one DOES gate the actual verifyOtp call behind
// a real click, since in that flow the token is still unspent when the page
// loads, and an automated link scanner fetching the page shouldn't be able
// to burn it silently.
function ConfirmCard() {
  const searchParams = useSearchParams();
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next");
  const hasTokenHash = Boolean(tokenHash && type);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (hasTokenHash) return;

    const hash = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");

    if (!accessToken || !refreshToken) {
      window.location.replace("/login?error=invalid_link");
      return;
    }

    createClient()
      .auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => {
        if (error) setFailed(true);
        else window.location.replace(next || "/");
      })
      .catch(() => setFailed(true));
  }, [hasTokenHash, next]);

  if (hasTokenHash) {
    return (
      <form action={confirmAccess} className={`w-full max-w-sm space-y-4 p-8 text-center ${card}`}>
        <input type="hidden" name="token_hash" value={tokenHash ?? ""} />
        <input type="hidden" name="type" value={type ?? ""} />
        {next && <input type="hidden" name="next" value={next} />}

        <h1 className={pageHeading}>Confirmar acceso</h1>
        <p className={mutedText}>Tocá el botón para entrar a Casa Coronado.</p>

        <button type="submit" className={`w-full ${buttonPrimary}`}>
          Entrar
        </button>
      </form>
    );
  }

  if (failed) {
    return (
      <div className={`w-full max-w-sm space-y-3 p-8 text-center ${card}`}>
        <h1 className={pageHeading}>Ese link ya no es válido</h1>
        <p className={mutedText}>Pedí uno nuevo desde la página de inicio de sesión.</p>
        <a href="/login?error=invalid_link" className={`inline-flex w-full items-center justify-center ${buttonPrimary}`}>
          Ir al login
        </a>
      </div>
    );
  }

  return (
    <div className={`w-full max-w-sm space-y-2 p-8 text-center ${card}`}>
      <h1 className={pageHeading}>Entrando...</h1>
      <p className={mutedText}>Un momento.</p>
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Suspense fallback={null}>
        <ConfirmCard />
      </Suspense>
    </div>
  );
}
