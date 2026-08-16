import Link from "next/link";
import { ClipboardList, Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge, PriorityBadge, OverdueBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonPrimary, listCard, listRow, mutedText, pageHeading, sectionHeading } from "@/lib/ui";

export default async function DashboardPage() {
  const profile = await requireUser();
  const supabase = await createClient();

  const { data: workOrders } = await supabase
    .from("work_orders")
    .select("id, title, status, priority, due_date, assigned_to, profiles!work_orders_assigned_to_fkey(full_name)")
    .order("created_at", { ascending: false });

  const openOrders = (workOrders ?? []).filter((wo) => wo.status !== "done");
  const doneOrders = (workOrders ?? []).filter((wo) => wo.status === "done");

  return (
    <div className="space-y-8">
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

      <WorkOrderList title="Pendientes" orders={openOrders} />
      {doneOrders.length > 0 && <WorkOrderList title="Completadas" orders={doneOrders} />}

      {(workOrders?.length ?? 0) === 0 && (
        <EmptyState icon={ClipboardList} message="No hay tareas todavía. Crea la primera arriba." />
      )}
    </div>
  );
}

type OrderRow = {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  assigned_to: string | null;
  profiles: { full_name: string } | { full_name: string }[] | null;
};

function isOverdue(order: OrderRow) {
  if (!order.due_date || order.status === "done") return false;
  return order.due_date < new Date().toISOString().slice(0, 10);
}

function WorkOrderList({ title, orders }: { title: string; orders: OrderRow[] }) {
  if (orders.length === 0) return null;

  return (
    <section className="space-y-2">
      <h2 className={sectionHeading}>
        {title} <span className="text-ink-faint">· {orders.length}</span>
      </h2>
      <ul className={listCard}>
        {orders.map((wo) => {
          const assignee = Array.isArray(wo.profiles) ? wo.profiles[0] : wo.profiles;
          const overdue = isOverdue(wo);
          return (
            <li key={wo.id}>
              <Link href={`/work-orders/${wo.id}`} className={listRow}>
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                  <ClipboardList className="size-4" strokeWidth={2} />
                </span>
                <div className="min-w-40 flex-1">
                  <p className="truncate font-medium text-ink">{wo.title}</p>
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
