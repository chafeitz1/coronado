"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser, requireOwner } from "@/lib/auth";

// Owner-only template editing — the routine itself (times + what to do) is
// fixed reference material staff read, not something they maintain.
export async function createRoutineItem(formData: FormData) {
  const profile = await requireOwner();
  const supabase = await createClient();

  const time = String(formData.get("time") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const steps = String(formData.get("steps") ?? "").trim() || null;
  if (!time || !title) throw new Error("Hora y título son obligatorios.");

  const { error } = await supabase.from("routine_items").insert({ time, title, steps, created_by: profile.id });
  if (error) throw new Error(error.message);

  revalidatePath("/");
}

export async function updateRoutineItem(itemId: string, formData: FormData) {
  await requireOwner();
  const supabase = await createClient();

  const time = String(formData.get("time") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const steps = String(formData.get("steps") ?? "").trim() || null;
  if (!time || !title) throw new Error("Hora y título son obligatorios.");

  const { error } = await supabase.from("routine_items").update({ time, title, steps }).eq("id", itemId);
  if (error) throw new Error(error.message);

  revalidatePath("/");
}

export async function deleteRoutineItem(itemId: string) {
  await requireOwner();
  const supabase = await createClient();

  const { error } = await supabase.from("routine_items").delete().eq("id", itemId);
  if (error) throw new Error(error.message);

  revalidatePath("/");
}

// Staff or owner — whoever's actually on site is the one who knows
// whether guests/residents are in the house right now. RLS backs this up
// (house_occupancy_update), so a resident calling this would fail there
// even though requireUser alone doesn't block them.
export async function setGuestsPresent(present: boolean) {
  const profile = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from("house_occupancy")
    .update({ guests_present: present, updated_by: profile.id, updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (error) throw new Error(error.message);

  revalidatePath("/");
}
