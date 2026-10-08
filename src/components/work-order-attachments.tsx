"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { FileText, Paperclip, Trash2 } from "lucide-react";
import { saveWorkOrderAttachment, deleteWorkOrderAttachment } from "@/app/actions/work-orders";
import { uploadAttachmentToStorage } from "@/lib/attachments-client";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { buttonSecondary } from "@/lib/ui";
import type { Dictionary } from "@/lib/i18n/dictionaries";

type AttachmentItem = {
  id: string;
  storagePath: string;
  fileName: string;
  publicUrl: string;
  canDelete: boolean;
  kind: "evidence" | "instruction";
};

function isPdf(fileName: string) {
  return fileName.toLowerCase().endsWith(".pdf");
}

// Same "add + grid" pattern as AssetAttachments, but split into a photo
// grid and a PDF list (e.g. a vendor's maintenance report) since a PDF
// can't render as an image thumbnail. Filters the full attachment list
// down to one `kind` — "evidence" (anyone, accumulates over time) or
// "instruction" (owner-only reference material) — so the two render as
// separate sections sharing this one component.
export function WorkOrderAttachments({
  workOrderId,
  currentUserId,
  attachments,
  kind = "evidence",
  canUpload = true,
  dict,
}: {
  workOrderId: string;
  currentUserId: string;
  attachments: AttachmentItem[];
  kind?: "evidence" | "instruction";
  canUpload?: boolean;
  dict: Dictionary;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scoped = attachments.filter((a) => a.kind === kind);
  const photos = scoped.filter((a) => !isPdf(a.fileName));
  const documents = scoped.filter((a) => isPdf(a.fileName));

  // Multi-select: pick several photos at once (Miguel's ask — finishing a
  // task often means several evidence shots, not just one) and upload them
  // all under a single button press. Uploads run in parallel; one failing
  // doesn't block the rest — whatever succeeded still gets saved, and the
  // error names what didn't. Two async steps per file (upload to Storage,
  // then save the DB row) — the save half is kept inside startTransition so
  // `pending` covers the whole batch, not just the uploads.
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (inputRef.current) inputRef.current.value = "";
    if (files.length === 0) return;

    setError(null);
    const uploads = await Promise.all(
      files.map(async (file) => ({ file, result: await uploadAttachmentToStorage({ workOrderId }, currentUserId, file) }))
    );
    const failed = uploads.filter((u) => "error" in u.result);
    const succeeded = uploads.filter(
      (u): u is { file: File; result: { path: string } } => !("error" in u.result)
    );

    if (failed.length > 0) {
      const firstError = (failed[0].result as { error: string }).error;
      setError(failed.length === uploads.length ? firstError : `${succeeded.length} de ${uploads.length} se subieron. ${firstError}`);
    }
    if (succeeded.length === 0) return;

    startTransition(async () => {
      for (const { file, result } of succeeded) {
        const saveResult = await saveWorkOrderAttachment(workOrderId, result.path, file.name, kind);
        if (saveResult?.error) setError(saveResult.error);
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {photos.map((a) => (
            <div key={a.id} className="group relative aspect-square overflow-hidden rounded-lg border border-hairline">
              <Image src={a.publicUrl} alt={a.fileName} fill unoptimized className="object-cover" />
              {a.canDelete && (
                <form action={deleteWorkOrderAttachment.bind(null, a.id, a.storagePath, workOrderId)} className="absolute right-1 top-1">
                  <ConfirmSubmitButton
                    confirmMessage={dict.attachments.deleteConfirm}
                    className="flex size-6 items-center justify-center rounded-full bg-black/60 text-white opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100"
                  >
                    <Trash2 className="size-3.5" />
                  </ConfirmSubmitButton>
                </form>
              )}
            </div>
          ))}
        </div>
      )}

      {documents.length > 0 && (
        <ul className="space-y-1.5">
          {documents.map((a) => (
            <li key={a.id} className="flex items-center gap-2.5 rounded-lg border border-hairline p-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <FileText className="size-4" strokeWidth={2} />
              </span>
              <a
                href={a.publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 flex-1 truncate text-sm font-medium text-ink hover:underline active:underline"
              >
                {a.fileName}
              </a>
              {a.canDelete && (
                <form action={deleteWorkOrderAttachment.bind(null, a.id, a.storagePath, workOrderId)}>
                  <ConfirmSubmitButton
                    confirmMessage={dict.attachments.deleteConfirm}
                    className="flex size-7 shrink-0 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-status-overdue-bg active:bg-status-overdue-bg hover:text-status-overdue-fg active:text-status-overdue-fg"
                  >
                    <Trash2 className="size-3.5" />
                  </ConfirmSubmitButton>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-2">
        {canUpload && (
          <>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              type="button"
              disabled={pending}
              onClick={() => inputRef.current?.click()}
              className={`${buttonSecondary} disabled:pointer-events-none disabled:opacity-50`}
            >
              <Paperclip className="size-4" />{" "}
              {pending
                ? dict.workOrderForm.submitPending
                : kind === "instruction"
                  ? dict.workOrderDetail.addInstructionPhoto
                  : dict.workOrderDetail.addAttachment}
            </button>
          </>
        )}
        {error && <p className="text-sm text-status-overdue-fg">{error}</p>}
      </div>
    </div>
  );
}
