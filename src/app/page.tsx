import Link from "next/link";
import {
  ClipboardList,
  AlertTriangle,
  Clock,
  CheckCircle2,
  PartyPopper,
  Plus,
  Repeat,
  Megaphone,
  ShoppingCart,
  Truck,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge, OverdueBadge } from "@/components/ui/badge";
import { buttonPrimary, card, listCard, listRow, mutedText, pageHeading, sectionHeading } from "@/lib/ui";
import { isoDateOffset, isoDateTimeOffset, formatLongDate } from "@/lib/dates";
import { getDictionary, format, type Dictionary } from "@/lib/i18n/dictionaries";
import { isWorkOrderClosed } from "@/lib/types/database";
import type { Locale } from "@/lib/types/database";

type AnnouncementRow = { id: string; title: string; start_date: string; end_date: string | null };
type UrgentPurchaseRow = {
  id: string;
  title: string;
  quantity: string | null;
  ordered_at: string | null;
  requester: { full_name: string } | { full_name: string }[] | null;
};

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

  const [{ data: workOrders }, { data: announcements }, { data: urgentPurchases }] = await Promise.all([
    supabase
      .from("work_orders")
      .select(
        "id, title, status, due_date, completed_at, recurrence_interval_value, profiles!work_orders_assigned_to_fkey(full_name)"
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("announcements")
      .select("id, title, start_date, end_date")
      .eq("status", "pending")
      .order("start_date", { ascending: true }),
    supabase
      .from("purchase_items")
      .select("id, title, quantity, ordered_at, requester:profiles!purchase_items_requested_by_fkey(full_name)")
      .eq("list_type", "urgent")
      .eq("status", "pending")
      .order("created_at", { ascending: true }),
  ]);

  const orders = (workOrders ?? []) as OrderRow[];
  const announcementRows = (announcements ?? []) as AnnouncementRow[];
  const urgentPurchaseRows = (urgentPurchases ?? []) as UrgentPurchaseRow[];
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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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

      {overdue.length > 0 && (
        <UrgentSection title={dict.home.overdueTitle} icon={AlertTriangle} orders={overdue} tone="danger" dict={dict} locale={profile.locale} />
      )}
      {dueSoon.length > 0 && (
        <UrgentSection title={dict.home.dueSoonTitle} icon={Clock} orders={dueSoon} dict={dict} locale={profile.locale} />
      )}

      {overdue.length === 0 && dueSoon.length === 0 && (
        <div className={`flex items-center gap-3 p-5 text-sm ${card}`}>
          <PartyPopper className="size-5 shrink-0 text-status-done-fg" />
          <p className="text-ink-secondary">{dict.home.allClear}</p>
        </div>
      )}

      {announcementRows.length > 0 && (
        <section className="space-y-2">
          <h2 className={sectionHeading}>
            <span className="inline-flex items-center gap-1.5">
              <Megaphone className="size-3.5" /> {dict.home.upcomingAnnouncements}{" "}
              <span className="text-ink-faint">· {announcementRows.length}</span>
            </span>
          </h2>
          <ul className={listCard}>
            {announcementRows.map((a) => {
              const overdueAnnouncement = (a.end_date ?? a.start_date) < today;
              const dateLabel =
                a.end_date && a.end_date !== a.start_date
                  ? `${formatLongDate(a.start_date, profile.locale)} – ${formatLongDate(a.end_date, profile.locale)}`
                  : formatLongDate(a.start_date, profile.locale);
              return (
                <li key={a.id}>
                  <Link href="/announcements" className={listRow}>
                    <div className="min-w-40 flex-1">
                      <p className="truncate font-medium text-ink">{a.title}</p>
                      <p className={`truncate text-sm ${overdueAnnouncement ? "text-status-overdue-fg" : mutedText}`}>
                        {dateLabel}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {urgentPurchaseRows.length > 0 && (
        <section className="space-y-2">
          <h2 className={`flex items-center gap-1.5 ${sectionHeading} text-status-overdue-fg`}>
            <ShoppingCart className="size-3.5" /> {dict.home.urgentPurchasesPending}{" "}
            <span className="text-ink-faint">· {urgentPurchaseRows.length}</span>
          </h2>
          <ul className={listCard}>
            {urgentPurchaseRows.map((p) => {
              const requester = Array.isArray(p.requester) ? p.requester[0] : p.requester;
              return (
                <li key={p.id}>
                  <Link href="/purchases" className={listRow}>
                    <div className="min-w-40 flex-1">
                      <p className="truncate font-medium text-ink">
                        {p.title}
                        {p.quantity && <span className="text-ink-muted"> · {p.quantity}</span>}
                      </p>
                      <p className={`${mutedText} truncate`}>{requester ? requester.full_name : dict.home.unassigned}</p>
                    </div>
                    {p.ordered_at && (
                      <span className="flex shrink-0 items-center gap-1 text-xs text-primary">
                        <Truck className="size-3.5" /> {dict.home.ordered}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {recent.length > 0 && (
        <section className="space-y-2">
          <h2 className={sectionHeading}>{dict.home.recentActivity}</h2>
          <ul className={listCard}>
            {recent.map((wo) => {
              const assignee = Array.isArray(wo.profiles) ? wo.profiles[0] : wo.profiles;
              return (
                <li key={wo.id}>
                  <Link href={`/work-orders/${wo.id}`} className={listRow}>
                    <div className="min-w-40 flex-1">
                      <p className="flex items-center gap-1.5 truncate font-medium text-ink">
                        {wo.title}
                        {wo.recurrence_interval_value && (
                          <Repeat className="size-3.5 shrink-0 text-ink-faint" strokeWidth={2} />
                        )}
                      </p>
                      <p className={`${mutedText} truncate`}>{assignee ? assignee.full_name : dict.home.unassigned}</p>
                    </div>
                    <StatusBadge status={wo.status} locale={profile.locale} />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
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

function UrgentSection({
  title,
  icon: Icon,
  orders,
  tone,
  dict,
  locale,
}: {
  title: string;
  icon: typeof ClipboardList;
  orders: OrderRow[];
  tone?: "danger";
  dict: Dictionary;
  locale: Locale;
}) {
  return (
    <section className="space-y-2">
      <h2 className={sectionHeading}>
        <span className="inline-flex items-center gap-1.5">
          <Icon className={`size-3.5 ${tone === "danger" ? "text-status-overdue-fg" : ""}`} />
          {title} <span className="text-ink-faint">· {orders.length}</span>
        </span>
      </h2>
      <ul className={listCard}>
        {orders.map((wo) => {
          const assignee = Array.isArray(wo.profiles) ? wo.profiles[0] : wo.profiles;
          return (
            <li key={wo.id}>
              <Link href={`/work-orders/${wo.id}`} className={listRow}>
                <div className="min-w-40 flex-1">
                  <p className="flex items-center gap-1.5 truncate font-medium text-ink">
                    {wo.title}
                    {wo.recurrence_interval_value && (
                      <Repeat className="size-3.5 shrink-0 text-ink-faint" strokeWidth={2} />
                    )}
                  </p>
                  <p className={`${mutedText} truncate`}>
                    {assignee ? assignee.full_name : dict.home.unassigned}
                    {wo.due_date ? ` · ${format(dict.workOrders.dueDate, { date: wo.due_date })}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {tone === "danger" ? <OverdueBadge locale={locale} /> : <StatusBadge status={wo.status} locale={locale} />}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
