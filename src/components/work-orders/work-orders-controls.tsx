"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Calendar as CalendarIcon, MapPin, Flag } from "lucide-react";
import type { DisplayMode } from "@/components/view-switcher";
import { FilterChip, FilterChipOption } from "@/components/ui/filter-chip";
import { useWorkOrdersFilters } from "./work-orders-filters-context";
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
  const { tab, setTab, dueBucket, setDueBucket, priority, setPriority, location, setLocation, sortKey, setSortKey } =
    useWorkOrdersFilters();

  const locations = useMemo(() => {
    const set = new Set<string>();
    for (const wo of orders) if (wo.asset?.location) set.add(wo.asset.location);
    return [...set].sort();
  }, [orders]);

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
          {(["high", "medium", "low"] as WorkOrderPriority[]).map((p) => (
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
    </div>
  );
}

function tabClass(active: boolean) {
  return `-mb-px border-b-2 px-1 pb-2.5 text-sm font-medium transition-colors ${
    active ? "border-primary text-primary" : "border-transparent text-ink-muted hover:text-ink"
  }`;
}
