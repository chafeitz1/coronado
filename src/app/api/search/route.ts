import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Searches across the three things people actually look up day-to-day —
// tasks, activos, proveedores — scoped by each table's own RLS policies
// (so staff only ever see work orders they're allowed to see, same as
// everywhere else in the app).
export async function GET(request: Request) {
  await requireUser();

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ workOrders: [], assets: [], vendors: [] });
  }

  const supabase = await createClient();
  const like = `%${q}%`;

  const [{ data: workOrders }, { data: assets }, { data: vendors }] = await Promise.all([
    supabase.from("work_orders").select("id, title, status").ilike("title", like).limit(5),
    supabase.from("assets").select("id, name").ilike("name", like).limit(5),
    supabase.from("vendors").select("id, name").ilike("name", like).limit(5),
  ]);

  return NextResponse.json({
    workOrders: workOrders ?? [],
    assets: assets ?? [],
    vendors: vendors ?? [],
  });
}
