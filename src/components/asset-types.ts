import type { AssetStatus, IntervalUnit, WorkOrderStatus } from "@/lib/types/database";

export type AssetSummary = {
  id: string;
  name: string;
  category: string | null;
  location: string | null;
  status: AssetStatus;
  coverUrl?: string;
  nextMaintenanceDate: string | null;
  nextMaintenanceOverdue: boolean;
  nextMaintenanceRecurrenceText: string | null;
};

export type AssetAttachmentItem = {
  id: string;
  storagePath: string;
  fileName: string;
  publicUrl: string;
  canDelete: boolean;
};

export type AssetWorkOrder = {
  id: string;
  title: string;
  status: WorkOrderStatus;
  due_date: string | null;
  completed_at: string | null;
  recurrence_interval_value: number | null;
  recurrence_interval_unit: IntervalUnit | null;
  vendorName: string | null;
};

export type AssetDetailData = {
  id: string;
  name: string;
  category: string | null;
  location: string | null;
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  preferred_vendor_id: string | null;
  preferredVendorName: string | null;
  preferredVendorAvatarUrl: string | null;
  purchase_date: string | null;
  warranty_expires: string | null;
  notes: string | null;
  status: AssetStatus;
  attachments: AssetAttachmentItem[];
  upcoming: AssetWorkOrder[];
  history: AssetWorkOrder[];
};
