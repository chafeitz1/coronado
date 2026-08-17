"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type ProfileFormState = { error?: string; success?: boolean } | undefined;

export async function updateProfile(
  _state: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const profile = await requireUser();
  const supabase = await createClient();

  const fullName = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  if (!fullName) {
    return { error: "El nombre no puede estar vacío." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName, phone: phone || null })
    .eq("id", profile.id);

  if (error) {
    return { error: "No se pudo guardar. Intenta de nuevo." };
  }

  revalidatePath("/profile", "layout");
  return { success: true };
}

export async function updatePassword(
  _state: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  await requireUser();

  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");

  if (password.length < 8) {
    return { error: "La contraseña debe tener al menos 8 caracteres." };
  }
  if (password !== confirmPassword) {
    return { error: "Las contraseñas no coinciden." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: "No se pudo cambiar la contraseña. Intenta de nuevo." };
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

  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Elige una foto primero." };
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { error: "Solo se permiten fotos JPG, PNG o WEBP." };
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return { error: "La foto no puede pesar más de 5MB." };
  }

  const supabase = await createClient();
  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${profile.id}/avatar.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) {
    return { error: "No se pudo subir la foto. Intenta de nuevo." };
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
    return { error: "La foto se subió pero no se pudo guardar. Intenta de nuevo." };
  }

  revalidatePath("/profile", "layout");
  return { success: true };
}
