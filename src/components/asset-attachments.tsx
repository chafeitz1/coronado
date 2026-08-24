"use client";

import { useActionState, useRef } from "react";
import Image from "next/image";
import { ImagePlus, Trash2 } from "lucide-react";
import { uploadAssetAttachment, deleteAttachment } from "@/app/actions/attachments";
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

export function AssetAttachments({
  assetId,
  attachments,
  dict,
}: {
  assetId: string;
  attachments: AttachmentItem[];
  dict: Dictionary;
}) {
  const uploadAction = uploadAssetAttachment.bind(null, assetId);
  const [state, formAction] = useActionState(uploadAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-3">
      {attachments.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {attachments.map((a) => (
            <div key={a.id} className="group relative aspect-square overflow-hidden rounded-lg border border-hairline">
              <Image src={a.publicUrl} alt={a.fileName} fill unoptimized className="object-cover" />
              {a.canDelete && (
                <form action={deleteAttachment.bind(null, a.id, a.storagePath)} className="absolute right-1 top-1">
                  <ConfirmSubmitButton
                    confirmMessage={dict.assetDetail.deletePhotoConfirm}
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

      <form ref={formRef} action={formAction} className="flex items-center gap-2">
        <input
          ref={inputRef}
          name="file"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          required
          className="hidden"
          onChange={() => formRef.current?.requestSubmit()}
        />
        <button type="button" onClick={() => inputRef.current?.click()} className={buttonSecondary}>
          <ImagePlus className="size-4" /> {dict.assetDetail.addPhoto}
        </button>
        {state?.error && <p className="text-sm text-status-overdue-fg">{state.error}</p>}
      </form>
    </div>
  );
}
