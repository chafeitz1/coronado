"use client";

import { useEffect, useRef, useState } from "react";
import { MoreVertical, Pencil, Power, Trash2 } from "lucide-react";
import { deleteAsset, updateAssetStatus } from "@/app/actions/assets";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { SubmitButton } from "@/components/ui/submit-button";
import { format } from "@/lib/i18n/dictionaries";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { AssetStatus } from "@/lib/types/database";

export function AssetRowMenu({
  assetId,
  assetName,
  status = "active",
  dict,
  onEdit,
  variant = "ghost",
}: {
  assetId: string;
  assetName: string;
  status?: AssetStatus;
  dict: Dictionary;
  onEdit: () => void;
  // "ghost" sits on plain surface (list rows); "overlay" sits on top of a
  // photo (gallery cards) and needs its own backdrop to stay legible/tappable
  // against whatever the photo looks like.
  variant?: "ghost" | "overlay";
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
        className={
          variant === "overlay"
            ? "flex size-8 items-center justify-center text-ink drop-shadow-[0_1px_2px_rgba(255,255,255,0.9)] transition-opacity hover:opacity-70 active:opacity-70"
            : "flex size-8 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-canvas-soft active:bg-canvas-soft hover:text-ink active:text-ink"
        }
      >
        <MoreVertical className="size-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-lg border border-hairline bg-surface py-1 shadow-[var(--shadow-soft)]">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink-secondary hover:bg-surface-hover active:bg-surface-hover"
          >
            <Pencil className="size-3.5" /> {dict.assetDetail.edit}
          </button>
          <form
            action={updateAssetStatus.bind(null, assetId, status === "active" ? "inactive" : "active")}
            onSubmit={() => setOpen(false)}
          >
            <SubmitButton
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink-secondary hover:bg-surface-hover active:bg-surface-hover"
              pendingLabel="..."
            >
              <Power className="size-3.5" />
              {status === "active" ? dict.assetDetail.markInactive : dict.assetDetail.markActive}
            </SubmitButton>
          </form>
          <form
            action={async () => {
              await deleteAsset(assetId);
            }}
          >
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
