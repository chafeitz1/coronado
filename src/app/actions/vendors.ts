"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";
import type { VendorTrade } from "@/lib/types/database";

export type VendorActionState = { ok: true } | { ok: false; error: string } | null;

function readVendorFields(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim(),
    contact_name: String(formData.get("contact_name") ?? "").trim() || null,
    trades: formData.getAll("trades").map(String) as VendorTrade[],
    phone: String(formData.get("phone") ?? "").trim() || null,
    email: String(formData.get("email") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
    is_emergency: formData.get("is_emergency") === "on",
  };
}

export async function createVendor(
  _prevState: VendorActionState,
  formData: FormData
): Promise<VendorActionState> {
  const profile = await requireOwner();
  const supabase = await createClient();

  const fields = readVendorFields(formData);
  if (!fields.name) return { ok: false, error: "El nombre es obligatorio." };

  const { error } = await supabase.from("vendors").insert({ ...fields, created_by: profile.id });
  if (error) return { ok: false, error: error.message };

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
