"use client";

import { useTransition } from "react";
import { Lock, RefreshCw, CheckCircle2, SkipForward } from "lucide-react";
import { updateWorkOrderStatus } from "@/app/actions/work-orders";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { WorkOrderStatus } from "@/lib/types/database";

const ICONS: Record<WorkOrderStatus, typeof Lock> = {
  open: Lock,
  in_progress: RefreshCw,
  done: CheckCircle2,
  skipped: SkipForward,
};

const ACTIVE_STYLES: Record<WorkOrderStatus, string> = {
  open: "bg-status-open-bg text-status-open-fg",
  in_progress: "bg-status-progress-bg text-status-progress-fg",
  done: "bg-status-done-bg text-status-done-fg",
  skipped: "bg-canvas-soft text-ink-muted",
};

// Hovering an inactive button previews the color it would switch to, so
// the row reads as clickable instead of a static status legend.
const HOVER_STYLES: Record<WorkOrderStatus, string> = {
  open: "hover:bg-status-open-bg hover:text-status-open-fg",
  in_progress: "hover:bg-status-progress-bg hover:text-status-progress-fg",
  done: "hover:bg-status-done-bg hover:text-status-done-fg",
  skipped: "hover:bg-surface-hover hover:text-ink",
};

const ORDER: WorkOrderStatus[] = ["open", "in_progress", "done", "skipped"];

// A persistent 4-button status picker for the work order detail page —
// same statuses/icons as WorkOrderStatusChip's dropdown, but always
// visible instead of tucked behind a click, since the detail page has
// the room for it.
export function WorkOrderStatusButtons({
  workOrderId,
  status,
  dict,
}: {
  workOrderId: string;
  status: WorkOrderStatus;
  dict: Dictionary;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap gap-1.5">
      {ORDER.map((s) => {
        const Icon = ICONS[s];
        const active = s === status;
        return (
          <button
            key={s}
            type="button"
            disabled={pending}
            onClick={() => {
              if (s === status) return;
              startTransition(() => {
                updateWorkOrderStatus(workOrderId, s);
              });
            }}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-60 ${
              active ? `${ACTIVE_STYLES[s]} hover:brightness-95` : `bg-canvas-soft text-ink-muted ${HOVER_STYLES[s]}`
            }`}
          >
            <Icon className="size-3.5" strokeWidth={2.5} />
            {dict.statuses[s]}
          </button>
        );
      })}
    </div>
  );
}
