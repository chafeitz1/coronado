import Link from "next/link";
import { ClipboardList, AlertTriangle, Clock, CheckCircle2, Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { HomeView } from "@/components/home/home-view";
import { HomeTabs } from "@/components/home/home-tabs";
import { RoutineTimeline } from "@/components/home/routine-timeline";
import { card, buttonPrimary, mutedText, pageHeading } from "@/lib/ui";
import { isoDateOffset, isoDateTimeOffset } from "@/lib/dates";
import { getDictionary, format } from "@/lib/i18n/dictionaries";
import { isWorkOrderClosed } from "@/lib/types/database";
import type { AnnouncementRow } from "@/components/announcements/types";
import type { PurchaseItemRow } from "@/components/purchases/types";
import type { ActivityEvent, RoutineItem } from "@/components/home/types";

function single<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

type OrderRow = {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  recurrence_interval_value: number | null;
  source: string;
  profiles: { full_name: string } | { full_name: string }[] | null;
  creator: { full_name: string } | { full_name: string }[] | null;
};

export default async function HomePage() {
  const profile = await requireUser();
  const dict = getDictionary(profile.locale);
  const supabase = await createClient();
  const isOwner = profile.role === "owner";
  const canManageTasks = isOwner || profile.role === "staff";

  const [{ data: workOrders }, { data: activityRows }, { data: announcements }, { data: urgentPurchases }] =
    await Promise.all([
    supabase
      .from("work_orders")
      .select(
        "id, title, status, due_date, completed_at, created_at, recurrence_interval_value, source, profiles!work_orders_assigned_to_fkey(full_name), creator:profiles!work_orders_created_by_fkey(full_name)"
      )
      .order("created_at", { ascending: false }),
    // Everything that happened to a task after its creation — the other
    // half of Recent Activity below, alongside manually-created tasks from
    // the query above. "pm" (system-spawned next occurrence) never logs
    // here since logWorkOrderActivity only runs from the user-triggered
    // status update, not the admin-client insert that follows it — so
    // every row here is already a genuine human action, no filtering needed.
    supabase
      .from("work_order_activity")
      .select("id, event_type, meta, created_at, actor:profiles(full_name), work_order:work_orders(id, title)")
      .order("created_at", { ascending: false })
      .limit(14),
    supabase
      .from("announcements")
      .select(
        "id, title, notes, start_date, end_date, status, created_by, happened_by, happened_at, created_at, creator:profiles!announcements_created_by_fkey(full_name), marker:profiles!announcements_happened_by_fkey(full_name)"
      )
      .eq("status", "pending")
      .order("start_date", { ascending: true }),
    supabase
      .from("purchase_items")
      .select(
        "id, title, quantity, notes, list_type, status, requested_by, purchased_by, purchased_at, created_at, image_path, ordered_at, requester:profiles!purchase_items_requested_by_fkey(full_name), buyer:profiles!purchase_items_purchased_by_fkey(full_name), orderer:profiles!purchase_items_ordered_by_fkey(full_name)"
      )
      .eq("list_type", "urgent")
      .eq("status", "pending")
      .order("created_at", { ascending: true }),
  ]);

  // The guest-day routine is internal ops for staff/owner — residents never
  // see the tab at all, so skip the (RLS-blocked for them anyway) fetch.
  let routineItems: RoutineItem[] = [];
  let guestsPresent = false;
  if (canManageTasks) {
    const [{ data: routineRows }, { data: occupancy }] = await Promise.all([
      supabase.from("routine_items").select("id, time, title, steps").order("time"),
      supabase.from("house_occupancy").select("guests_present").eq("id", 1).single(),
    ]);
    routineItems = routineRows ?? [];
    guestsPresent = occupancy?.guests_present ?? false;
  }

  const orders = (workOrders ?? []) as OrderRow[];
  const announcementRows: AnnouncementRow[] = (announcements ?? []).map((row) => ({
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
  const purchaseRows: PurchaseItemRow[] = (urgentPurchases ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    quantity: row.quantity,
    notes: row.notes,
    list_type: row.list_type,
    status: row.status,
    requested_by: row.requested_by,
    purchased_by: row.purchased_by,
    purchased_at: row.purchased_at,
    created_at: row.created_at,
    image_path: row.image_path,
    imageUrl: row.image_path ? supabase.storage.from("attachments").getPublicUrl(row.image_path).data.publicUrl : null,
    ordered_at: row.ordered_at,
    requester: single(row.requester),
    buyer: single(row.buyer),
    orderer: single(row.orderer),
  }));

  const today = new Date().toISOString().slice(0, 10);
  const in7Days = isoDateOffset(7);
  const weekAgo = isoDateTimeOffset(-7);

  const overdue = orders.filter((wo) => !isWorkOrderClosed(wo.status) && wo.due_date && wo.due_date < today);
  const dueSoon = orders.filter(
    (wo) => !isWorkOrderClosed(wo.status) && wo.due_date && wo.due_date >= today && wo.due_date <= in7Days
  );
  const doneThisWeek = orders.filter((wo) => wo.status === "done" && wo.completed_at && wo.completed_at >= weekAgo);

  // Recent Activity: real human actions only, each rendered as
  // "{actor} {verb} \"{title}\"" — not just a task title next to a status
  // badge, which gave no way to tell what had actually happened. Two
  // sources merged by timestamp: a task's own creation (skipping "pm",
  // the system's own next-occurrence spawn — nobody did that) and
  // everything logged afterward (status changes, edits).
  const statusVerbs: Record<string, string> = {
    done: dict.home.activityVerbDone,
    in_progress: dict.home.activityVerbInProgress,
    skipped: dict.home.activityVerbSkipped,
    open: dict.home.activityVerbOpen,
  };
  const editedFieldLabels: Record<string, string> = {
    title: dict.workOrderDetail.fieldTitle,
    description: dict.workOrderDetail.fieldDescription,
    due_date: dict.workOrderDetail.fieldDueDate,
    asset_id: dict.workOrderDetail.fieldAsset,
    assigned_to: dict.workOrderDetail.fieldAssignee,
    vendor_id: dict.workOrderDetail.fieldVendor,
    recurrence: dict.workOrderDetail.fieldRecurrence,
    video_url: dict.workOrderDetail.fieldVideoUrl,
  };

  const createdEvents: ActivityEvent[] = orders
    .filter((wo) => wo.source !== "pm")
    .map((wo) => ({
      id: `created-${wo.id}`,
      workOrderId: wo.id,
      actorName: single(wo.creator)?.full_name ?? "—",
      text: `${dict.home.activityVerbCreated} "${wo.title}"`,
      createdAt: wo.created_at,
    }));

  type ActivityLogRow = {
    id: string;
    event_type: "status_changed" | "edited";
    meta: { from?: string; to?: string; fields?: string[] } | null;
    created_at: string;
    actor: { full_name: string } | { full_name: string }[] | null;
    work_order: { id: string; title: string } | { id: string; title: string }[] | null;
  };
  const loggedEvents: ActivityEvent[] = ((activityRows ?? []) as ActivityLogRow[])
    .map((row) => {
      const workOrder = single(row.work_order);
      if (!workOrder) return null; // task since deleted
      const meta = row.meta ?? {};
      const verb =
        row.event_type === "status_changed"
          ? (statusVerbs[meta.to ?? ""] ?? dict.home.activityVerbEdited)
          : dict.home.activityVerbEdited;
      const suffix =
        row.event_type === "edited" && meta.fields?.length
          ? ` (${meta.fields.map((f) => editedFieldLabels[f] ?? f).join(", ")})`
          : "";
      return {
        id: row.id,
        workOrderId: workOrder.id,
        actorName: single(row.actor)?.full_name ?? "—",
        text: `${verb} "${workOrder.title}"${suffix}`,
        createdAt: row.created_at,
      };
    })
    .filter((e): e is ActivityEvent => e !== null);

  // 7, matching the cap HomeView applies to every other section — keeps
  // Home a single glance instead of a growing list.
  const activity = [...createdEvents, ...loggedEvents].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 7);

  const homeContent = (
    <>
      {/* Quick-glance counts up front, ahead of the detail sections below. */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <StatTile
          href="/work-orders?view=overdue"
          icon={AlertTriangle}
          label={dict.home.statOverdue}
          value={overdue.length}
          tone={overdue.length > 0 ? "danger" : undefined}
        />
        <StatTile
          href="/work-orders?view=done"
          icon={CheckCircle2}
          label={dict.home.statDoneWeek}
          value={doneThisWeek.length}
        />
        <StatTile href="/work-orders?view=due_soon" icon={Clock} label={dict.home.statDueSoon} value={dueSoon.length} />
      </div>

      <HomeView
        overdue={overdue}
        activity={activity}
        announcementRows={announcementRows}
        purchaseRows={purchaseRows}
        dict={dict}
        locale={profile.locale}
        currentUserId={profile.id}
        isOwner={isOwner}
        canManageTasks={canManageTasks}
      />
    </>
  );

  // Residents never see the routine tab (internal staff/owner ops), so the
  // tab switcher itself only exists for roles that have something to switch
  // to — a resident's Home looks exactly like it did before this feature.
  const content = canManageTasks ? (
    <HomeTabs
      dict={dict}
      homeContent={homeContent}
      routineContent={<RoutineTimeline items={routineItems} guestsPresent={guestsPresent} isOwner={isOwner} dict={dict} />}
    />
  ) : (
    homeContent
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className={pageHeading}>{format(dict.home.greeting, { name: profile.full_name.split(" ")[0] })}</h1>
          <p className={mutedText}>{dict.home.subtitle}</p>
        </div>
        <Link href="/work-orders/new" className={buttonPrimary}>
          <Plus className="size-4" /> {dict.home.newTask}
        </Link>
      </div>

      {content}
    </div>
  );
}

function StatTile({
  href,
  icon: Icon,
  label,
  value,
  tone,
}: {
  href: string;
  icon: typeof ClipboardList;
  label: string;
  value: number;
  tone?: "danger";
}) {
  return (
    <Link href={href} className={`flex flex-col gap-2 p-4 transition-colors hover:bg-surface-hover active:bg-surface-hover ${card}`}>
      <Icon className={`size-4 ${tone === "danger" ? "text-status-overdue-fg" : "text-ink-faint"}`} />
      <span className={`text-2xl font-bold ${tone === "danger" && value > 0 ? "text-status-overdue-fg" : "text-ink"}`}>
        {value}
      </span>
      <span className={mutedText}>{label}</span>
    </Link>
  );
}
