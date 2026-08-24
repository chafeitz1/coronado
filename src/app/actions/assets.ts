"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";
import { uploadAttachment } from "@/lib/attachments-server";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { AssetStatus } from "@/lib/types/database";

export type AssetActionState = { ok: true } | { ok: false; error: string } | null;

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

export async function createAsset(
  _prevState: AssetActionState,
  formData: FormData
): Promise<AssetActionState> {
  const profile = await requireOwner();
  const dict = getDictionary(profile.locale);
  const supabase = await createClient();

  const fields = readAssetFields(formData);
  if (!fields.name) return { ok: false, error: dict.assetForm.nameRequired };

  const { data: asset, error } = await supabase
    .from("assets")
    .insert({ ...fields, created_by: profile.id })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  const photo = formData.get("photo");
  if (photo instanceof File && photo.size > 0) {
    await uploadAttachment(supabase, { assetId: asset.id }, profile.id, photo);
  }

  revalidatePath("/assets", "layout");
  return { ok: true };
}

export async function updateAsset(
  assetId: string,
  _prevState: AssetActionState,
  formData: FormData
): Promise<AssetActionState> {
  const profile = await requireOwner();
  const dict = getDictionary(profile.locale);
  const supabase = await createClient();

  const fields = readAssetFields(formData);
  if (!fields.name) return { ok: false, error: dict.assetForm.nameRequired };

  const { error } = await supabase.from("assets").update(fields).eq("id", assetId);
  if (error) return { ok: false, error: error.message };

  const photo = formData.get("photo");
  if (photo instanceof File && photo.size > 0) {
    await uploadAttachment(supabase, { assetId }, profile.id, photo);
  }

  revalidatePath("/assets", "layout");
  return { ok: true };
}

export async function deleteAsset(assetId: string): Promise<{ error?: string }> {
  await requireOwner();
  const supabase = await createClient();

  const { error } = await supabase.from("assets").delete().eq("id", assetId);
  if (error) return { error: error.message };

  revalidatePath("/assets", "layout");
  return {};
}

// Marking an asset inactive (damaged, disposed, sold...) instead of
// deleting it keeps its full maintenance/attachment history intact —
// deleteAsset above still exists separately for a genuine mistaken entry.
export async function updateAssetStatus(assetId: string, status: AssetStatus) {
  await requireOwner();
  const supabase = await createClient();

  const { error } = await supabase.from("assets").update({ status }).eq("id", assetId);
  if (error) throw new Error(error.message);

  revalidatePath("/assets", "layout");
}
