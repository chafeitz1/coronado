import Link from "next/link";
import { ClipboardList, Plus, Repeat } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge, PriorityBadge, OverdueBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonPrimary, listCard, listRow, mutedText, pageHeading, sectionHeading } from "@/lib/ui";
import { isoDateOffset } from "@/lib/dates";
import { getDictionary, format, type Dictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/types/database";

type OrderRow = {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  assigned_to: string | null;
  recurrence_interval_value: number | null;
  profiles: { full_name: string } | { full_name: string }[] | null;
};

type ViewKey = "all" | "open" | "overdue" | "due_soon" | "done";

function classify(wo: OrderRow, today: string, in7Days: string): ViewKey {
  if (wo.status === "done") return "done";
  if (wo.due_date && wo.due_date < today) return "overdue";
  if (wo.due_date && wo.due_date <= in7Days) return "due_soon";
  return "open";
}

export default async function WorkOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const profile = await requireUser();
  const dict = getDictionary(profile.locale);
  const supabase = await createClient();
  const { view: rawView } = await searchParams;

  const views: { key: ViewKey; label: string }[] = [
    { key: "all", label: dict.workOrders.viewAll },
    { key: "open", label: dict.workOrders.viewOpen },
    { key: "overdue", label: dict.workOrders.viewOverdue },
    { key: "due_soon", label: dict.workOrders.viewDueSoon },
    { key: "done", label: dict.workOrders.viewDone },
  ];
  const view: ViewKey = views.some((v) => v.key === rawView) ? (rawView as ViewKey) : "all";

  const { data: workOrders } = await supabase
    .from("work_orders")
    .select(
      "id, title, status, priority, due_date, assigned_to, recurrence_interval_value, profiles!work_orders_assigned_to_fkey(full_name)"
    )
    .order("created_at", { ascending: false });

  const today = new Date().toISOString().slice(0, 10);
  const in7Days = isoDateOffset(7);
  const orders = (workOrders ?? []) as OrderRow[];

  const openOrders = orders.filter((wo) => wo.status !== "done");
  const doneOrders = orders.filter((wo) => wo.status === "done");
  const filtered = orders.filter((wo) => classify(wo, today, in7Days) === view);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className={pageHeading}>{dict.workOrders.title}</h1>
          <p className={mutedText}>
            {profile.role === "staff" ? dict.workOrders.subtitleStaff : dict.workOrders.subtitleAll}
          </p>
        </div>
        <Link href="/work-orders/new" className={buttonPrimary}>
          <Plus className="size-4" /> {dict.workOrders.newTask}
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {views.map((v) => (
          <Link
            key={v.key}
            href={v.key === "all" ? "/work-orders" : `/work-orders?view=${v.key}`}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              view === v.key
                ? "border-primary bg-primary-soft text-primary"
                : "border-hairline bg-surface text-ink-muted hover:bg-surface-hover"
            }`}
          >
            {v.label}
          </Link>
        ))}
      </div>

      {view === "all" ? (
        <>
          <WorkOrderList title={dict.workOrders.pending} orders={openOrders} today={today} in7Days={in7Days} dict={dict} locale={profile.locale} />
          {doneOrders.length > 0 && (
            <WorkOrderList title={dict.workOrders.completed} orders={doneOrders} today={today} in7Days={in7Days} dict={dict} locale={profile.locale} />
          )}
          {orders.length === 0 && <EmptyState icon={ClipboardList} message={dict.workOrders.empty} />}
        </>
      ) : (
        <WorkOrderList orders={filtered} today={today} in7Days={in7Days} dict={dict} locale={profile.locale} />
      )}
    </div>
  );
}

function WorkOrderList({
  title,
  orders,
  today,
  in7Days,
  dict,
  locale,
}: {
  title?: string;
  orders: OrderRow[];
  today: string;
  in7Days: string;
  dict: Dictionary;
  locale: Locale;
}) {
  if (orders.length === 0) {
    return title ? null : <EmptyState icon={ClipboardList} message={dict.workOrders.emptyView} />;
  }

  return (
    <section className="space-y-2">
      {title && (
        <h2 className={sectionHeading}>
          {title} <span className="text-ink-faint">· {orders.length}</span>
        </h2>
      )}
      <ul className={listCard}>
        {orders.map((wo) => {
          const assignee = Array.isArray(wo.profiles) ? wo.profiles[0] : wo.profiles;
          const overdue = classify(wo, today, in7Days) === "overdue";
          return (
            <li key={wo.id}>
              <Link href={`/work-orders/${wo.id}`} className={listRow}>
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                  <ClipboardList className="size-4" strokeWidth={2} />
                </span>
                <div className="min-w-40 flex-1">
                  <p className="flex items-center gap-1.5 truncate font-medium text-ink">
                    {wo.title}
                    {wo.recurrence_interval_value && (
                      <Repeat className="size-3.5 shrink-0 text-ink-faint" strokeWidth={2} />
                    )}
                  </p>
                  <p className={`${mutedText} truncate`}>
                    {assignee ? assignee.full_name : dict.workOrders.unassigned}
                    {wo.due_date ? ` · ${format(dict.workOrders.dueDate, { date: wo.due_date })}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <PriorityBadge priority={wo.priority} locale={locale} />
                  {overdue ? <OverdueBadge locale={locale} /> : <StatusBadge status={wo.status} locale={locale} />}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
