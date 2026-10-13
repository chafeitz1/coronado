// Client-side downscale + re-encode before a photo ever reaches Storage.
// Evidence/instruction photos come straight off a phone camera (often
// several MB at full resolution) and accumulate forever — one more per
// task completion, with no retention policy — so shrinking them here
// matters far more for storage growth than compressing a one-off avatar
// or purchase photo would. PDFs and already-small files pass through
// untouched.
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.8;
const SKIP_BELOW_BYTES = 400 * 1024;

export async function compressImageFile(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.size <= SKIP_BELOW_BYTES) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
    // Keep the original if re-encoding somehow came out bigger (rare, but
    // possible for an already-compressed small-dimension image).
    if (!blob || blob.size >= file.size) return file;

    return new File([blob], file.name, { type: "image/jpeg" });
  } catch {
    // Unsupported format, browser quirk, canvas tainted, etc. — upload
    // the original rather than block the user over a nice-to-have.
    return file;
  }
}
