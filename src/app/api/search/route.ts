import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Searches across the three things people actually look up day-to-day —
// tasks, activos, proveedores — scoped by each table's own RLS policies
// (so staff only ever see work orders they're allowed to see, same as
// everywhere else in the app). Goes through search_work_orders/assets/
// vendors (Postgres functions, see migration 0037) rather than a plain
// ilike so matching is accent-insensitive — "electromecanico" without a
// tilde still finds "electromecánico".
export async function GET(request: Request) {
  await requireUser();

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ workOrders: [], assets: [], vendors: [] });
  }

  const supabase = await createClient();

  const [{ data: workOrders }, { data: assets }, { data: vendors }] = await Promise.all([
    supabase.rpc("search_work_orders", { q }),
    supabase.rpc("search_assets", { q }),
    supabase.rpc("search_vendors", { q }),
  ]);

  return NextResponse.json({
    workOrders: workOrders ?? [],
    assets: assets ?? [],
    vendors: vendors ?? [],
  });
}
