"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/dictionaries";

export type AttachmentFormState = { error?: string; success?: boolean } | undefined;

const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function uploadAssetAttachment(
  assetId: string,
  _state: AttachmentFormState,
  formData: FormData
): Promise<AttachmentFormState> {
  const profile = await requireUser();
  const dict = getDictionary(profile.locale);

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: dict.attachments.errorMissing };
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { error: dict.attachments.errorType };
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return { error: dict.attachments.errorSize };
  }

  const supabase = await createClient();
  const path = `${assetId}/${profile.id}/${Date.now()}-${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from("attachments")
    .upload(path, file, { contentType: file.type });

  if (uploadError) {
    return { error: dict.attachments.errorUpload };
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
    return { error: dict.attachments.errorSave };
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
