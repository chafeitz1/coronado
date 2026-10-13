import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AnnouncementsView } from "@/components/announcements/announcements-view";
import type { AnnouncementRow } from "@/components/announcements/types";
import { getDictionary } from "@/lib/i18n/dictionaries";

function single<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

export default async function AnnouncementsPage() {
  const profile = await requireUser();
  const dict = getDictionary(profile.locale);
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("announcements")
    .select(
      "id, title, notes, start_date, end_date, status, created_by, happened_by, happened_at, created_at, creator:profiles!announcements_created_by_fkey(full_name), marker:profiles!announcements_happened_by_fkey(full_name)"
    )
    .order("start_date", { ascending: true });

  const items: AnnouncementRow[] = (rows ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    notes: row.notes,
    start_date: row.start_date,
    end_date: row.end_date,
    status: row.status,
    created_by: row.created_by,
    happened_by: row.happened_by,
    happened_at: row.happened_at,
    created_at: row.created_at,
    creator: single(row.creator),
    marker: single(row.marker),
  }));

  return <AnnouncementsView items={items} dict={dict} locale={profile.locale} isOwner={profile.role === "owner"} />;
}
