"use client";

import { createContext, useContext, useMemo, useState } from "react";

// "overdue_today" (the default) shows what's overdue plus what's due
// today together — the working set someone actually needs to look at
// right now. The rest are single-bucket views for digging further out.
// "all" ("Todas a futuro") drops the due-date restriction entirely,
// same role the old plain "all" bucket served.
export type DueBucket = "overdue_today" | "overdue" | "today" | "this_week" | "next_week" | "all";
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
  location: string | null;
  setLocation: (v: string | null) => void;
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
  const [dueBucket, setDueBucket] = useState<DueBucket>("overdue_today");
  const [location, setLocation] = useState<string | null>(null);

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
      location,
      setLocation,
    }),
    [search, tab, taskType, dueBucket, location]
  );

  return <WorkOrdersFiltersContext.Provider value={value}>{children}</WorkOrdersFiltersContext.Provider>;
}

export function useWorkOrdersFilters() {
  const ctx = useContext(WorkOrdersFiltersContext);
  if (!ctx) throw new Error("useWorkOrdersFilters must be used within WorkOrdersFiltersProvider");
  return ctx;
}
