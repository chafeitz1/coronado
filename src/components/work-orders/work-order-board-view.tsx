"use client";

import { Building2, ClipboardList, Repeat } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { WorkOrderStatusChip } from "@/components/work-order-status-chip";
import { EmptyState } from "@/components/ui/empty-state";
import { card, mutedText, sectionHeading } from "@/lib/ui";
import { format, type Dictionary } from "@/lib/i18n/dictionaries";
import { endOfWeek, formatLongDate } from "@/lib/dates";
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

// Kanban-style triage board: every open task sorted into exactly one of
// four due-date columns — Overdue / Today / This week / Later, the last
// one deliberately unbounded (any future date, or none at all) rather than
// paginated, since "how far out is everything else" is the point of it.
export function WorkOrderBoardView({
  orders,
  today,
  dict,
  locale,
  currentUserId,
  isOwner,
  onSelect,
  emptyMessage,
}: {
  orders: WorkOrderRow[];
  today: string;
  dict: Dictionary;
  locale: Locale;
  currentUserId: string;
  isOwner: boolean;
  onSelect: (workOrderId: string) => void;
  emptyMessage: string;
}) {
  if (orders.length === 0) {
    return <EmptyState icon={ClipboardList} message={emptyMessage} />;
  }

  const endOfThisWeek = endOfWeek(today);

  const overdue: WorkOrderRow[] = [];
  const dueToday: WorkOrderRow[] = [];
  const thisWeek: WorkOrderRow[] = [];
  const later: WorkOrderRow[] = [];

  for (const wo of orders) {
    if (wo.due_date && wo.due_date < today) overdue.push(wo);
    else if (wo.due_date === today) dueToday.push(wo);
    else if (wo.due_date && wo.due_date <= endOfThisWeek) thisWeek.push(wo);
    else later.push(wo);
  }
  for (const bucket of [overdue, dueToday, thisWeek, later]) {
    bucket.sort((a, b) => (a.due_date ?? "9999-99-99").localeCompare(b.due_date ?? "9999-99-99"));
  }

  const columns: { key: string; label: string; rows: WorkOrderRow[] }[] = [
    { key: "overdue", label: dict.workOrders.viewOverdue, rows: overdue },
    { key: "today", label: dict.workOrders.viewToday, rows: dueToday },
    { key: "week", label: dict.workOrders.viewThisWeek, rows: thisWeek },
    { key: "later", label: dict.workOrders.boardLater, rows: later },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {columns.map((col) => (
        <div key={col.key} className="min-w-0 space-y-2">
          <h2 className={sectionHeading}>
            {col.label} <span className="text-ink-faint">· {col.rows.length}</span>
          </h2>
          <div className="space-y-2">
            {col.rows.length === 0 ? (
              <p className={`${mutedText} px-1`}>{dict.workOrders.boardEmpty}</p>
            ) : (
              col.rows.map((wo) => {
                const canEdit = isOwner || wo.assigned_to === currentUserId;
                return (
                  <div
                    key={wo.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelect(wo.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") onSelect(wo.id);
                    }}
                    className={`flex cursor-pointer flex-col gap-2 p-3 text-left transition-colors hover:bg-surface-hover active:bg-surface-hover ${card}`}
                  >
                    <p className="flex items-center gap-1.5 text-sm font-medium text-ink">
                      {wo.recurrence_interval_value && (
                        <span title={recurrenceLabel(wo, dict)} className="shrink-0">
                          <Repeat className="size-3.5 text-ink-faint" strokeWidth={2} />
                        </span>
                      )}
                      <span className="truncate">{wo.title}</span>
                    </p>
                    <div className="flex items-center justify-between gap-2">
                      <WorkOrderStatusChip workOrderId={wo.id} status={wo.status} canEdit={canEdit} dict={dict} />
                      {wo.assignee ? (
                        <Avatar fullName={wo.assignee.full_name} avatarUrl={wo.assignee.avatar_url} />
                      ) : (
                        wo.vendor && (
                          <span className="flex min-w-0 items-center gap-1 text-xs text-ink-muted">
                            <Building2 className="size-3.5 shrink-0" strokeWidth={2} />
                            <span className="max-w-20 truncate">{wo.vendor.name}</span>
                          </span>
                        )
                      )}
                    </div>
                    {wo.due_date && <p className={`${mutedText} text-xs`}>{formatLongDate(wo.due_date, locale)}</p>}
                  </div>
                );
              })
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
