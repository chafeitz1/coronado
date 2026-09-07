"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Lock, ChevronDown, RefreshCw, CheckCircle2, SkipForward } from "lucide-react";
import { updateWorkOrderStatus } from "@/app/actions/work-orders";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { WorkOrderStatus } from "@/lib/types/database";

const ICONS: Record<WorkOrderStatus, typeof Lock> = {
  open: Lock,
  in_progress: RefreshCw,
  done: CheckCircle2,
  skipped: SkipForward,
};

const STYLES: Record<WorkOrderStatus, string> = {
  open: "bg-status-open-bg text-status-open-fg",
  in_progress: "bg-status-progress-bg text-status-progress-fg",
  done: "bg-status-done-bg text-status-done-fg",
  skipped: "bg-canvas-soft text-ink-muted",
};

// Same idea as WorkOrderStatusButtons: hovering a dropdown option
// previews the color it would switch to, instead of a flat generic
// hover — same colors, same affordance, whichever control you use.
const HOVER_STYLES: Record<WorkOrderStatus, string> = {
  open: "hover:bg-status-open-bg hover:text-status-open-fg",
  in_progress: "hover:bg-status-progress-bg hover:text-status-progress-fg",
  done: "hover:bg-status-done-bg hover:text-status-done-fg",
  skipped: "hover:bg-surface-hover hover:text-ink",
};

const ORDER: WorkOrderStatus[] = ["open", "in_progress", "done", "skipped"];

// Inline status chip you can change right from a list/table row, without
// opening the work order — mirrors MaintainX's "🔒 Open ⌄" row control.
export function WorkOrderStatusChip({
  workOrderId,
  status,
  canEdit,
  dict,
}: {
  workOrderId: string;
  status: WorkOrderStatus;
  canEdit: boolean;
  dict: Dictionary;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  const Icon = ICONS[status];

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [open]);

  const label = dict.statuses[status];

  if (!canEdit) {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${STYLES[status]}`}>
        <Icon className="size-3" strokeWidth={2.5} />
        {label}
      </span>
    );
  }

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        disabled={pending}
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition-opacity disabled:opacity-60 ${STYLES[status]}`}
      >
        <Icon className="size-3" strokeWidth={2.5} />
        {label}
        <ChevronDown className="size-3" />
      </button>
      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute left-0 top-full z-20 mt-1 w-36 overflow-hidden rounded-lg border border-hairline bg-surface py-1 shadow-[var(--shadow-soft)]"
        >
          {ORDER.map((s) => {
            const OptIcon = ICONS[s];
            return (
              <button
                key={s}
                type="button"
                onClick={(e) => {
                  // Stopping propagation on the dropdown container isn't
                  // enough to stop a Link ancestor's own navigation — this
                  // button needs its own preventDefault too, same as the
                  // toggle button above.
                  e.preventDefault();
                  e.stopPropagation();
                  setOpen(false);
                  startTransition(() => {
                    updateWorkOrderStatus(workOrderId, s);
                  });
                }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${HOVER_STYLES[s]} ${
                  s === status ? "font-medium text-primary" : "text-ink-secondary"
                }`}
              >
                <OptIcon className="size-3.5" /> {dict.statuses[s]}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
