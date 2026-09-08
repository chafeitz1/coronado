"use client";

import { useMemo, useState } from "react";
import { ArrowUp, ArrowDown, Building2, ClipboardList, Repeat } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { OverdueBadge } from "@/components/ui/badge";
import { WorkOrderStatusChip } from "@/components/work-order-status-chip";
import { EmptyState } from "@/components/ui/empty-state";
import { card, mutedText } from "@/lib/ui";
import { format, type Dictionary } from "@/lib/i18n/dictionaries";
import { daysUntil, formatLongDate } from "@/lib/dates";
import { isWorkOrderClosed } from "@/lib/types/database";
import type { Locale } from "@/lib/types/database";
import type { WorkOrderRow } from "./types";

type SortKey = "title" | "status" | "assignee" | "due_date" | "asset";

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

export function WorkOrderTableView({
  orders,
  today,
  dict,
  locale,
  currentUserId,
  isOwner,
  emptyMessage,
  onSelect,
}: {
  orders: WorkOrderRow[];
  today: string;
  dict: Dictionary;
  locale: Locale;
  currentUserId: string;
  isOwner: boolean;
  emptyMessage: string;
  onSelect: (workOrderId: string) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("due_date");
  const [asc, setAsc] = useState(true);

  const sorted = useMemo(() => {
    const rows = [...orders];
    rows.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "title") cmp = a.title.localeCompare(b.title);
      else if (sortKey === "status") cmp = a.status.localeCompare(b.status);
      else if (sortKey === "assignee")
        cmp = (a.assignee?.full_name ?? a.vendor?.name ?? "").localeCompare(b.assignee?.full_name ?? b.vendor?.name ?? "");
      else if (sortKey === "asset") cmp = (a.asset?.name ?? "").localeCompare(b.asset?.name ?? "");
      else cmp = (a.due_date ?? "9999-99-99").localeCompare(b.due_date ?? "9999-99-99");
      return asc ? cmp : -cmp;
    });
    return rows;
  }, [orders, sortKey, asc]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) setAsc((a) => !a);
    else {
      setSortKey(key);
      setAsc(true);
    }
  }

  if (orders.length === 0) {
    return <EmptyState icon={ClipboardList} message={emptyMessage} />;
  }

  const columns: { key: SortKey; label: string }[] = [
    { key: "title", label: dict.workOrderForm.titleLabel },
    { key: "status", label: dict.workOrders.statusHeader },
    { key: "assignee", label: dict.workOrderForm.assignLabel },
    { key: "due_date", label: dict.workOrderForm.dueDateLabel },
    { key: "asset", label: dict.workOrderForm.assetLabel },
  ];

  return (
    <div className={`overflow-x-auto ${card}`}>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-hairline text-xs text-ink-faint">
            {columns.map((col) => (
              <th key={col.key} className="whitespace-nowrap px-4 py-2.5 font-medium">
                <button
                  type="button"
                  onClick={() => toggleSort(col.key)}
                  className="inline-flex items-center gap-1 hover:text-ink-secondary"
                >
                  {col.label}
                  {sortKey === col.key && (asc ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline">
          {sorted.map((wo) => {
            const canEdit = isOwner || wo.assigned_to === currentUserId;
            const overdue = !isWorkOrderClosed(wo.status) && !!wo.due_date && wo.due_date < today;
            return (
              <tr
                key={wo.id}
                onClick={() => onSelect(wo.id)}
                className={`cursor-pointer transition-colors ${
                  overdue
                    ? "bg-status-overdue-bg/40 hover:bg-status-overdue-bg/60 active:bg-status-overdue-bg/60"
                    : "hover:bg-surface-hover active:bg-surface-hover"
                }`}
              >
                <td className="max-w-64 truncate px-4 py-2.5 font-medium text-ink">
                  <span className="flex items-center gap-1.5">
                    {wo.recurrence_interval_value && (
                      <span title={recurrenceLabel(wo, dict)} className="shrink-0">
                        <Repeat className="size-3.5 text-ink-faint" strokeWidth={2} />
                      </span>
                    )}
                    <span className="truncate">{wo.title}</span>
                    {overdue && (
                      <span className="shrink-0">
                        <OverdueBadge locale={locale} />
                      </span>
                    )}
                  </span>
                </td>
                <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                  <WorkOrderStatusChip workOrderId={wo.id} status={wo.status} canEdit={canEdit} dict={dict} />
                </td>
                <td className="px-4 py-2.5">
                  {wo.assignee ? (
                    <span className="flex items-center gap-2 whitespace-nowrap">
                      <Avatar fullName={wo.assignee.full_name} avatarUrl={wo.assignee.avatar_url} />
                      {wo.assignee.full_name}
                    </span>
                  ) : wo.vendor ? (
                    <span className="flex items-center gap-2 whitespace-nowrap text-ink-secondary">
                      <Building2 className="size-4 shrink-0 text-ink-faint" strokeWidth={2} />
                      {wo.vendor.name}
                    </span>
                  ) : (
                    <span className={mutedText}>{dict.workOrders.unassigned}</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5">
                  {wo.due_date ? (
                    overdue ? (
                      <div className="text-status-overdue-fg">
                        <p className="font-medium">{formatLongDate(wo.due_date, locale)}</p>
                        <p className="text-xs">{overdueRelativeLabel(-daysUntil(wo.due_date), dict)}</p>
                      </div>
                    ) : (
                      formatLongDate(wo.due_date, locale)
                    )
                  ) : (
                    "—"
                  )}
                </td>
                <td className="max-w-40 truncate px-4 py-2.5">{wo.asset?.name ?? "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
