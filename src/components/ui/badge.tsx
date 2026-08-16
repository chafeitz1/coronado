import { Lock, RefreshCw, CheckCircle2 } from "lucide-react";
import type { WorkOrderPriority, WorkOrderStatus } from "@/lib/types/database";

const baseClass = "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide";

const STATUS_STYLES: Record<WorkOrderStatus, string> = {
  open: "bg-status-open-bg text-status-open-fg",
  in_progress: "bg-status-progress-bg text-status-progress-fg",
  done: "bg-status-done-bg text-status-done-fg",
};

const STATUS_LABELS: Record<WorkOrderStatus, string> = {
  open: "Abierta",
  in_progress: "En proceso",
  done: "Hecha",
};

const STATUS_ICONS: Record<WorkOrderStatus, typeof Lock> = {
  open: Lock,
  in_progress: RefreshCw,
  done: CheckCircle2,
};

const PRIORITY_STYLES: Record<WorkOrderPriority, string> = {
  low: "bg-canvas-soft text-ink-muted",
  medium: "bg-status-open-bg text-status-open-fg",
  high: "bg-status-overdue-bg text-status-overdue-fg",
};

const PRIORITY_LABELS: Record<WorkOrderPriority, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
};

export function StatusBadge({ status }: { status: WorkOrderStatus | string }) {
  const s = status as WorkOrderStatus;
  const Icon = STATUS_ICONS[s] ?? Lock;
  return (
    <span className={`${baseClass} ${STATUS_STYLES[s] ?? STATUS_STYLES.open}`}>
      <Icon className="size-3" strokeWidth={2.5} />
      {STATUS_LABELS[s] ?? status}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: WorkOrderPriority | string }) {
  const p = priority as WorkOrderPriority;
  return (
    <span className={`${baseClass} ${PRIORITY_STYLES[p] ?? PRIORITY_STYLES.medium}`}>
      {PRIORITY_LABELS[p] ?? priority}
    </span>
  );
}

export function OverdueBadge() {
  return <span className={`${baseClass} bg-status-overdue-bg text-status-overdue-fg`}>Vencida</span>;
}
