"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type AttachmentFormState = { error?: string; success?: boolean } | undefined;

const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function uploadAssetAttachment(
  assetId: string,
  _state: AttachmentFormState,
  formData: FormData
): Promise<AttachmentFormState> {
  const profile = await requireUser();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Elige una foto primero." };
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { error: "Solo se permiten fotos JPG, PNG o WEBP." };
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return { error: "La foto no puede pesar más de 5MB." };
  }

  const supabase = await createClient();
  const path = `${assetId}/${profile.id}/${Date.now()}-${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from("attachments")
    .upload(path, file, { contentType: file.type });

  if (uploadError) {
    return { error: "No se pudo subir la foto. Intenta de nuevo." };
  }

  const { error: insertError } = await supabase.from("attachments").insert({
    asset_id: assetId,
    work_order_id: null,
    storage_path: path,
    file_name: file.name,
    uploaded_by: profile.id,
  });

  if (insertError) {
    await supabase.storage.from("attachments").remove([path]);
    return { error: "No se pudo guardar la foto. Intenta de nuevo." };
  }

  revalidatePath(`/assets/${assetId}`);
  return { success: true };
}

export async function deleteAttachment(attachmentId: string, storagePath: string, assetId: string) {
  await requireUser();
  const supabase = await createClient();

  await supabase.storage.from("attachments").remove([storagePath]);
  const { error } = await supabase.from("attachments").delete().eq("id", attachmentId);
  if (error) throw new Error(error.message);

  revalidatePath(`/assets/${assetId}`);
}
