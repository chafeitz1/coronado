"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";

export async function createAsset(formData: FormData) {
  const profile = await requireOwner();
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const { error } = await supabase.from("assets").insert({
    name,
    category: String(formData.get("category") ?? "").trim() || null,
    location: String(formData.get("location") ?? "").trim() || null,
    purchase_date: String(formData.get("purchase_date") ?? "") || null,
    warranty_expires: String(formData.get("warranty_expires") ?? "") || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
    created_by: profile.id,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/assets");
  redirect("/assets");
}
