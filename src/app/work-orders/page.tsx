import Link from "next/link";
import { ClipboardList, Plus, Repeat } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge, PriorityBadge, OverdueBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonPrimary, listCard, listRow, mutedText, pageHeading, sectionHeading } from "@/lib/ui";
import { isoDateOffset } from "@/lib/dates";

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

const VIEWS: { key: ViewKey; label: string }[] = [
  { key: "all", label: "Todas" },
  { key: "open", label: "Pendientes" },
  { key: "overdue", label: "Vencidas" },
  { key: "due_soon", label: "Por vencer" },
  { key: "done", label: "Completadas" },
];

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
  const supabase = await createClient();
  const { view: rawView } = await searchParams;
  const view: ViewKey = VIEWS.some((v) => v.key === rawView) ? (rawView as ViewKey) : "all";

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
          <h1 className={pageHeading}>Tareas</h1>
          <p className={mutedText}>
            {profile.role === "staff" ? "Tus tareas asignadas." : "Todas las tareas de la casa."}
          </p>
        </div>
        <Link href="/work-orders/new" className={buttonPrimary}>
          <Plus className="size-4" /> Nueva tarea
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {VIEWS.map((v) => (
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
          <WorkOrderList title="Pendientes" orders={openOrders} today={today} in7Days={in7Days} />
          {doneOrders.length > 0 && (
            <WorkOrderList title="Completadas" orders={doneOrders} today={today} in7Days={in7Days} />
          )}
          {orders.length === 0 && (
            <EmptyState icon={ClipboardList} message="No hay tareas todavía. Crea la primera arriba." />
          )}
        </>
      ) : (
        <WorkOrderList orders={filtered} today={today} in7Days={in7Days} />
      )}
    </div>
  );
}

function WorkOrderList({
  title,
  orders,
  today,
  in7Days,
}: {
  title?: string;
  orders: OrderRow[];
  today: string;
  in7Days: string;
}) {
  if (orders.length === 0) {
    return title ? null : <EmptyState icon={ClipboardList} message="No hay tareas en esta vista." />;
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
                    {assignee ? assignee.full_name : "Sin asignar"}
                    {wo.due_date ? ` · vence ${wo.due_date}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <PriorityBadge priority={wo.priority} />
                  {overdue ? <OverdueBadge /> : <StatusBadge status={wo.status} />}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
