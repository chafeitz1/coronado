import { notFound } from "next/navigation";
import { Bell, MessageSquare, Wrench, Building2, Repeat } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { updateWorkOrderStatus, addWorkOrderNote } from "@/app/actions/work-orders";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { SubmitButton } from "@/components/ui/submit-button";
import { buttonPrimary, buttonUtility, card, input, mutedText, pageHeading, sectionHeading } from "@/lib/ui";

const STATUS_LABELS: Record<string, string> = {
  open: "Abierta",
  in_progress: "En proceso",
  done: "Hecha",
};

const UNIT_LABELS: Record<string, string> = {
  days: "días",
  weeks: "semanas",
  months: "meses",
  years: "años",
};

export default async function WorkOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireUser();
  const supabase = await createClient();

  const { data: workOrder } = await supabase
    .from("work_orders")
    .select(
      "*, assets(name), vendors(name, phone), assignee:profiles!work_orders_assigned_to_fkey(full_name), creator:profiles!work_orders_created_by_fkey(full_name)"
    )
    .eq("id", id)
    .single();

  if (!workOrder) notFound();

  const { data: notes } = await supabase
    .from("work_order_notes")
    .select("id, body, notify_owner, created_at, author:profiles(full_name)")
    .eq("work_order_id", id)
    .order("created_at", { ascending: true });

  const canChangeStatus =
    profile.role === "owner" || workOrder.assigned_to === profile.id;

  const asset = single(workOrder.assets);
  const vendor = single(workOrder.vendors);
  const assignee = single(workOrder.assignee);
  const creator = single(workOrder.creator);

  return (
    <div className="max-w-2xl space-y-8">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className={pageHeading}>{workOrder.title}</h1>
          <StatusBadge status={workOrder.status} />
        </div>
        <p className={mutedText}>
          creada por {creator?.full_name ?? "—"}
          {assignee ? ` · asignada a ${assignee.full_name}` : ""}
          {workOrder.due_date ? ` · vence ${workOrder.due_date}` : ""}
        </p>
        {workOrder.recurrence_interval_value && (
          <p className="flex items-center gap-1.5 text-sm text-ink-muted">
            <Repeat className="size-3.5" />
            Se repite cada {workOrder.recurrence_interval_value}{" "}
            {UNIT_LABELS[workOrder.recurrence_interval_unit] ?? workOrder.recurrence_interval_unit}
          </p>
        )}
      </div>

      {workOrder.description && <p className="text-sm text-ink-secondary">{workOrder.description}</p>}

      {(asset || vendor) && (
        <div className={`flex flex-wrap gap-x-8 gap-y-3 p-4 text-sm ${card}`}>
          {asset && (
            <span className="flex items-center gap-2">
              <Wrench className="size-4 text-ink-faint" strokeWidth={2} />
              {asset.name}
            </span>
          )}
          {vendor && (
            <span className="flex items-center gap-2">
              <Building2 className="size-4 text-ink-faint" strokeWidth={2} />
              {vendor.name}
              {vendor.phone ? ` (${vendor.phone})` : ""}
            </span>
          )}
        </div>
      )}

      {canChangeStatus && (
        <div className="flex flex-wrap gap-2">
          {(["open", "in_progress", "done"] as const)
            .filter((status) => status !== workOrder.status)
            .map((status) => (
              <form key={status} action={updateWorkOrderStatus.bind(null, workOrder.id, status)}>
                <SubmitButton className={buttonUtility} pendingLabel="...">
                  Marcar {STATUS_LABELS[status].toLowerCase()}
                </SubmitButton>
              </form>
            ))}
        </div>
      )}

      <section className="space-y-4">
        <h2 className={sectionHeading}>Notas</h2>

        <ul className="space-y-3">
          {notes?.map((note) => {
            const author = single(note.author);
            return (
              <li key={note.id} className={`flex gap-3 p-3.5 text-sm ${card}`}>
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                  <MessageSquare className="size-4" strokeWidth={2} />
                </span>
                <div className="min-w-0">
                  <p className="text-ink">{note.body}</p>
                  <p className={`mt-1.5 flex items-center gap-1 text-xs ${mutedText}`}>
                    {author?.full_name ?? "—"} · {new Date(note.created_at).toLocaleString("es")}
                    {note.notify_owner && (
                      <span className="ml-1 inline-flex items-center gap-1 text-status-progress-fg">
                        <Bell className="size-3" /> notificó al dueño
                      </span>
                    )}
                  </p>
                </div>
              </li>
            );
          })}
          {(!notes || notes.length === 0) && <EmptyState icon={MessageSquare} message="Sin notas todavía." />}
        </ul>

        <form action={addWorkOrderNote} className={`space-y-3 p-4 ${card}`}>
          <input type="hidden" name="work_order_id" value={workOrder.id} />
          <textarea
            name="body"
            required
            rows={2}
            placeholder="Escribe una nota..."
            className={input}
          />
          {profile.role !== "owner" && (
            <label className="flex items-center gap-2 text-sm text-ink-muted">
              <input type="checkbox" name="notify_owner" className="size-4 rounded border-hairline accent-primary" />
              <Bell className="size-3.5" /> Notificar al dueño por email
            </label>
          )}
          <SubmitButton className={buttonPrimary} pendingLabel="Agregando...">
            Agregar nota
          </SubmitButton>
        </form>
      </section>
    </div>
  );
}

function single<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}
