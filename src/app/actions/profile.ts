"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/types/database";

export type ProfileFormState = { error?: string; success?: boolean } | undefined;

export async function updateProfile(
  _state: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const profile = await requireUser();
  const dict = getDictionary(profile.locale);
  const supabase = await createClient();

  const fullName = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  if (!fullName) {
    return { error: dict.profileInfoForm.errorEmpty };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName, phone: phone || null })
    .eq("id", profile.id);

  if (error) {
    return { error: dict.profileInfoForm.errorGeneric };
  }

  revalidatePath("/profile", "layout");
  return { success: true };
}

export async function updatePassword(
  _state: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const profile = await requireUser();
  const dict = getDictionary(profile.locale);

  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");

  if (password.length < 8) {
    return { error: dict.passwordForm.errorLength };
  }
  if (password !== confirmPassword) {
    return { error: dict.passwordForm.errorMismatch };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: dict.passwordForm.errorGeneric };
  }

  return { success: true };
}

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function uploadAvatar(
  _state: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const profile = await requireUser();
  const dict = getDictionary(profile.locale);

  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) {
    return { error: dict.avatarForm.errorMissing };
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { error: dict.avatarForm.errorType };
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return { error: dict.avatarForm.errorSize };
  }

  const supabase = await createClient();
  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${profile.id}/avatar.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) {
    return { error: dict.avatarForm.errorGeneric };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(path);
  // Cache-bust so the new photo shows immediately even though the path is stable.
  const avatarUrl = `${publicUrl}?v=${Date.now()}`;

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", profile.id);

  if (updateError) {
    return { error: dict.avatarForm.errorGeneric };
  }

  revalidatePath("/profile", "layout");
  return { success: true };
}

export async function updateLocale(locale: Locale) {
  const profile = await requireUser();
  const supabase = await createClient();

  await supabase.from("profiles").update({ locale }).eq("id", profile.id);

  revalidatePath("/", "layout");
}
