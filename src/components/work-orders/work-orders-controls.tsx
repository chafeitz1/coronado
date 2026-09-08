"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Search, Calendar as CalendarIcon, MapPin, Flag, Repeat } from "lucide-react";
import type { DisplayMode } from "@/components/view-switcher";
import { FilterChip, FilterChipOption } from "@/components/ui/filter-chip";
import { useWorkOrdersFilters } from "./work-orders-filters-context";
import { input } from "@/lib/ui";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { WorkOrderPriority } from "@/lib/types/database";
import type { WorkOrderRow } from "./types";

// The filter chip row + To Do/Done tabs, shown once above the split
// between the row list and the detail panel — same idea as the shared
// toolbar in the MaintainX reference, instead of living inside the row
// list's own column.
export function WorkOrdersControls({ orders, dict }: { orders: WorkOrderRow[]; dict: Dictionary }) {
  const searchParams = useSearchParams();
  const display = ((searchParams.get("display") as DisplayMode) ?? "list") as DisplayMode;
  const {
    search,
    setSearch,
    tab,
    setTab,
    taskType,
    setTaskType,
    dueBucket,
    setDueBucket,
    priority,
    setPriority,
    location,
    setLocation,
  } = useWorkOrdersFilters();

  const locations = useMemo(() => {
    const set = new Set<string>();
    for (const wo of orders) if (wo.asset?.location) set.add(wo.asset.location);
    return [...set].sort();
  }, [orders]);

  // Always has a label — there's no "unfiltered" state anymore, the
  // default (overdue_today) is itself a meaningful filter, so the chip
  // shows what's currently applied rather than a generic placeholder.
  const dueBucketLabel = {
    overdue_today: dict.workOrders.viewOverdueToday,
    overdue: dict.workOrders.viewOverdue,
    today: dict.workOrders.viewToday,
    this_week: dict.workOrders.viewThisWeek,
    next_week: dict.workOrders.viewNextWeek,
    all: dict.workOrders.viewUpcoming,
  }[dueBucket];

  const priorityLabel = priority ? dict.priorities[priority] : null;
  const taskTypeLabel =
    taskType === "recurring" ? dict.workOrders.typeRecurring : taskType === "one_time" ? dict.workOrders.typeOneTime : null;

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={dict.workOrders.searchPlaceholder}
          className={`${input} pl-9`}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <FilterChip icon={CalendarIcon} label={dict.workOrders.filterDueDate} activeLabel={dueBucketLabel}>
          <FilterChipOption active={dueBucket === "overdue_today"} onClick={() => setDueBucket("overdue_today")}>
            {dict.workOrders.viewOverdueToday}
          </FilterChipOption>
          <FilterChipOption active={dueBucket === "overdue"} onClick={() => setDueBucket("overdue")}>
            {dict.workOrders.viewOverdue}
          </FilterChipOption>
          <FilterChipOption active={dueBucket === "today"} onClick={() => setDueBucket("today")}>
            {dict.workOrders.viewToday}
          </FilterChipOption>
          <FilterChipOption active={dueBucket === "this_week"} onClick={() => setDueBucket("this_week")}>
            {dict.workOrders.viewThisWeek}
          </FilterChipOption>
          <FilterChipOption active={dueBucket === "next_week"} onClick={() => setDueBucket("next_week")}>
            {dict.workOrders.viewNextWeek}
          </FilterChipOption>
          <FilterChipOption active={dueBucket === "all"} onClick={() => setDueBucket("all")}>
            {dict.workOrders.viewUpcoming}
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
          {(["high", "medium", "low"] as WorkOrderPriority[]).map((p) => (
            <FilterChipOption key={p} active={priority === p} onClick={() => setPriority(p)}>
              {dict.priorities[p]}
            </FilterChipOption>
          ))}
        </FilterChip>

        <FilterChip
          icon={Repeat}
          label={dict.workOrders.filterType}
          activeLabel={taskTypeLabel}
          onClear={() => setTaskType("all")}
        >
          <FilterChipOption active={taskType === "recurring"} onClick={() => setTaskType("recurring")}>
            {dict.workOrders.typeRecurring}
          </FilterChipOption>
          <FilterChipOption active={taskType === "one_time"} onClick={() => setTaskType("one_time")}>
            {dict.workOrders.typeOneTime}
          </FilterChipOption>
        </FilterChip>
      </div>

      {display !== "calendar" && (
        <div className="flex gap-5 border-b border-hairline">
          <button type="button" onClick={() => setTab("to_do")} className={tabClass(tab === "to_do")}>
            {dict.workOrders.tabToDo}
          </button>
          <button type="button" onClick={() => setTab("done")} className={tabClass(tab === "done")}>
            {dict.workOrders.tabDone}
          </button>
        </div>
      )}
    </div>
  );
}

function tabClass(active: boolean) {
  return `-mb-px border-b-2 px-1 pb-2.5 text-sm font-medium transition-colors ${
    active ? "border-primary text-primary" : "border-transparent text-ink-muted hover:text-ink"
  }`;
}
