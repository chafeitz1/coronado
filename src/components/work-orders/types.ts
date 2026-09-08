import type { IntervalUnit, WorkOrderPriority, WorkOrderStatus } from "@/lib/types/database";

export type WorkOrderRow = {
  id: string;
  title: string;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  due_date: string | null;
  completed_at: string | null;
  recurrence_interval_value: number | null;
  recurrence_interval_unit: IntervalUnit | null;
  assigned_to: string | null;
  assignee: { full_name: string; avatar_url: string | null } | null;
  creator: { full_name: string } | null;
  vendor: { name: string } | null;
  asset: { name: string; location: string | null } | null;
};
