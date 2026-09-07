"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { WorkOrderPriority } from "@/lib/types/database";

export type DueBucket = "all" | "overdue" | "due_soon" | "none";
export type SortKey = "priority" | "due_date";
export type TabKey = "to_do" | "done";
// "recurring" = has a maintenance schedule (recurrence_interval_value
// set) — a one-off report/repair never does, regardless of whether it
// happens to reference an asset.
export type TaskType = "all" | "recurring" | "one_time";

type WorkOrdersFiltersValue = {
  search: string;
  setSearch: (v: string) => void;
  tab: TabKey;
  setTab: (v: TabKey) => void;
  taskType: TaskType;
  setTaskType: (v: TaskType) => void;
  dueBucket: DueBucket;
  setDueBucket: (v: DueBucket) => void;
  priority: WorkOrderPriority | null;
  setPriority: (v: WorkOrderPriority | null) => void;
  location: string | null;
  setLocation: (v: string | null) => void;
  sortKey: SortKey;
  setSortKey: (v: SortKey) => void;
};

const WorkOrdersFiltersContext = createContext<WorkOrdersFiltersValue | null>(null);

// Filter/tab/sort state lives here instead of inside the component that
// renders the controls, so the filter chips + tabs (shown once, above the
// split) and the row list (shown in the left column) can be two separate
// components sharing one state without URL round-tripping — same instance
// survives navigating into a task's detail route since this Provider sits
// in the work-orders layout, above the routed `children`.
export function WorkOrdersFiltersProvider({ children }: { children: React.ReactNode }) {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<TabKey>("to_do");
  const [taskType, setTaskType] = useState<TaskType>("all");
  const [dueBucket, setDueBucket] = useState<DueBucket>("all");
  const [priority, setPriority] = useState<WorkOrderPriority | null>(null);
  const [location, setLocation] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("priority");

  const value = useMemo(
    () => ({
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
      sortKey,
      setSortKey,
    }),
    [search, tab, taskType, dueBucket, priority, location, sortKey]
  );

  return <WorkOrdersFiltersContext.Provider value={value}>{children}</WorkOrdersFiltersContext.Provider>;
}

export function useWorkOrdersFilters() {
  const ctx = useContext(WorkOrdersFiltersContext);
  if (!ctx) throw new Error("useWorkOrdersFilters must be used within WorkOrdersFiltersProvider");
  return ctx;
}
