"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { DisplayMode } from "@/components/view-switcher";
import { WorkOrderListView } from "./work-order-list-view";
import { WorkOrderTableView } from "./work-order-table-view";
import { WorkOrderCalendarView } from "./work-order-calendar-view";
import { WorkOrderBoardView } from "./work-order-board-view";
import { WorkOrderPanel } from "./work-order-panel";
import { advanceDate, endOfWeek } from "@/lib/dates";
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
  canManageTasks,
}: {
  orders: WorkOrderRow[];
  today: string;
  dict: Dictionary;
  locale: Locale;
  currentUserId: string;
  isOwner: boolean;
  // Owner or staff — any staff member can work any task regardless of who
  // it's assigned to, not just its own assignee.
  canManageTasks: boolean;
}) {
  const searchParams = useSearchParams();
  const display = ((searchParams.get("display") as DisplayMode) ?? "list") as DisplayMode;
  const { search, tab, taskType, dueBucket, location } = useWorkOrdersFilters();
  // Table, Calendar, and Board open a task in this side panel instead of
  // navigating to the [id] route — those views take over the whole page
  // (no split detail column), and a route change would also drop their
  // non-default ?display= value and bounce back to the default List view.
  // List/To Do view keeps linking to the [id] route directly: it already
  // shows detail inline in its own split column, and since "list" is the
  // default display value, that navigation never loses it.
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);

  const q = search.trim().toLowerCase();
  const endOfThisWeek = endOfWeek(today);
  const startOfNextWeek = advanceDate(endOfThisWeek, "days", 1);
  const endOfNextWeek = advanceDate(endOfThisWeek, "days", 7);

  // Everything except the due-date bucket — the Board view needs every open
  // task split across its own four columns at once, so it can't be pinned
  // to whichever single bucket happens to be selected in the filter chip.
  const baseFiltered = useMemo(() => {
    return orders.filter((wo) => {
      if (q && !wo.title.toLowerCase().includes(q) && !wo.asset?.name?.toLowerCase().includes(q)) return false;
      if (tab === "to_do" && isWorkOrderClosed(wo.status)) return false;
      if (tab === "done" && !isWorkOrderClosed(wo.status)) return false;
      if (taskType === "recurring" && !wo.recurrence_interval_value) return false;
      if (taskType === "one_time" && wo.recurrence_interval_value) return false;
      if (location && wo.asset?.location !== location) return false;
      return true;
    });
  }, [orders, q, tab, taskType, location]);

  const filtered = useMemo(() => {
    return baseFiltered.filter((wo) => {
      // The due-date bucket only makes sense for open tasks — a Done task
      // is never "overdue" by definition, so applying it there would just
      // hide the whole tab. Completed tasks keep showing regardless of
      // which bucket is selected.
      if (tab === "to_do") {
        const overdue = !!wo.due_date && wo.due_date < today;
        if (dueBucket === "overdue_today" && !(overdue || wo.due_date === today)) return false;
        if (dueBucket === "overdue" && !overdue) return false;
        if (dueBucket === "today" && wo.due_date !== today) return false;
        if (dueBucket === "this_week" && !(wo.due_date && wo.due_date >= today && wo.due_date <= endOfThisWeek))
          return false;
        if (dueBucket === "next_week" && !(wo.due_date && wo.due_date >= startOfNextWeek && wo.due_date <= endOfNextWeek))
          return false;
      }
      return true;
    });
  }, [baseFiltered, tab, dueBucket, today, endOfThisWeek, startOfNextWeek, endOfNextWeek]);

  // No user-facing sort control anymore — a fixed order instead. "Done"
  // reads newest-completed-first (what you just finished is what you're
  // checking for), everywhere else soonest due date first, undated last.
  const sorted = useMemo(() => {
    const rows = [...filtered];
    if (tab === "done") {
      rows.sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? ""));
    } else {
      rows.sort((a, b) => (a.due_date ?? "9999-99-99").localeCompare(b.due_date ?? "9999-99-99"));
    }
    return rows;
  }, [filtered, tab]);

  const mine = sorted.filter((wo) => wo.assigned_to === currentUserId);
  const others = sorted.filter((wo) => wo.assigned_to !== currentUserId);
  const showGroups = mine.length > 0 && others.length > 0;

  let content: React.ReactNode;
  if (display === "table") {
    content = (
      <WorkOrderTableView
        orders={sorted}
        today={today}
        dict={dict}
        locale={locale}
        currentUserId={currentUserId}
        canManageTasks={canManageTasks}
        emptyMessage={dict.workOrders.emptyView}
        onSelect={setOpenTaskId}
      />
    );
  } else if (display === "calendar") {
    content = (
      <WorkOrderCalendarView orders={filtered} today={today} dict={dict} locale={locale} onSelect={setOpenTaskId} />
    );
  } else if (display === "board") {
    content = (
      <WorkOrderBoardView
        orders={baseFiltered}
        today={today}
        dict={dict}
        locale={locale}
        currentUserId={currentUserId}
        canManageTasks={canManageTasks}
        onSelect={setOpenTaskId}
        emptyMessage={dict.workOrders.emptyView}
      />
    );
  } else if (showGroups) {
    content = (
      <>
        <WorkOrderListView
          title={dict.workOrders.assignedToMe}
          orders={mine}
          today={today}
          dict={dict}
          locale={locale}
          currentUserId={currentUserId}
          canManageTasks={canManageTasks}
        />
        <WorkOrderListView
          title={dict.workOrders.otherTasks}
          orders={others}
          today={today}
          dict={dict}
          locale={locale}
          currentUserId={currentUserId}
          canManageTasks={canManageTasks}
        />
      </>
    );
  } else {
    content = (
      <WorkOrderListView
        orders={sorted}
        today={today}
        dict={dict}
        locale={locale}
        currentUserId={currentUserId}
        canManageTasks={canManageTasks}
        emptyMessage={dict.workOrders.emptyView}
      />
    );
  }

  return (
    <>
      {content}
      <WorkOrderPanel
        workOrderId={openTaskId}
        onClose={() => setOpenTaskId(null)}
        currentUserId={currentUserId}
        isOwner={isOwner}
        canManageTasks={canManageTasks}
        locale={locale}
        dict={dict}
      />
    </>
  );
}
