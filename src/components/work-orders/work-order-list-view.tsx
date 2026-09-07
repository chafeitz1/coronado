"use client";

import { useState } from "react";
import Link from "next/link";
import { ClipboardList, Repeat, Building2, ChevronUp, ChevronDown as ChevronDownIcon } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { WorkOrderStatusChip } from "@/components/work-order-status-chip";
import { EmptyState } from "@/components/ui/empty-state";
import { listCard, mutedText, sectionHeading } from "@/lib/ui";
import { format, type Dictionary } from "@/lib/i18n/dictionaries";
import { formatLongDate } from "@/lib/dates";
import { isWorkOrderClosed } from "@/lib/types/database";
import type { Locale } from "@/lib/types/database";
import type { WorkOrderRow } from "./types";

export function WorkOrderListView({
  title,
  orders,
  today,
  dict,
  locale,
  currentUserId,
  isOwner,
  emptyMessage,
}: {
  title?: string;
  orders: WorkOrderRow[];
  today: string;
  dict: Dictionary;
  locale: Locale;
  currentUserId: string;
  isOwner: boolean;
  emptyMessage?: string;
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

            // A recurring task is always requested by the owner — not
            // worth the space. Show its due date there instead; a
            // one-off is more useful shown by who asked for it.
            const subtitleParts = [
              isRecurring
                ? wo.due_date && format(dict.workOrders.dueDate, { date: formatLongDate(wo.due_date, locale) })
                : wo.creator && format(dict.workOrders.requestedBy, { name: wo.creator.full_name }),
              wo.asset?.name,
            ].filter(Boolean);

            return (
              <li key={wo.id}>
                <Link
                  href={`/work-orders/${wo.id}`}
                  className="flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-surface-hover active:bg-surface-hover"
                >
                  <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                    <ClipboardList className="size-4" strokeWidth={2} />
                  </span>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <p className="flex items-center gap-1.5 font-medium text-ink">
                      {wo.recurrence_interval_value && (
                        <Repeat className="size-3.5 shrink-0 text-ink-faint" strokeWidth={2} />
                      )}
                      <span className="truncate">{wo.title}</span>
                    </p>
                    {subtitleParts.length > 0 && (
                      <p className={`${mutedText} truncate`}>{subtitleParts.join(" · ")}</p>
                    )}
                    <div className="flex items-center gap-1.5" onClick={(e) => e.preventDefault()}>
                      <WorkOrderStatusChip workOrderId={wo.id} status={wo.status} canEdit={canEdit} dict={dict} />
                      {overdue && (
                        <span className="rounded-full bg-status-overdue-bg px-2.5 py-1 text-xs font-semibold text-status-overdue-fg">
                          {dict.badges.overdue}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
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
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
