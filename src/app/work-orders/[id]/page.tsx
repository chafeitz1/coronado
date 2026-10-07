import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { WorkOrderDetailContent } from "@/components/work-orders/work-order-detail-content";
import { getDictionary } from "@/lib/i18n/dictionaries";

function single<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

export default async function WorkOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireUser();
  const dict = getDictionary(profile.locale);
  const supabase = await createClient();

  const { data: workOrder } = await supabase
    .from("work_orders")
    .select(
      "*, assets(name), vendors(name), assignee:profiles!work_orders_assigned_to_fkey(full_name, avatar_url), creator:profiles!work_orders_created_by_fkey(full_name)"
    )
    .eq("id", id)
    .single();

  if (!workOrder) notFound();

  // Every occurrence of a recurring task shares a series_id (pointing at
  // the root task) — fetch the rest of that series so the detail page can
  // show what happened on past cycles, not just this one occurrence.
  const seriesId = workOrder.series_id ?? workOrder.id;
  const { data: seriesRows } = workOrder.recurrence_interval_value
    ? await supabase
        .from("work_orders")
        .select("id, due_date, status, completed_at, created_at")
        .or(`id.eq.${seriesId},series_id.eq.${seriesId}`)
        .neq("id", workOrder.id)
        .order("due_date", { ascending: false, nullsFirst: false })
    : { data: null };

  const { data: notes } = await supabase
    .from("work_order_notes")
    .select("id, body, notify_owner, created_at, author:profiles(full_name)")
    .eq("work_order_id", id)
    .order("created_at", { ascending: true });

  const { data: attachmentRows } = await supabase
    .from("attachments")
    .select("id, storage_path, file_name, uploaded_by, kind")
    .eq("work_order_id", id)
    .order("created_at", { ascending: true });

  const { data: activityRows } = await supabase
    .from("work_order_activity")
    .select("id, event_type, meta, created_at, actor:profiles(full_name)")
    .eq("work_order_id", id)
    .order("created_at", { ascending: false });

  const isOwner = profile.role === "owner";

  const today = new Date().toISOString().slice(0, 10);

  const attachments = (attachmentRows ?? []).map((row) => ({
    id: row.id,
    storagePath: row.storage_path,
    fileName: row.file_name,
    publicUrl: supabase.storage.from("attachments").getPublicUrl(row.storage_path).data.publicUrl,
    canDelete: isOwner || row.uploaded_by === profile.id,
    kind: row.kind as "evidence" | "instruction",
  }));

  return (
    <WorkOrderDetailContent
      data={{
        workOrder,
        asset: single(workOrder.assets),
        vendor: single(workOrder.vendors),
        assignee: single(workOrder.assignee),
        creator: single(workOrder.creator),
        attachments,
        notes: notes ?? [],
        activityRows: activityRows ?? [],
        seriesRows: seriesRows ?? [],
      }}
      today={today}
      currentUserId={profile.id}
      isOwner={isOwner}
      locale={profile.locale}
      dict={dict}
    />
  );
}
