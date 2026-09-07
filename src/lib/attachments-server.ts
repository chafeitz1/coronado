import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
export const ALLOWED_ATTACHMENT_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

type AttachmentTarget = { assetId: string; workOrderId?: never } | { workOrderId: string; assetId?: never };

// Shared by the "add a photo" gallery actions and by createAsset/updateAsset/
// createWorkOrder (which attach a photo inline as part of saving the record
// itself, rather than as a separate follow-up step).
export async function uploadAttachment(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  target: AttachmentTarget,
  userId: string,
  file: File
) {
  if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
    throw new Error("Solo se permiten fotos JPG, PNG, WEBP o archivos PDF.");
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    throw new Error("La foto no puede pesar más de 5MB.");
  }

  const ownerId = target.assetId ?? target.workOrderId;
  // Supabase Storage rejects object keys built from an unsanitized
  // filename (e.g. a phone screenshot's default "Screenshot 2026-08-24 at
  // 12.19.22 PM.png" — the spaces make it an "Invalid key") — strip it
  // down to safe characters before using it in the path.
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "_");
  const path = `${ownerId}/${userId}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("attachments")
    .upload(path, file, { contentType: file.type });
  if (uploadError) throw new Error(uploadError.message);

  const { error: insertError } = await supabase.from("attachments").insert({
    asset_id: target.assetId ?? null,
    work_order_id: target.workOrderId ?? null,
    storage_path: path,
    file_name: file.name,
    uploaded_by: userId,
  });
  if (insertError) {
    await supabase.storage.from("attachments").remove([path]);
    throw new Error(insertError.message);
  }
}
