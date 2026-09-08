import type { PurchaseItemListType, PurchaseItemStatus } from "@/lib/types/database";

export type PurchaseItemRow = {
  id: string;
  title: string;
  quantity: string | null;
  notes: string | null;
  list_type: PurchaseItemListType;
  status: PurchaseItemStatus;
  requested_by: string;
  purchased_by: string | null;
  purchased_at: string | null;
  created_at: string;
  requester: { full_name: string } | null;
  buyer: { full_name: string } | null;
};
