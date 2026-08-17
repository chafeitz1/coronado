"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";
import type { VendorTrade } from "@/lib/types/database";

function readVendorFields(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim(),
    trade: (String(formData.get("trade") ?? "").trim() || null) as VendorTrade | null,
    phone: String(formData.get("phone") ?? "").trim() || null,
    email: String(formData.get("email") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
  };
}

export async function createVendor(formData: FormData) {
  const profile = await requireOwner();
  const supabase = await createClient();

  const fields = readVendorFields(formData);
  if (!fields.name) return;

  const { error } = await supabase.from("vendors").insert({ ...fields, created_by: profile.id });

  if (error) throw new Error(error.message);

  revalidatePath("/vendors");
  redirect("/vendors");
}

export async function updateVendor(vendorId: string, formData: FormData) {
  await requireOwner();
  const supabase = await createClient();

  const fields = readVendorFields(formData);
  if (!fields.name) return;

  const { error } = await supabase.from("vendors").update(fields).eq("id", vendorId);

  if (error) throw new Error(error.message);

  revalidatePath("/vendors");
  revalidatePath(`/vendors/${vendorId}`);
  redirect(`/vendors/${vendorId}`);
}

export async function deleteVendor(vendorId: string) {
  await requireOwner();
  const supabase = await createClient();

  const { error } = await supabase.from("vendors").delete().eq("id", vendorId);
  if (error) throw new Error(error.message);

  revalidatePath("/vendors");
  redirect("/vendors");
}
