import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
export const ALLOWED_ATTACHMENT_TYPES = ["image/jpeg", "image/png", "image/webp"];

// Shared by the "add a photo" gallery action and by createAsset/updateAsset
// (which attach a photo inline as part of saving the asset itself).
export async function uploadAssetPhoto(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  assetId: string,
  userId: string,
  file: File
) {
  if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
    throw new Error("Solo se permiten fotos JPG, PNG o WEBP.");
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    throw new Error("La foto no puede pesar más de 5MB.");
  }

  const path = `${assetId}/${userId}/${Date.now()}-${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from("attachments")
    .upload(path, file, { contentType: file.type });
  if (uploadError) throw new Error(uploadError.message);

  const { error: insertError } = await supabase.from("attachments").insert({
    asset_id: assetId,
    work_order_id: null,
    storage_path: path,
    file_name: file.name,
    uploaded_by: userId,
  });
  if (insertError) {
    await supabase.storage.from("attachments").remove([path]);
    throw new Error(insertError.message);
  }
}
