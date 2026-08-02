"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";
import type { IntervalUnit } from "@/lib/types/database";

export async function createPmSchedule(formData: FormData) {
  const profile = await requireOwner();
  const supabase = await createClient();

  const title = String(formData.get("title") ?? "").trim();
  const assetId = String(formData.get("asset_id") ?? "");
  const nextDueDate = String(formData.get("next_due_date") ?? "");
  const intervalValue = Number(formData.get("interval_value") ?? 0);
  const intervalUnit = String(formData.get("interval_unit") ?? "months") as IntervalUnit;
  if (!title || !assetId || !nextDueDate || !intervalValue) return;

  const { error } = await supabase.from("pm_schedules").insert({
    title,
    description: String(formData.get("description") ?? "").trim() || null,
    asset_id: assetId,
    interval_unit: intervalUnit,
    interval_value: intervalValue,
    next_due_date: nextDueDate,
    default_assignee: String(formData.get("default_assignee") ?? "") || null,
    active: true,
    created_by: profile.id,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/pm-schedules");
  redirect("/pm-schedules");
}

export async function togglePmSchedule(id: string, active: boolean) {
  await requireOwner();
  const supabase = await createClient();
  await supabase.from("pm_schedules").update({ active }).eq("id", id);
  revalidatePath("/pm-schedules");
}
