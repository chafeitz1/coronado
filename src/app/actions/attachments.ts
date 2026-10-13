"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { saveAttachmentRecord } from "@/lib/attachments-server";

export type AttachmentFormState = { error?: string; success?: boolean } | undefined;

// The file itself is already sitting in Storage by the time this runs — see
// components/asset-attachments.tsx, which uploads directly from the browser
// (lib/attachments-client.ts) before calling this to save the DB row. Keeps
// a big file's bytes off this Server Action's request body, which Vercel
// caps well under what a large phone photo needs.
export async function saveAssetAttachment(assetId: string, path: string, fileName: string): Promise<AttachmentFormState> {
  const profile = await requireUser();
  const supabase = await createClient();

  try {
    await saveAttachmentRecord(supabase, { assetId }, profile.id, path, fileName);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo guardar la foto." };
  }

  revalidatePath("/assets", "layout");
  return { success: true };
}

export async function deleteAttachment(attachmentId: string, storagePath: string) {
  await requireUser();
  const supabase = await createClient();

  await supabase.storage.from("attachments").remove([storagePath]);
  const { error } = await supabase.from("attachments").delete().eq("id", attachmentId);
  if (error) throw new Error(error.message);

  revalidatePath("/assets", "layout");
}
