import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const STATUS_LABELS: Record<string, string> = {
  open: "Abierta",
  in_progress: "En proceso",
  done: "Hecha",
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
};

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Tareas</h1>
          <p className="text-sm text-black/60 dark:text-white/60">
            {profile.role === "staff"
              ? "Tus tareas asignadas."
              : "Todas las tareas de la casa."}
          </p>
        </div>
        <Link
          href="/work-orders/new"
          className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
        >
          + Nueva tarea
        </Link>
      </div>

      <WorkOrderList title="Pendientes" orders={openOrders} />
      {doneOrders.length > 0 && <WorkOrderList title="Completadas" orders={doneOrders} />}

      {(workOrders?.length ?? 0) === 0 && (
        <p className="text-sm text-black/60 dark:text-white/60">
          No hay tareas todavía.
        </p>
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

function WorkOrderList({ title, orders }: { title: string; orders: OrderRow[] }) {
  if (orders.length === 0) return null;

  return (
    <section className="space-y-2">
      <h2 className="text-sm font-medium text-black/60 dark:text-white/60">{title}</h2>
      <ul className="divide-y divide-black/10 rounded-lg border border-black/10 dark:divide-white/10 dark:border-white/10">
        {orders.map((wo) => {
          const assignee = Array.isArray(wo.profiles) ? wo.profiles[0] : wo.profiles;
          return (
            <li key={wo.id}>
              <Link
                href={`/work-orders/${wo.id}`}
                className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
              >
                <div>
                  <p className="font-medium">{wo.title}</p>
                  <p className="text-xs text-black/60 dark:text-white/60">
                    {STATUS_LABELS[wo.status]} · Prioridad {PRIORITY_LABELS[wo.priority]}
                    {assignee ? ` · ${assignee.full_name}` : ""}
                    {wo.due_date ? ` · vence ${wo.due_date}` : ""}
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
