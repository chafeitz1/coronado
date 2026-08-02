import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { updateWorkOrderStatus, addWorkOrderNote } from "@/app/actions/work-orders";

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
      <div>
        <h1 className="text-xl font-semibold">{workOrder.title}</h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          {STATUS_LABELS[workOrder.status]} · creada por {creator?.full_name ?? "—"}
          {assignee ? ` · asignada a ${assignee.full_name}` : ""}
          {workOrder.due_date ? ` · vence ${workOrder.due_date}` : ""}
        </p>
      </div>

      {workOrder.description && <p className="text-sm">{workOrder.description}</p>}

      {(asset || vendor) && (
        <div className="flex gap-6 text-sm text-black/70 dark:text-white/70">
          {asset && <span>Activo: {asset.name}</span>}
          {vendor && (
            <span>
              Proveedor: {vendor.name}
              {vendor.phone ? ` (${vendor.phone})` : ""}
            </span>
          )}
        </div>
      )}

      {canChangeStatus && (
        <div className="flex gap-2">
          {(["open", "in_progress", "done"] as const)
            .filter((status) => status !== workOrder.status)
            .map((status) => (
              <form key={status} action={updateWorkOrderStatus.bind(null, workOrder.id, status)}>
                <button
                  type="submit"
                  className="rounded-md border border-black/15 px-3 py-1.5 text-sm hover:bg-black/[0.03] dark:border-white/15 dark:hover:bg-white/[0.04]"
                >
                  Marcar {STATUS_LABELS[status].toLowerCase()}
                </button>
              </form>
            ))}
        </div>
      )}

      <section className="space-y-4">
        <h2 className="text-sm font-medium text-black/60 dark:text-white/60">Notas</h2>

        <ul className="space-y-3">
          {notes?.map((note) => {
            const author = single(note.author);
            return (
              <li key={note.id} className="rounded-md border border-black/10 p-3 text-sm dark:border-white/10">
                <p>{note.body}</p>
                <p className="mt-1 text-xs text-black/50 dark:text-white/50">
                  {author?.full_name ?? "—"} ·{" "}
                  {new Date(note.created_at).toLocaleString("es")}
                  {note.notify_owner && " · 🔔 notificó al dueño"}
                </p>
              </li>
            );
          })}
          {(!notes || notes.length === 0) && (
            <p className="text-sm text-black/50 dark:text-white/50">Sin notas todavía.</p>
          )}
        </ul>

        <form action={addWorkOrderNote} className="space-y-2">
          <input type="hidden" name="work_order_id" value={workOrder.id} />
          <textarea
            name="body"
            required
            rows={2}
            placeholder="Escribe una nota..."
            className="w-full rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/15 dark:bg-black/20"
          />
          {profile.role !== "owner" && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="notify_owner" />
              🔔 Notificar al dueño por email
            </label>
          )}
          <button
            type="submit"
            className="rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white dark:bg-white dark:text-black"
          >
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
