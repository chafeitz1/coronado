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
};

function isPdf(fileName: string) {
  return fileName.toLowerCase().endsWith(".pdf");
}

// Same "add + grid" pattern as AssetAttachments, but split into a photo
// grid and a PDF list (e.g. a vendor's maintenance report) since a PDF
// can't render as an image thumbnail.
export function WorkOrderAttachments({
  workOrderId,
  currentUserId,
  attachments,
  dict,
}: {
  workOrderId: string;
  currentUserId: string;
  attachments: AttachmentItem[];
  dict: Dictionary;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const photos = attachments.filter((a) => !isPdf(a.fileName));
  const documents = attachments.filter((a) => isPdf(a.fileName));

  // Two async steps (upload to Storage, then save the DB row) — kept
  // outside startTransition so `pending` covers the whole thing, not just
  // the second half.
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (inputRef.current) inputRef.current.value = "";
    if (!file) return;

    setError(null);
    const result = await uploadAttachmentToStorage({ workOrderId }, currentUserId, file);
    if ("error" in result) {
      setError(result.error);
      return;
    }

    startTransition(async () => {
      const saveResult = await saveWorkOrderAttachment(workOrderId, result.path, file.name);
      if (saveResult?.error) {
        setError(saveResult.error);
        return;
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
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          type="button"
          disabled={pending}
          onClick={() => inputRef.current?.click()}
          className={`${buttonSecondary} disabled:pointer-events-none disabled:opacity-50`}
        >
          <Paperclip className="size-4" /> {pending ? dict.workOrderForm.submitPending : dict.workOrderDetail.addAttachment}
        </button>
        {error && <p className="text-sm text-status-overdue-fg">{error}</p>}
      </div>
    </div>
  );
}
