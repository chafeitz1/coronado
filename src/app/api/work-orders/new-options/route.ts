import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Feeds NewWorkOrderPanel's asset/staff/vendor pickers — same queries as
// the standalone /work-orders/new page, as JSON instead of a rendered page
// since the panel opens client-side from List/Calendar/Board view.
export async function GET() {
  const profile = await requireUser();
  const supabase = await createClient();

  const [{ data: assets }, { data: staff }, { data: vendors }] = await Promise.all([
    supabase.from("assets").select("id, name").order("name"),
    profile.role === "owner"
      ? supabase.from("profiles").select("id, full_name").eq("role", "staff").order("full_name")
      : Promise.resolve({ data: null }),
    profile.role === "owner"
      ? supabase.from("vendors").select("id, name").order("name")
      : Promise.resolve({ data: null }),
  ]);

  return NextResponse.json({
    assets: assets ?? [],
    staff: staff ?? [],
    vendors: vendors ?? [],
  });
}
