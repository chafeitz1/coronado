"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Calendar as CalendarIcon, MapPin, Flag } from "lucide-react";
import type { DisplayMode } from "@/components/view-switcher";
import { FilterChip, FilterChipOption } from "@/components/ui/filter-chip";
import { WorkOrderListView } from "./work-order-list-view";
import { WorkOrderTableView } from "./work-order-table-view";
import { WorkOrderCalendarView } from "./work-order-calendar-view";
import { isoDateOffset } from "@/lib/dates";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Locale, WorkOrderPriority } from "@/lib/types/database";
import type { WorkOrderRow } from "./types";

type DueBucket = "all" | "overdue" | "due_soon" | "none";

export function WorkOrdersExplorer({
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

  const [tab, setTab] = useState<"to_do" | "done">("to_do");
  const [dueBucket, setDueBucket] = useState<DueBucket>("all");
  const [priority, setPriority] = useState<WorkOrderPriority | null>(null);
  const [location, setLocation] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<"priority" | "due_date">("priority");

  const in7Days = isoDateOffset(7);

  const locations = useMemo(() => {
    const set = new Set<string>();
    for (const wo of orders) if (wo.asset?.location) set.add(wo.asset.location);
    return [...set].sort();
  }, [orders]);

  const filtered = useMemo(() => {
    return orders.filter((wo) => {
      if (tab === "to_do" && wo.status === "done") return false;
      if (tab === "done" && wo.status !== "done") return false;
      if (priority && wo.priority !== priority) return false;
      if (location && wo.asset?.location !== location) return false;
      if (dueBucket === "overdue" && !(wo.due_date && wo.due_date < today && wo.status !== "done")) return false;
      if (dueBucket === "due_soon" && !(wo.due_date && wo.due_date >= today && wo.due_date <= in7Days)) return false;
      if (dueBucket === "none" && wo.due_date) return false;
      return true;
    });
  }, [orders, tab, priority, location, dueBucket, today, in7Days]);

  const sorted = useMemo(() => {
    const rows = [...filtered];
    const rank: Record<WorkOrderPriority, number> = { low: 0, medium: 1, high: 2 };
    rows.sort((a, b) => {
      if (sortKey === "priority") return rank[b.priority] - rank[a.priority];
      return (a.due_date ?? "9999-99-99").localeCompare(b.due_date ?? "9999-99-99");
    });
    return rows;
  }, [filtered, sortKey]);

  const mine = sorted.filter((wo) => wo.assigned_to === currentUserId);
  const others = sorted.filter((wo) => wo.assigned_to !== currentUserId);
  const showGroups = mine.length > 0 && others.length > 0;

  const dueBucketLabel =
    dueBucket === "overdue"
      ? dict.workOrders.viewOverdue
      : dueBucket === "due_soon"
        ? dict.workOrders.viewDueSoon
        : dueBucket === "none"
          ? dict.workOrders.noDueDate
          : null;

  const priorityLabel = priority ? dict.priorities[priority] : null;
  const sortLabel = sortKey === "priority" ? dict.workOrders.sortPriority : dict.workOrders.sortDueDate;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <FilterChip
          icon={CalendarIcon}
          label={dict.workOrders.filterDueDate}
          activeLabel={dueBucketLabel}
          onClear={() => setDueBucket("all")}
        >
          <FilterChipOption active={dueBucket === "overdue"} onClick={() => setDueBucket("overdue")}>
            {dict.workOrders.viewOverdue}
          </FilterChipOption>
          <FilterChipOption active={dueBucket === "due_soon"} onClick={() => setDueBucket("due_soon")}>
            {dict.workOrders.viewDueSoon}
          </FilterChipOption>
          <FilterChipOption active={dueBucket === "none"} onClick={() => setDueBucket("none")}>
            {dict.workOrders.noDueDate}
          </FilterChipOption>
        </FilterChip>

        {locations.length > 0 && (
          <FilterChip
            icon={MapPin}
            label={dict.workOrders.filterLocation}
            activeLabel={location}
            onClear={() => setLocation(null)}
          >
            {locations.map((loc) => (
              <FilterChipOption key={loc} active={location === loc} onClick={() => setLocation(loc)}>
                {loc}
              </FilterChipOption>
            ))}
          </FilterChip>
        )}

        <FilterChip
          icon={Flag}
          label={dict.workOrders.filterPriority}
          activeLabel={priorityLabel}
          onClear={() => setPriority(null)}
        >
          {(["high", "medium", "low"] as const).map((p) => (
            <FilterChipOption key={p} active={priority === p} onClick={() => setPriority(p)}>
              {dict.priorities[p]}
            </FilterChipOption>
          ))}
        </FilterChip>
      </div>

      {display !== "calendar" && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline">
          <div className="flex gap-5">
            <button type="button" onClick={() => setTab("to_do")} className={tabClass(tab === "to_do")}>
              {dict.workOrders.tabToDo}
            </button>
            <button type="button" onClick={() => setTab("done")} className={tabClass(tab === "done")}>
              {dict.workOrders.tabDone}
            </button>
          </div>
          <FilterChip label={dict.workOrders.sortLabel} activeLabel={sortLabel}>
            <FilterChipOption active={sortKey === "priority"} onClick={() => setSortKey("priority")}>
              {dict.workOrders.sortPriority}
            </FilterChipOption>
            <FilterChipOption active={sortKey === "due_date"} onClick={() => setSortKey("due_date")}>
              {dict.workOrders.sortDueDate}
            </FilterChipOption>
          </FilterChip>
        </div>
      )}

      {display === "table" && (
        <WorkOrderTableView
          orders={sorted}
          dict={dict}
          locale={locale}
          currentUserId={currentUserId}
          isOwner={isOwner}
          emptyMessage={dict.workOrders.emptyView}
        />
      )}

      {display === "calendar" && <WorkOrderCalendarView orders={filtered} today={today} dict={dict} locale={locale} />}

      {display === "list" &&
        (showGroups ? (
          <>
            <WorkOrderListView
              title={dict.workOrders.assignedToMe}
              orders={mine}
              today={today}
              dict={dict}
              currentUserId={currentUserId}
              isOwner={isOwner}
            />
            <WorkOrderListView
              title={dict.workOrders.otherTasks}
              orders={others}
              today={today}
              dict={dict}
              currentUserId={currentUserId}
              isOwner={isOwner}
            />
          </>
        ) : (
          <WorkOrderListView
            orders={sorted}
            today={today}
            dict={dict}
            currentUserId={currentUserId}
            isOwner={isOwner}
            emptyMessage={dict.workOrders.emptyView}
          />
        ))}
    </div>
  );
}

function tabClass(active: boolean) {
  return `-mb-px border-b-2 px-1 pb-2.5 text-sm font-medium transition-colors ${
    active ? "border-primary text-primary" : "border-transparent text-ink-muted hover:text-ink"
  }`;
}
