import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service-role client: bypasses RLS. Only ever import this from server-side
// code that itself enforces the "must be owner" check (e.g. inviting staff,
// sending push/email notifications) — never expose this key to the client.
// See client.ts for why this isn't parameterized with <Database> yet.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
