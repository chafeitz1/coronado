import type { AnnouncementStatus } from "@/lib/types/database";

export type AnnouncementRow = {
  id: string;
  title: string;
  notes: string | null;
  start_date: string;
  end_date: string | null;
  status: AnnouncementStatus;
  created_by: string;
  happened_by: string | null;
  happened_at: string | null;
  created_at: string;
  creator: { full_name: string } | null;
  marker: { full_name: string } | null;
};
