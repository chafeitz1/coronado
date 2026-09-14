"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ImagePlus, Trash2 } from "lucide-react";
import { saveAssetAttachment, deleteAttachment } from "@/app/actions/attachments";
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

export function AssetAttachments({
  assetId,
  currentUserId,
  attachments,
  dict,
}: {
  assetId: string;
  currentUserId: string;
  attachments: AttachmentItem[];
  dict: Dictionary;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (inputRef.current) inputRef.current.value = "";
    if (!file) return;

    setError(null);
    const result = await uploadAttachmentToStorage({ assetId }, currentUserId, file);
    if ("error" in result) {
      setError(result.error);
      return;
    }

    startTransition(async () => {
      const saveResult = await saveAssetAttachment(assetId, result.path, file.name);
      if (saveResult?.error) {
        setError(saveResult.error);
        return;
      }
      router.refresh();
    });
  }

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

      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          type="button"
          disabled={pending}
          onClick={() => inputRef.current?.click()}
          className={`${buttonSecondary} disabled:pointer-events-none disabled:opacity-50`}
        >
          <ImagePlus className="size-4" /> {pending ? dict.workOrderForm.submitPending : dict.assetDetail.addPhoto}
        </button>
        {error && <p className="text-sm text-status-overdue-fg">{error}</p>}
      </div>
    </div>
  );
}
