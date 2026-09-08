import type { EmailOtpType } from "@supabase/auth-js";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Where a magic-link / invite email actually lands. Supabase's own
// /auth/v1/verify endpoint checks the token server-side then redirects the
// browser here with `token_hash` + `type` in the query string — without a
// route to turn that into a session cookie, the browser just bounces to
// /login with nothing it can use (that's the bug this route fixes: staff
// and residents sign in with a link, never a password, so /login alone
// can't get them in).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/";

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      redirect(next);
    }
  }

  redirect("/login?error=invalid_link");
}
