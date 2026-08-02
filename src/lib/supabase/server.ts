import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// See client.ts for why this isn't parameterized with <Database> yet.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // Server Components can't set cookies; this throws when called
          // from one, which is fine because the proxy refreshes the
          // session on every request instead.
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignored: called from a Server Component.
          }
        },
      },
    }
  );
}
