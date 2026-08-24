import { Lock, RefreshCw, CheckCircle2, PowerOff } from "lucide-react";
import type { AssetStatus, Locale, WorkOrderPriority, WorkOrderStatus } from "@/lib/types/database";
import { daysUntil } from "@/lib/dates";
import { getDictionary, format } from "@/lib/i18n/dictionaries";

const baseClass = "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide";

const STATUS_STYLES: Record<WorkOrderStatus, string> = {
  open: "bg-status-open-bg text-status-open-fg",
  in_progress: "bg-status-progress-bg text-status-progress-fg",
  done: "bg-status-done-bg text-status-done-fg",
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

export function StatusBadge({ status, locale }: { status: WorkOrderStatus | string; locale: Locale }) {
  const s = status as WorkOrderStatus;
  const dict = getDictionary(locale);
  const Icon = STATUS_ICONS[s] ?? Lock;
  return (
    <span className={`${baseClass} ${STATUS_STYLES[s] ?? STATUS_STYLES.open}`}>
      <Icon className="size-3" strokeWidth={2.5} />
      {dict.statuses[s] ?? status}
    </span>
  );
}

export function PriorityBadge({ priority, locale }: { priority: WorkOrderPriority | string; locale: Locale }) {
  const p = priority as WorkOrderPriority;
  const dict = getDictionary(locale);
  return (
    <span className={`${baseClass} ${PRIORITY_STYLES[p] ?? PRIORITY_STYLES.medium}`}>
      {dict.priorities[p] ?? priority}
    </span>
  );
}

export function AssetStatusBadge({ status, locale }: { status: AssetStatus; locale: Locale }) {
  const dict = getDictionary(locale);
  if (status !== "inactive") return null;
  return (
    <span className={`${baseClass} bg-canvas-soft text-ink-muted`}>
      <PowerOff className="size-3" strokeWidth={2.5} />
      {dict.assetDetail.statusInactive}
    </span>
  );
}

export function OverdueBadge({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  return <span className={`${baseClass} bg-status-overdue-bg text-status-overdue-fg`}>{dict.badges.overdue}</span>;
}

const WARRANTY_WARNING_DAYS = 60;

export function WarrantyBadge({ warrantyExpires, locale }: { warrantyExpires: string; locale: Locale }) {
  const dict = getDictionary(locale);
  const days = daysUntil(warrantyExpires);
  if (days < 0) {
    return <span className={`${baseClass} bg-status-overdue-bg text-status-overdue-fg`}>{dict.badges.warrantyExpired}</span>;
  }
  if (days <= WARRANTY_WARNING_DAYS) {
    return (
      <span className={`${baseClass} bg-status-progress-bg text-status-progress-fg`}>
        {format(dict.badges.warrantyExpiresIn, { days })}
      </span>
    );
  }
  return null;
}
