import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyUser } from "@/lib/notifications/send";
import type { IntervalUnit } from "@/lib/types/database";

// Called on a daily schedule (e.g. Vercel Cron) to turn preventive
// maintenance rules into concrete work orders once they come due, then
// roll each schedule's next_due_date forward.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: dueSchedules, error } = await supabase
    .from("pm_schedules")
    .select("*")
    .eq("active", true)
    .lte("next_due_date", today);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: owner } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "owner")
    .limit(1)
    .single();

  let created = 0;

  for (const schedule of dueSchedules ?? []) {
    const { data: workOrder, error: insertError } = await supabase
      .from("work_orders")
      .insert({
        title: schedule.title,
        description: schedule.description,
        asset_id: schedule.asset_id,
        assigned_to: schedule.default_assignee,
        created_by: owner?.id ?? schedule.created_by,
        due_date: schedule.next_due_date,
        source: "pm",
        pm_schedule_id: schedule.id,
      })
      .select("id")
      .single();

    if (insertError || !workOrder) continue;
    created += 1;

    if (schedule.default_assignee) {
      await notifyUser(schedule.default_assignee, "task_assigned", {
        body: `Mantenimiento preventivo: ${schedule.title}`,
        url: `/work-orders/${workOrder.id}`,
      });
    }

    await supabase
      .from("pm_schedules")
      .update({ next_due_date: advanceDate(schedule.next_due_date, schedule.interval_unit, schedule.interval_value) })
      .eq("id", schedule.id);
  }

  return NextResponse.json({ checked: dueSchedules?.length ?? 0, created });
}

function advanceDate(dateStr: string, unit: IntervalUnit, value: number): string {
  const date = new Date(`${dateStr}T00:00:00Z`);
  if (unit === "days") date.setUTCDate(date.getUTCDate() + value);
  if (unit === "weeks") date.setUTCDate(date.getUTCDate() + value * 7);
  if (unit === "months") date.setUTCMonth(date.getUTCMonth() + value);
  if (unit === "years") date.setUTCFullYear(date.getUTCFullYear() + value);
  return date.toISOString().slice(0, 10);
}
