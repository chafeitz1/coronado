import { createClient } from "@/lib/supabase/client";
import { MAX_ATTACHMENT_BYTES, ALLOWED_ATTACHMENT_TYPES, buildAttachmentPath } from "@/lib/attachments";
import { compressImageFile } from "@/lib/image-compress";

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

  // Downscale/re-encode images before they ever reach Storage — a no-op
  // for PDFs and already-small files. Checked against the size limit
  // after compressing, not before, so a large-but-compressible photo
  // still gets a fair shot at fitting under it.
  const uploadFile = await compressImageFile(file);
  if (uploadFile.size > MAX_ATTACHMENT_BYTES) {
    return { error: "El archivo no puede pesar más de 20MB." };
  }

  const ownerId = target.assetId ?? target.workOrderId;
  const path = buildAttachmentPath(ownerId, userId, uploadFile.name);

  const supabase = createClient();
  const { error } = await supabase.storage
    .from("attachments")
    .upload(path, uploadFile, { contentType: uploadFile.type });
  if (error) return { error: error.message };

  return { path };
}
