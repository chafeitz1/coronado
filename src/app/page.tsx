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
import type { RoutineItem } from "@/components/home/types";

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
  recurrence_interval_value: number | null;
  profiles: { full_name: string } | { full_name: string }[] | null;
};

export default async function HomePage() {
  const profile = await requireUser();
  const dict = getDictionary(profile.locale);
  const supabase = await createClient();
  const isOwner = profile.role === "owner";
  const canManageTasks = isOwner || profile.role === "staff";

  const [{ data: workOrders }, { data: announcements }, { data: urgentPurchases }] = await Promise.all([
    supabase
      .from("work_orders")
      .select(
        "id, title, status, due_date, completed_at, recurrence_interval_value, profiles!work_orders_assigned_to_fkey(full_name)"
      )
      .order("created_at", { ascending: false }),
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

  const openOrders = orders.filter((wo) => !isWorkOrderClosed(wo.status));
  const overdue = orders.filter((wo) => !isWorkOrderClosed(wo.status) && wo.due_date && wo.due_date < today);
  const dueSoon = orders.filter(
    (wo) => !isWorkOrderClosed(wo.status) && wo.due_date && wo.due_date >= today && wo.due_date <= in7Days
  );
  const doneThisWeek = orders.filter((wo) => wo.status === "done" && wo.completed_at && wo.completed_at >= weekAgo);
  const recent = orders.slice(0, 5);

  const homeContent = (
    <>
      <HomeView
        overdue={overdue}
        dueSoon={dueSoon}
        recent={recent}
        announcementRows={announcementRows}
        purchaseRows={purchaseRows}
        dict={dict}
        locale={profile.locale}
        currentUserId={profile.id}
        isOwner={isOwner}
        canManageTasks={canManageTasks}
      />

      {/* Numeric overview, secondary to the prioritized sections above. */}
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile href="/work-orders?view=open" icon={ClipboardList} label={dict.home.statOpen} value={openOrders.length} />
        <StatTile
          href="/work-orders?view=overdue"
          icon={AlertTriangle}
          label={dict.home.statOverdue}
          value={overdue.length}
          tone={overdue.length > 0 ? "danger" : undefined}
        />
        <StatTile href="/work-orders?view=due_soon" icon={Clock} label={dict.home.statDueSoon} value={dueSoon.length} />
        <StatTile
          href="/work-orders?view=done"
          icon={CheckCircle2}
          label={dict.home.statDoneWeek}
          value={doneThisWeek.length}
        />
      </div>
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
