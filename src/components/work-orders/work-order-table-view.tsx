"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, ArrowDown, Building2, ClipboardList } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { PriorityBadge } from "@/components/ui/badge";
import { WorkOrderStatusChip } from "@/components/work-order-status-chip";
import { EmptyState } from "@/components/ui/empty-state";
import { card, mutedText } from "@/lib/ui";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/types/database";
import type { WorkOrderRow } from "./types";

type SortKey = "title" | "status" | "priority" | "assignee" | "due_date" | "asset";

const PRIORITY_RANK = { low: 0, medium: 1, high: 2 };

export function WorkOrderTableView({
  orders,
  dict,
  locale,
  currentUserId,
  isOwner,
  emptyMessage,
}: {
  orders: WorkOrderRow[];
  dict: Dictionary;
  locale: Locale;
  currentUserId: string;
  isOwner: boolean;
  emptyMessage: string;
}) {
  const router = useRouter();
  const [sortKey, setSortKey] = useState<SortKey>("due_date");
  const [asc, setAsc] = useState(true);

  const sorted = useMemo(() => {
    const rows = [...orders];
    rows.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "title") cmp = a.title.localeCompare(b.title);
      else if (sortKey === "status") cmp = a.status.localeCompare(b.status);
      else if (sortKey === "priority") cmp = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
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
    { key: "priority", label: dict.workOrderForm.priorityLabel },
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
            return (
              <tr
                key={wo.id}
                onClick={() => router.push(`/work-orders/${wo.id}`)}
                className="cursor-pointer transition-colors hover:bg-surface-hover active:bg-surface-hover"
              >
                <td className="max-w-64 truncate px-4 py-2.5 font-medium text-ink">{wo.title}</td>
                <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                  <WorkOrderStatusChip workOrderId={wo.id} status={wo.status} canEdit={canEdit} dict={dict} />
                </td>
                <td className="px-4 py-2.5">
                  <PriorityBadge priority={wo.priority} locale={locale} />
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
                <td className="whitespace-nowrap px-4 py-2.5">{wo.due_date ?? "—"}</td>
                <td className="max-w-40 truncate px-4 py-2.5">{wo.asset?.name ?? "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
