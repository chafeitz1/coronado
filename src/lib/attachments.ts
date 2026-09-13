// Shared by any "upload a photo" flow that uses the "attachments" storage
// bucket (asset photos, the optional photo on a purchase item, etc.).
// Plain constants can't live in a "use server" file — Next.js only allows
// async function exports there — hence this separate module.
export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
export const ALLOWED_ATTACHMENT_TYPES = ["image/jpeg", "image/png", "image/webp"];
