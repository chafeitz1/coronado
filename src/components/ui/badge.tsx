import type { WorkOrderPriority, WorkOrderStatus } from "@/lib/types/database";

const baseClass =
  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset";

const STATUS_STYLES: Record<WorkOrderStatus, string> = {
  open: "bg-zinc-100 text-zinc-700 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700",
  in_progress:
    "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-900",
  done: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-900",
};

const STATUS_LABELS: Record<WorkOrderStatus, string> = {
  open: "Abierta",
  in_progress: "En proceso",
  done: "Hecha",
};

const PRIORITY_STYLES: Record<WorkOrderPriority, string> = {
  low: "bg-zinc-100 text-zinc-600 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:ring-zinc-700",
  medium:
    "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:ring-blue-900",
  high: "bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/50 dark:text-red-300 dark:ring-red-900",
};

const PRIORITY_LABELS: Record<WorkOrderPriority, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
};

export function StatusBadge({ status }: { status: WorkOrderStatus | string }) {
  const s = status as WorkOrderStatus;
  return <span className={`${baseClass} ${STATUS_STYLES[s] ?? STATUS_STYLES.open}`}>{STATUS_LABELS[s] ?? status}</span>;
}

export function PriorityBadge({ priority }: { priority: WorkOrderPriority | string }) {
  const p = priority as WorkOrderPriority;
  return (
    <span className={`${baseClass} ${PRIORITY_STYLES[p] ?? PRIORITY_STYLES.medium}`}>
      {PRIORITY_LABELS[p] ?? priority}
    </span>
  );
}
