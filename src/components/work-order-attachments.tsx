"use client";

import { useActionState, useRef } from "react";
import Image from "next/image";
import { FileText, Paperclip, Trash2 } from "lucide-react";
import { uploadWorkOrderAttachment, deleteWorkOrderAttachment } from "@/app/actions/work-orders";
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
  attachments,
  dict,
}: {
  workOrderId: string;
  attachments: AttachmentItem[];
  dict: Dictionary;
}) {
  const uploadAction = uploadWorkOrderAttachment.bind(null, workOrderId);
  const [state, formAction] = useActionState(uploadAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const photos = attachments.filter((a) => !isPdf(a.fileName));
  const documents = attachments.filter((a) => isPdf(a.fileName));

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
                    className="flex size-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
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
                className="min-w-0 flex-1 truncate text-sm font-medium text-ink hover:underline"
              >
                {a.fileName}
              </a>
              {a.canDelete && (
                <form action={deleteWorkOrderAttachment.bind(null, a.id, a.storagePath, workOrderId)}>
                  <ConfirmSubmitButton
                    confirmMessage={dict.attachments.deleteConfirm}
                    className="flex size-7 shrink-0 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-status-overdue-bg hover:text-status-overdue-fg"
                  >
                    <Trash2 className="size-3.5" />
                  </ConfirmSubmitButton>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}

      <form ref={formRef} action={formAction} className="flex items-center gap-2">
        <input
          ref={inputRef}
          name="file"
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          required
          className="hidden"
          onChange={() => formRef.current?.requestSubmit()}
        />
        <button type="button" onClick={() => inputRef.current?.click()} className={buttonSecondary}>
          <Paperclip className="size-4" /> {dict.workOrderDetail.addAttachment}
        </button>
        {state?.error && <p className="text-sm text-status-overdue-fg">{state.error}</p>}
      </form>
    </div>
  );
}
