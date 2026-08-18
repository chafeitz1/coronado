import Link from "next/link";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { WorkOrdersShell } from "@/components/work-orders-shell";
import { WorkOrdersExplorer } from "@/components/work-orders/work-orders-explorer";
import type { WorkOrderRow } from "@/components/work-orders/types";
import { buttonPrimary, pageHeading } from "@/lib/ui";
import { getDictionary } from "@/lib/i18n/dictionaries";

function single<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

export default async function WorkOrdersLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireUser();
  const dict = getDictionary(profile.locale);
  const supabase = await createClient();

  const { data: workOrders } = await supabase
    .from("work_orders")
    .select(
      "id, title, status, priority, due_date, completed_at, recurrence_interval_value, assigned_to, assignee:profiles!work_orders_assigned_to_fkey(full_name, avatar_url), asset:assets(name, location)"
    )
    .order("created_at", { ascending: false });

  const orders: WorkOrderRow[] = (workOrders ?? []).map((wo) => ({
    id: wo.id,
    title: wo.title,
    status: wo.status,
    priority: wo.priority,
    due_date: wo.due_date,
    completed_at: wo.completed_at,
    recurrence_interval_value: wo.recurrence_interval_value,
    assigned_to: wo.assigned_to,
    assignee: single(wo.assignee),
    asset: single(wo.asset),
  }));

  const today = new Date().toISOString().slice(0, 10);

  const listPane = (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className={pageHeading}>{dict.workOrders.title}</h1>
        <Link href="/work-orders/new" className={buttonPrimary}>
          <Plus className="size-4" /> {dict.workOrders.newTask}
        </Link>
      </div>
      <WorkOrdersExplorer
        orders={orders}
        today={today}
        dict={dict}
        locale={profile.locale}
        currentUserId={profile.id}
        isOwner={profile.role === "owner"}
      />
    </div>
  );

  return (
    <WorkOrdersShell listPane={listPane} dict={dict}>
      {children}
    </WorkOrdersShell>
  );
}
