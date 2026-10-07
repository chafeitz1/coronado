"use client";

import { useEffect, useRef, useState } from "react";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { deleteWorkOrder } from "@/app/actions/work-orders";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { format } from "@/lib/i18n/dictionaries";
import type { Dictionary } from "@/lib/i18n/dictionaries";

// Same dropdown pattern as AssetRowMenu, but Editar switches
// WorkOrderDetailContent into its inline edit form instead of navigating —
// a route change would drop whichever List/Calendar/Board view (and its
// ?display= param) the user had open. Eliminar is owner-only (matches the
// work_orders_delete_owner RLS policy).
export function WorkOrderMenu({
  workOrderId,
  workOrderTitle,
  canEdit,
  canDelete,
  onEdit,
  dict,
}: {
  workOrderId: string;
  workOrderTitle: string;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: () => void;
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

  if (!canEdit && !canDelete) return null;

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={dict.workOrderDetail.edit}
        className="flex size-8 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-canvas-soft active:bg-canvas-soft hover:text-ink active:text-ink"
      >
        <MoreVertical className="size-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-lg border border-hairline bg-surface py-1 shadow-[var(--shadow-soft)]">
          {canEdit && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onEdit();
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink-secondary hover:bg-surface-hover active:bg-surface-hover"
            >
              <Pencil className="size-3.5" /> {dict.workOrderDetail.edit}
            </button>
          )}
          {canDelete && (
            <form action={deleteWorkOrder.bind(null, workOrderId)}>
              <ConfirmSubmitButton
                confirmMessage={format(dict.workOrderDetail.deleteConfirm, { title: workOrderTitle })}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-status-overdue-fg hover:bg-status-overdue-bg active:bg-status-overdue-bg"
              >
                <Trash2 className="size-3.5" /> {dict.workOrderDetail.delete}
              </ConfirmSubmitButton>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
