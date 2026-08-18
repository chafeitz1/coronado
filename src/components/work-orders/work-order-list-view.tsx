"use client";

import { useState } from "react";
import Link from "next/link";
import { ClipboardList, Repeat, ChevronUp, ChevronDown as ChevronDownIcon } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { WorkOrderStatusChip } from "@/components/work-order-status-chip";
import { OverdueBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { listCard, mutedText, sectionHeading } from "@/lib/ui";
import { format, type Dictionary } from "@/lib/i18n/dictionaries";
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
            const overdue = wo.status !== "done" && !!wo.due_date && wo.due_date < today;
            const canEdit = isOwner || wo.assigned_to === currentUserId;
            const subtitleParts = [
              wo.asset?.name,
              wo.due_date ? format(dict.workOrders.dueDate, { date: wo.due_date }) : null,
            ].filter(Boolean) as string[];

            return (
              <li key={wo.id}>
                <Link
                  href={`/work-orders/${wo.id}`}
                  className="flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-surface-hover"
                >
                  <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                    <ClipboardList className="size-4" strokeWidth={2} />
                  </span>
                  <div className="min-w-40 flex-1">
                    <p className="flex items-center gap-1.5 truncate font-medium text-ink">
                      {wo.recurrence_interval_value && (
                        <Repeat className="size-3.5 shrink-0 text-ink-faint" strokeWidth={2} />
                      )}
                      {wo.title}
                    </p>
                    <p className={`${mutedText} truncate`}>
                      {subtitleParts.length > 0 ? subtitleParts.join(" · ") : dict.workOrders.unassigned}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    {wo.assignee && <Avatar fullName={wo.assignee.full_name} avatarUrl={wo.assignee.avatar_url} />}
                    <div className="flex items-center gap-1.5">
                      {overdue && <OverdueBadge locale={locale} />}
                      <WorkOrderStatusChip workOrderId={wo.id} status={wo.status} canEdit={canEdit} dict={dict} />
                    </div>
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
