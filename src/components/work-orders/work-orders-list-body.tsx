"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import type { DisplayMode } from "@/components/view-switcher";
import { WorkOrderListView } from "./work-order-list-view";
import { WorkOrderTableView } from "./work-order-table-view";
import { WorkOrderCalendarView } from "./work-order-calendar-view";
import { isoDateOffset } from "@/lib/dates";
import { useWorkOrdersFilters } from "./work-orders-filters-context";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { isWorkOrderClosed } from "@/lib/types/database";
import type { Locale } from "@/lib/types/database";
import type { WorkOrderRow } from "./types";

// The filtered/sorted row list itself — reads the same state as
// WorkOrdersControls (via WorkOrdersFiltersProvider) so the two can live in
// different DOM positions (a shared header above the split, this in the
// narrow left column) while staying in sync.
export function WorkOrdersListBody({
  orders,
  today,
  dict,
  locale,
  currentUserId,
  isOwner,
}: {
  orders: WorkOrderRow[];
  today: string;
  dict: Dictionary;
  locale: Locale;
  currentUserId: string;
  isOwner: boolean;
}) {
  const searchParams = useSearchParams();
  const display = ((searchParams.get("display") as DisplayMode) ?? "list") as DisplayMode;
  const { search, tab, taskType, dueBucket, priority, location, sortKey } = useWorkOrdersFilters();

  const in7Days = isoDateOffset(7);
  const q = search.trim().toLowerCase();

  const filtered = useMemo(() => {
    return orders.filter((wo) => {
      if (q && !wo.title.toLowerCase().includes(q) && !wo.asset?.name?.toLowerCase().includes(q)) return false;
      if (tab === "to_do" && isWorkOrderClosed(wo.status)) return false;
      if (tab === "done" && !isWorkOrderClosed(wo.status)) return false;
      if (taskType === "recurring" && !wo.recurrence_interval_value) return false;
      if (taskType === "one_time" && wo.recurrence_interval_value) return false;
      if (priority && wo.priority !== priority) return false;
      if (location && wo.asset?.location !== location) return false;
      if (dueBucket === "overdue" && !(wo.due_date && wo.due_date < today && !isWorkOrderClosed(wo.status))) return false;
      if (dueBucket === "due_soon" && !(wo.due_date && wo.due_date >= today && wo.due_date <= in7Days)) return false;
      if (dueBucket === "none" && wo.due_date) return false;
      return true;
    });
  }, [orders, q, tab, taskType, priority, location, dueBucket, today, in7Days]);

  const sorted = useMemo(() => {
    const rows = [...filtered];
    const rank: Record<string, number> = { low: 0, medium: 1, high: 2 };
    rows.sort((a, b) => {
      if (sortKey === "priority") return rank[b.priority] - rank[a.priority];
      return (a.due_date ?? "9999-99-99").localeCompare(b.due_date ?? "9999-99-99");
    });
    return rows;
  }, [filtered, sortKey]);

  const mine = sorted.filter((wo) => wo.assigned_to === currentUserId);
  const others = sorted.filter((wo) => wo.assigned_to !== currentUserId);
  const showGroups = mine.length > 0 && others.length > 0;

  if (display === "table") {
    return (
      <WorkOrderTableView
        orders={sorted}
        dict={dict}
        locale={locale}
        currentUserId={currentUserId}
        isOwner={isOwner}
        emptyMessage={dict.workOrders.emptyView}
      />
    );
  }

  if (display === "calendar") {
    return <WorkOrderCalendarView orders={filtered} today={today} dict={dict} locale={locale} />;
  }

  if (showGroups) {
    return (
      <>
        <WorkOrderListView
          title={dict.workOrders.assignedToMe}
          orders={mine}
          today={today}
          dict={dict}
          locale={locale}
          currentUserId={currentUserId}
          isOwner={isOwner}
        />
        <WorkOrderListView
          title={dict.workOrders.otherTasks}
          orders={others}
          today={today}
          dict={dict}
          locale={locale}
          currentUserId={currentUserId}
          isOwner={isOwner}
        />
      </>
    );
  }

  return (
    <WorkOrderListView
      orders={sorted}
      today={today}
      dict={dict}
      locale={locale}
      currentUserId={currentUserId}
      isOwner={isOwner}
      emptyMessage={dict.workOrders.emptyView}
    />
  );
}
