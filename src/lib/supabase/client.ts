import { createBrowserClient } from "@supabase/ssr";

// Not parameterized with <Database>: postgrest-js' generic schema type now
// requires full Tables/Views/Functions/Relationships metadata to type joins,
// which only `supabase gen types` (against a real, linked project) can
// produce accurately. Until this is linked to a live Supabase project, we
// stay untyped here and rely on the hand-written Row/Insert/Update types in
// `@/lib/types/database` at the call sites instead. See README "Type-safe
// Supabase queries" for the follow-up.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
