"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { deleteAsset } from "@/app/actions/assets";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { format } from "@/lib/i18n/dictionaries";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export function AssetRowMenu({
  assetId,
  assetName,
  dict,
}: {
  assetId: string;
  assetName: string;
  dict: Dictionary;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={dict.assetDetail.edit}
        className="flex size-8 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-canvas-soft hover:text-ink"
      >
        <MoreVertical className="size-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-10 mt-1 w-36 overflow-hidden rounded-lg border border-hairline bg-surface py-1 shadow-[var(--shadow-soft)]">
          <Link
            href={`/assets/${assetId}/edit`}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-ink-secondary hover:bg-surface-hover"
          >
            <Pencil className="size-3.5" /> {dict.assetDetail.edit}
          </Link>
          <form action={deleteAsset.bind(null, assetId)}>
            <ConfirmSubmitButton
              confirmMessage={format(dict.assetDetail.deleteConfirm, { name: assetName })}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-status-overdue-fg hover:bg-status-overdue-bg"
            >
              <Trash2 className="size-3.5" /> {dict.assetDetail.delete}
            </ConfirmSubmitButton>
          </form>
        </div>
      )}
    </div>
  );
}
