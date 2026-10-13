// Isomorphic (client + server) constants and pure helpers for the shared
// "attachments" storage bucket — asset photos, work order photos/PDFs, the
// optional photo on a purchase item. Plain constants can't live in a
// "use server" file (Next.js only allows async function exports there),
// and a "server-only" file can't be imported from client components, so
// this module has neither marker and both sides import from here.
//
// 20MB, not the platform-typical single-digit-MB default: a scanned or
// phone-photographed multi-page vendor report easily lands in the
// 5-15MB range, and Vercel's serverless functions cap a request body well
// below that regardless of this number — which is why the "add
// attachment" flows upload straight to Supabase Storage from the browser
// (lib/attachments-client.ts) instead of routing the file through a
// Server Action.
export const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;
export const ALLOWED_ATTACHMENT_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

export function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_");
}

// Path convention the "attachments" bucket's storage policies rely on:
// {ownerId}/{uploaderId}/{filename} — the policies only check that the
// second segment is the uploader's own auth.uid().
export function buildAttachmentPath(ownerId: string, uploaderId: string, fileName: string) {
  return `${ownerId}/${uploaderId}/${Date.now()}-${sanitizeFileName(fileName)}`;
}
