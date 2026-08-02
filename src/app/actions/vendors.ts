"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";

export async function createVendor(formData: FormData) {
  const profile = await requireOwner();
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const { error } = await supabase.from("vendors").insert({
    name,
    trade: String(formData.get("trade") ?? "").trim() || null,
    phone: String(formData.get("phone") ?? "").trim() || null,
    email: String(formData.get("email") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
    created_by: profile.id,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/vendors");
  redirect("/vendors");
}
