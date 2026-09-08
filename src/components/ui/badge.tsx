import { Lock, RefreshCw, CheckCircle2, PowerOff, SkipForward } from "lucide-react";
import type { AssetStatus, Locale, WorkOrderStatus } from "@/lib/types/database";
import { getDictionary } from "@/lib/i18n/dictionaries";

const baseClass = "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide";

const STATUS_STYLES: Record<WorkOrderStatus, string> = {
  open: "bg-status-open-bg text-status-open-fg",
  in_progress: "bg-status-progress-bg text-status-progress-fg",
  done: "bg-status-done-bg text-status-done-fg",
  skipped: "bg-canvas-soft text-ink-muted",
};

const STATUS_ICONS: Record<WorkOrderStatus, typeof Lock> = {
  open: Lock,
  in_progress: RefreshCw,
  done: CheckCircle2,
  skipped: SkipForward,
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
