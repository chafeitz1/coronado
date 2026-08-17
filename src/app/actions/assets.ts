"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";

function readAssetFields(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim(),
    category: String(formData.get("category") ?? "").trim() || null,
    location: String(formData.get("location") ?? "").trim() || null,
    brand: String(formData.get("brand") ?? "").trim() || null,
    model: String(formData.get("model") ?? "").trim() || null,
    serial_number: String(formData.get("serial_number") ?? "").trim() || null,
    preferred_vendor_id: String(formData.get("preferred_vendor_id") ?? "").trim() || null,
    purchase_date: String(formData.get("purchase_date") ?? "").trim() || null,
    warranty_expires: String(formData.get("warranty_expires") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
  };
}

export async function createAsset(formData: FormData) {
  const profile = await requireOwner();
  const supabase = await createClient();

  const fields = readAssetFields(formData);
  if (!fields.name) return;

  const { error } = await supabase.from("assets").insert({ ...fields, created_by: profile.id });

  if (error) throw new Error(error.message);

  revalidatePath("/assets");
  redirect("/assets?created=1");
}

export async function updateAsset(assetId: string, formData: FormData) {
  await requireOwner();
  const supabase = await createClient();

  const fields = readAssetFields(formData);
  if (!fields.name) return;

  const { error } = await supabase.from("assets").update(fields).eq("id", assetId);

  if (error) throw new Error(error.message);

  revalidatePath("/assets");
  revalidatePath(`/assets/${assetId}`);
  redirect(`/assets/${assetId}?updated=1`);
}

export async function deleteAsset(assetId: string) {
  await requireOwner();
  const supabase = await createClient();

  const { error } = await supabase.from("assets").delete().eq("id", assetId);
  if (error) throw new Error(error.message);

  revalidatePath("/assets");
  redirect("/assets?deleted=1");
}
