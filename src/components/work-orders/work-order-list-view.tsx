"use client";

import { useState } from "react";
import { ClipboardList, Repeat, Building2, ChevronUp, ChevronDown as ChevronDownIcon } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { OverdueBadge } from "@/components/ui/badge";
import { WorkOrderStatusChip } from "@/components/work-order-status-chip";
import { EmptyState } from "@/components/ui/empty-state";
import { listCard, sectionHeading } from "@/lib/ui";
import { format, type Dictionary } from "@/lib/i18n/dictionaries";
import { daysUntil, formatLongDate } from "@/lib/dates";
import { isWorkOrderClosed } from "@/lib/types/database";
import type { Locale } from "@/lib/types/database";
import type { WorkOrderRow } from "./types";

const UNIT_LABEL_KEYS = {
  days: "unitDays",
  weeks: "unitWeeks",
  months: "unitMonths",
  years: "unitYears",
} as const;

function recurrenceLabel(wo: WorkOrderRow, dict: Dictionary) {
  if (!wo.recurrence_interval_value || !wo.recurrence_interval_unit) return undefined;
  const unit = dict.workOrderDetail[UNIT_LABEL_KEYS[wo.recurrence_interval_unit]];
  return format(dict.workOrderDetail.recurrence, { value: wo.recurrence_interval_value, unit });
}

// "Venció ayer" / "hace {days} días" — how late a task is, not just
// its due date, so an overdue row reads at a glance without doing the
// date math yourself.
function overdueRelativeLabel(daysLate: number, dict: Dictionary) {
  return daysLate === 1 ? dict.workOrders.overdueYesterday : format(dict.workOrders.overdueDaysAgo, { days: daysLate });
}

export function WorkOrderListView({
  title,
  orders,
  today,
  dict,
  locale,
  currentUserId,
  isOwner,
  emptyMessage,
  onSelect,
}: {
  title?: string;
  orders: WorkOrderRow[];
  today: string;
  dict: Dictionary;
  locale: Locale;
  currentUserId: string;
  isOwner: boolean;
  emptyMessage?: string;
  onSelect: (workOrderId: string) => void;
}) {
  const [open, setOpen] = useState(true);

  if (orders.length === 0) {
    return emptyMessage ? <EmptyState icon={ClipboardList} message={emptyMessage} /> : null;
  }

  return (
    <section className="space-y-2">
      {title && (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={`flex items-center gap-1.5 ${sectionHeading}`}
        >
          {open ? <ChevronUp className="size-3.5" /> : <ChevronDownIcon className="size-3.5" />}
          {title} ({orders.length})
        </button>
      )}
      {open && (
        <ul className={listCard}>
          {orders.map((wo) => {
            const overdue = !isWorkOrderClosed(wo.status) && !!wo.due_date && wo.due_date < today;
            const canEdit = isOwner || wo.assigned_to === currentUserId;
            const isRecurring = !!wo.recurrence_interval_value;

            // Overdue trumps the usual subtitle — how late it is matters
            // more right now than who asked for it or the bare due date.
            // Otherwise: a recurring task is always requested by the
            // owner (not worth the space, show its due date instead); a
            // one-off is more useful shown by who asked for it.
            const subtitleParts = overdue
              ? [
                  wo.due_date &&
                    `${format(dict.workOrders.dueDate, { date: formatLongDate(wo.due_date, locale) })} · ${overdueRelativeLabel(-daysUntil(wo.due_date), dict)}`,
                  wo.asset?.name,
                ].filter(Boolean)
              : [
                  isRecurring
                    ? wo.due_date && format(dict.workOrders.dueDate, { date: formatLongDate(wo.due_date, locale) })
                    : wo.creator && format(dict.workOrders.requestedBy, { name: wo.creator.full_name }),
                  wo.asset?.name,
                ].filter(Boolean);

            return (
              <li key={wo.id}>
                <button
                  type="button"
                  onClick={() => onSelect(wo.id)}
                  className="flex w-full flex-col gap-1.5 px-4 py-3.5 text-left transition-colors hover:bg-surface-hover active:bg-surface-hover"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                      <ClipboardList className="size-4" strokeWidth={2} />
                    </span>
                    <p className="flex min-w-0 flex-1 items-center gap-1.5 font-medium text-ink">
                      {wo.recurrence_interval_value && (
                        <span title={recurrenceLabel(wo, dict)} className="shrink-0">
                          <Repeat className="size-3.5 text-ink-faint" strokeWidth={2} />
                        </span>
                      )}
                      <span className="truncate">{wo.title}</span>
                    </p>
                    <div className="shrink-0">
                      {wo.assignee ? (
                        <Avatar fullName={wo.assignee.full_name} avatarUrl={wo.assignee.avatar_url} />
                      ) : (
                        wo.vendor && (
                          <span className="flex items-center gap-1 text-xs text-ink-muted">
                            <Building2 className="size-3.5 shrink-0" strokeWidth={2} />
                            <span className="max-w-24 truncate">{wo.vendor.name}</span>
                          </span>
                        )
                      )}
                    </div>
                  </div>
                  {subtitleParts.length > 0 && (
                    <p className={`truncate pl-12 text-sm ${overdue ? "text-status-overdue-fg" : "text-ink-muted"}`}>
                      {subtitleParts.join(" · ")}
                    </p>
                  )}
                  <div className="flex items-center justify-between gap-1.5 pl-12" onClick={(e) => e.stopPropagation()}>
                    <WorkOrderStatusChip workOrderId={wo.id} status={wo.status} canEdit={canEdit} dict={dict} />
                    {overdue && <OverdueBadge locale={locale} />}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
