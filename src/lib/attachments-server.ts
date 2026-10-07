import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { MAX_ATTACHMENT_BYTES, ALLOWED_ATTACHMENT_TYPES, buildAttachmentPath } from "@/lib/attachments";

export type AttachmentTarget = { assetId: string; workOrderId?: never } | { workOrderId: string; assetId?: never };

// Used by createAsset/updateAsset/createWorkOrder, which attach a photo
// inline as part of saving the record itself (a normal-sized form
// submission, not a standalone big-file upload) rather than as a separate
// follow-up step — so routing the file through the Server Action here is
// fine. The standalone "add attachment" flows (asset/work-order galleries,
// where a scanned PDF report is a real possibility) upload straight to
// Storage from the browser instead — see lib/attachments-client.ts — and
// only call saveAttachmentRecord below once the file is already up there.
export async function uploadAttachment(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  target: AttachmentTarget,
  userId: string,
  file: File,
  kind: "evidence" | "instruction" = "evidence"
) {
  if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
    throw new Error("Solo se permiten fotos JPG, PNG, WEBP o archivos PDF.");
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    throw new Error("El archivo no puede pesar más de 20MB.");
  }

  const ownerId = target.assetId ?? target.workOrderId;
  const path = buildAttachmentPath(ownerId, userId, file.name);

  const { error: uploadError } = await supabase.storage
    .from("attachments")
    .upload(path, file, { contentType: file.type });
  if (uploadError) throw new Error(uploadError.message);

  await saveAttachmentRecord(supabase, target, userId, path, file.name, kind);
}

// Inserts the DB row for a file that's already sitting in Storage —
// used both by uploadAttachment above (server-side path) and by the
// "use server" actions that back the direct-from-browser upload flows.
export async function saveAttachmentRecord(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  target: AttachmentTarget,
  userId: string,
  path: string,
  fileName: string,
  kind: "evidence" | "instruction" = "evidence"
) {
  const { error: insertError } = await supabase.from("attachments").insert({
    asset_id: target.assetId ?? null,
    work_order_id: target.workOrderId ?? null,
    storage_path: path,
    file_name: fileName,
    uploaded_by: userId,
    kind,
  });
  if (insertError) {
    await supabase.storage.from("attachments").remove([path]);
    throw new Error(insertError.message);
  }
}
