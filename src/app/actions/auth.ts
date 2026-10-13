"use server";

import { redirect } from "next/navigation";
import type { EmailOtpType } from "@supabase/auth-js";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { error?: string } | undefined;

export async function login(
  _state: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Ingresa tu email y contraseña." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Email o contraseña incorrectos." };
  }

  redirect("/");
}

export type MagicLinkState = { ok: true } | { ok: false; error: string } | null;

// Self-serve alternative to the password form, for staff/residents whose
// accounts have no password. shouldCreateUser: false means this can only
// ever sign in an account the owner already created via Directorio — it
// can't be used to sign up. The response is identical whether or not the
// email belongs to a real account, so this can't be used to check who has
// one.
export async function sendMagicLink(
  _prevState: MagicLinkState,
  formData: FormData
): Promise<MagicLinkState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { ok: false, error: "Ingresa tu email." };

  const supabase = await createClient();
  await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/auth/confirm`,
    },
  });

  return { ok: true };
}

// Called only from a real button click on /auth/confirm — never automatically
// on page load. Email security scanners (notably Outlook/Hotmail Safe Links)
// fetch every link in an incoming email to scan it, which burns a single-use
// magic-link token before the person ever opens their inbox; gating the
// actual verifyOtp call behind a click means a scanner's GET just renders an
// inert confirmation page instead of consuming the token.
export async function confirmAccess(formData: FormData) {
  const tokenHash = String(formData.get("token_hash") ?? "");
  const type = String(formData.get("type") ?? "") as EmailOtpType;
  const next = String(formData.get("next") ?? "").trim() || "/";

  if (!tokenHash || !type) redirect("/login?error=invalid_link");

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error) redirect("/login?error=invalid_link");

  redirect(next);
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
