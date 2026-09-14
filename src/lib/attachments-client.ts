import { createClient } from "@/lib/supabase/client";
import { MAX_ATTACHMENT_BYTES, ALLOWED_ATTACHMENT_TYPES, buildAttachmentPath } from "@/lib/attachments";

export type AttachmentUploadTarget = { assetId: string; workOrderId?: never } | { workOrderId: string; assetId?: never };

export type AttachmentUploadResult = { path: string } | { error: string };

// Uploads straight from the browser to Supabase Storage — bypassing our
// server entirely for the file bytes — instead of sending the file through
// a Server Action. Vercel's serverless functions cap a request body well
// under the size of a scanned multi-page PDF report, so a Server Action
// upload fails outright (a generic crash page, not our own error message)
// long before it would fail Storage's own limit. The browser already holds
// a valid session (same cookies the SSR client reads), so this still goes
// through the bucket's normal RLS policies — nothing is more exposed than
// the server-side path was.
export async function uploadAttachmentToStorage(
  target: AttachmentUploadTarget,
  userId: string,
  file: File
): Promise<AttachmentUploadResult> {
  if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
    return { error: "Solo se permiten fotos JPG, PNG, WEBP o archivos PDF." };
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return { error: "El archivo no puede pesar más de 20MB." };
  }

  const ownerId = target.assetId ?? target.workOrderId;
  const path = buildAttachmentPath(ownerId, userId, file.name);

  const supabase = createClient();
  const { error } = await supabase.storage.from("attachments").upload(path, file, { contentType: file.type });
  if (error) return { error: error.message };

  return { path };
}
