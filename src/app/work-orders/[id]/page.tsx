import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { updateWorkOrderStatus, addWorkOrderNote } from "@/app/actions/work-orders";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonPrimary, buttonSecondary, card, input, mutedText, pageHeading } from "@/lib/ui";

const STATUS_LABELS: Record<string, string> = {
  open: "Abierta",
  in_progress: "En proceso",
  done: "Hecha",
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
      </div>

      {workOrder.description && (
        <p className="text-sm text-zinc-700 dark:text-zinc-300">{workOrder.description}</p>
      )}

      {(asset || vendor) && (
        <div className={`flex flex-wrap gap-x-6 gap-y-1 p-4 text-sm ${card}`}>
          {asset && (
            <span>
              <span className={mutedText}>Activo:</span> {asset.name}
            </span>
          )}
          {vendor && (
            <span>
              <span className={mutedText}>Proveedor:</span> {vendor.name}
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
                <button type="submit" className={buttonSecondary}>
                  Marcar {STATUS_LABELS[status].toLowerCase()}
                </button>
              </form>
            ))}
        </div>
      )}

      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
          Notas
        </h2>

        <ul className="space-y-3">
          {notes?.map((note) => {
            const author = single(note.author);
            return (
              <li key={note.id} className={`p-3 text-sm ${card}`}>
                <p className="text-zinc-800 dark:text-zinc-200">{note.body}</p>
                <p className={`mt-1.5 text-xs ${mutedText}`}>
                  {author?.full_name ?? "—"} · {new Date(note.created_at).toLocaleString("es")}
                  {note.notify_owner && " · 🔔 notificó al dueño"}
                </p>
              </li>
            );
          })}
          {(!notes || notes.length === 0) && <EmptyState icon="📝" message="Sin notas todavía." />}
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
            <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
              <input type="checkbox" name="notify_owner" className="size-4 rounded border-zinc-300 dark:border-zinc-700" />
              🔔 Notificar al dueño por email
            </label>
          )}
          <button type="submit" className={buttonPrimary}>
            Agregar nota
          </button>
        </form>
      </section>
    </div>
  );
}

function single<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}
