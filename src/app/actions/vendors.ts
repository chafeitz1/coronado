"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";
import type { VendorTrade } from "@/lib/types/database";

export type VendorActionState = { ok: true } | { ok: false; error: string } | null;

function readVendorFields(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim(),
    trades: formData.getAll("trades").map(String) as VendorTrade[],
    notes: String(formData.get("notes") ?? "").trim() || null,
    is_emergency: formData.get("is_emergency") === "on",
  };
}

// Contact rows are submitted as parallel arrays (one entry per row across
// all four fields) rather than indexed field names — simpler to build in
// the client and simpler to zip back together here.
function readContacts(formData: FormData) {
  const names = formData.getAll("contact_name").map(String);
  const roles = formData.getAll("role_label").map(String);
  const phones = formData.getAll("contact_phone").map(String);
  const emails = formData.getAll("contact_email").map(String);

  return names
    .map((_, i) => ({
      contact_name: names[i].trim() || null,
      role_label: roles[i]?.trim() || null,
      phone: phones[i]?.trim() || null,
      email: emails[i]?.trim() || null,
      position: i,
    }))
    .filter((c) => c.contact_name || c.role_label || c.phone || c.email);
}

export async function createVendor(
  _prevState: VendorActionState,
  formData: FormData
): Promise<VendorActionState> {
  const profile = await requireOwner();
  const supabase = await createClient();

  const fields = readVendorFields(formData);
  if (!fields.name) return { ok: false, error: "El nombre es obligatorio." };

  const { data: vendor, error } = await supabase
    .from("vendors")
    .insert({ ...fields, created_by: profile.id })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  const contacts = readContacts(formData);
  if (contacts.length > 0) {
    const { error: contactsError } = await supabase
      .from("vendor_contacts")
      .insert(contacts.map((c) => ({ ...c, vendor_id: vendor.id })));
    if (contactsError) return { ok: false, error: contactsError.message };
  }

  revalidatePath("/directory");
  return { ok: true };
}

export async function updateVendor(
  vendorId: string,
  _prevState: VendorActionState,
  formData: FormData
): Promise<VendorActionState> {
  await requireOwner();
  const supabase = await createClient();

  const fields = readVendorFields(formData);
  if (!fields.name) return { ok: false, error: "El nombre es obligatorio." };

  const { error } = await supabase.from("vendors").update(fields).eq("id", vendorId);
  if (error) return { ok: false, error: error.message };

  // Simplest correct way to reconcile an arbitrary add/remove/reorder of
  // contact rows: replace the set rather than diffing it.
  const { error: deleteError } = await supabase.from("vendor_contacts").delete().eq("vendor_id", vendorId);
  if (deleteError) return { ok: false, error: deleteError.message };

  const contacts = readContacts(formData);
  if (contacts.length > 0) {
    const { error: contactsError } = await supabase
      .from("vendor_contacts")
      .insert(contacts.map((c) => ({ ...c, vendor_id: vendorId })));
    if (contactsError) return { ok: false, error: contactsError.message };
  }

  revalidatePath("/directory");
  return { ok: true };
}

export async function deleteVendor(vendorId: string): Promise<{ error?: string }> {
  await requireOwner();
  const supabase = await createClient();

  const { error } = await supabase.from("vendors").delete().eq("id", vendorId);
  if (error) return { error: error.message };

  revalidatePath("/directory");
  return {};
}

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function uploadVendorAvatar(
  vendorId: string,
  _prevState: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string }> {
  await requireOwner();

  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) return { error: "Elige una foto primero." };
  if (!ALLOWED_AVATAR_TYPES.includes(file.type)) return { error: "Solo se permiten fotos JPG, PNG o WEBP." };
  if (file.size > MAX_AVATAR_BYTES) return { error: "La foto no puede pesar más de 5MB." };

  const supabase = await createClient();
  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `vendor-${vendorId}/avatar.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (uploadError) return { error: uploadError.message };

  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(path);
  const avatarUrl = `${publicUrl}?v=${Date.now()}`;

  const { error: updateError } = await supabase.from("vendors").update({ avatar_url: avatarUrl }).eq("id", vendorId);
  if (updateError) return { error: updateError.message };

  revalidatePath("/directory");
  return {};
}
