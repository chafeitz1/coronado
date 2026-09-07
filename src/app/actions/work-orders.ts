"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser, requireOwner } from "@/lib/auth";
import { notifyUser } from "@/lib/notifications/send";
import { advanceDate, isoDateOffset } from "@/lib/dates";
import { uploadAttachment } from "@/lib/attachments-server";
import { isWorkOrderClosed, type Database, type IntervalUnit, type WorkOrderPriority } from "@/lib/types/database";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

async function getOwnerId(supabase: SupabaseClient) {
  const { data } = await supabase.from("profiles").select("id").eq("role", "owner").limit(1).single();
  return data?.id ?? null;
}

async function logWorkOrderActivity(
  supabase: SupabaseClient,
  workOrderId: string,
  actorId: string,
  eventType: "status_changed" | "edited",
  meta: Record<string, unknown>
) {
  await supabase
    .from("work_order_activity")
    .insert({ work_order_id: workOrderId, actor_id: actorId, event_type: eventType, meta });
}

// Shared by the standalone /work-orders/new form and the in-panel
// "Nueva tarea de mantenimiento" shortcut on an asset's page — same
// fields, same validation, just different post-creation behavior
// (redirect to the task vs. stay put and close the panel).
async function insertWorkOrder(supabase: SupabaseClient, profile: Profile, formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) throw new Error("El título es obligatorio.");

  const description = String(formData.get("description") ?? "").trim() || null;
  const priority = (String(formData.get("priority") ?? "medium") as WorkOrderPriority);
  const assetId = String(formData.get("asset_id") ?? "") || null;
  const dueDate = String(formData.get("due_date") ?? "") || null;
  // Residents can only create one-time orders unassigned to staff; owner
  // can assign directly on creation. Recurrence is owner-only too — the
  // form never shows the fields to residents, and this re-checks
  // server-side regardless of what a crafted request sends (RLS backs
  // this up too).
  const assignedTo =
    profile.role === "owner" ? String(formData.get("assigned_to") ?? "") || null : null;
  const vendorId = profile.role === "owner" ? String(formData.get("vendor_id") ?? "") || null : null;
  const recurrenceValue =
    profile.role === "owner" ? Number(formData.get("recurrence_interval_value") ?? "") || null : null;
  const recurrenceUnit =
    profile.role === "owner" && recurrenceValue
      ? (String(formData.get("recurrence_interval_unit") ?? "") as IntervalUnit) || null
      : null;

  const { data: workOrder, error } = await supabase
    .from("work_orders")
    .insert({
      title,
      description,
      priority,
      asset_id: assetId,
      due_date: dueDate,
      assigned_to: assignedTo,
      vendor_id: vendorId,
      created_by: profile.id,
      source: "manual",
      recurrence_interval_value: recurrenceUnit ? recurrenceValue : null,
      recurrence_interval_unit: recurrenceUnit,
    })
    .select("id")
    .single();

  if (error || !workOrder) {
    throw new Error(error?.message ?? "No se pudo crear la tarea.");
  }

  const photo = formData.get("photo");
  if (photo instanceof File && photo.size > 0) {
    await uploadAttachment(supabase, { workOrderId: workOrder.id }, profile.id, photo);
  }

  if (assignedTo) {
    await notifyUser(assignedTo, "task_assigned", {
      body: `Se te asignó: ${title}`,
      url: `/work-orders/${workOrder.id}`,
    });
  }

  return workOrder;
}

export async function createWorkOrder(formData: FormData) {
  const profile = await requireUser();
  const supabase = await createClient();
  const workOrder = await insertWorkOrder(supabase, profile, formData);

  revalidatePath("/");
  revalidatePath("/work-orders", "layout");
  redirect(`/work-orders/${workOrder.id}`);
}

export type MaintenanceTaskState = { ok: true } | { ok: false; error: string } | null;

export async function createMaintenanceTask(
  assetId: string,
  _prevState: MaintenanceTaskState,
  formData: FormData
): Promise<MaintenanceTaskState> {
  const profile = await requireUser();
  const supabase = await createClient();
  formData.set("asset_id", assetId);

  try {
    await insertWorkOrder(supabase, profile, formData);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo crear la tarea." };
  }

  revalidatePath("/");
  revalidatePath("/assets", "layout");
  revalidatePath("/work-orders", "layout");
  return { ok: true };
}

// Diff-based so the "Actividad" section can list which fields an edit
// touched instead of just "se editó la tarea" — compared against the row
// as it was before this update, not against the submitted form itself.
export async function updateWorkOrder(workOrderId: string, formData: FormData) {
  const profile = await requireUser();
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("work_orders")
    .select(
      "title, description, priority, asset_id, due_date, assigned_to, vendor_id, recurrence_interval_value, recurrence_interval_unit"
    )
    .eq("id", workOrderId)
    .single();

  if (!existing) throw new Error("Tarea no encontrada.");

  const title = String(formData.get("title") ?? "").trim();
  if (!title) throw new Error("El título es obligatorio.");

  const description = String(formData.get("description") ?? "").trim() || null;
  const priority = String(formData.get("priority") ?? "medium") as WorkOrderPriority;
  const assetId = String(formData.get("asset_id") ?? "") || null;
  const dueDate = String(formData.get("due_date") ?? "") || null;

  const update: Record<string, unknown> = {
    title,
    description,
    priority,
    asset_id: assetId,
    due_date: dueDate,
  };

  // Assignment/vendor/recurrence are owner-only fields — a non-owner
  // editor (an assignee) never sees them in the form, so leave them out
  // of the update instead of nulling them from missing form fields.
  if (profile.role === "owner") {
    update.assigned_to = String(formData.get("assigned_to") ?? "") || null;
    update.vendor_id = String(formData.get("vendor_id") ?? "") || null;
    const recurrenceValue = Number(formData.get("recurrence_interval_value") ?? "") || null;
    const recurrenceUnit = recurrenceValue
      ? (String(formData.get("recurrence_interval_unit") ?? "") as IntervalUnit) || null
      : null;
    update.recurrence_interval_value = recurrenceUnit ? recurrenceValue : null;
    update.recurrence_interval_unit = recurrenceUnit;
  }

  const { error } = await supabase.from("work_orders").update(update).eq("id", workOrderId);
  if (error) throw new Error(error.message);

  const changed: string[] = [];
  if (existing.title !== title) changed.push("title");
  if ((existing.description ?? null) !== description) changed.push("description");
  if (existing.priority !== priority) changed.push("priority");
  if ((existing.asset_id ?? null) !== assetId) changed.push("asset_id");
  if ((existing.due_date ?? null) !== dueDate) changed.push("due_date");
  if (profile.role === "owner") {
    if ((existing.assigned_to ?? null) !== (update.assigned_to as string | null)) changed.push("assigned_to");
    if ((existing.vendor_id ?? null) !== (update.vendor_id as string | null)) changed.push("vendor_id");
    if (
      (existing.recurrence_interval_value ?? null) !== (update.recurrence_interval_value as number | null) ||
      (existing.recurrence_interval_unit ?? null) !== (update.recurrence_interval_unit as string | null)
    ) {
      changed.push("recurrence");
    }
  }

  if (changed.length > 0) {
    await logWorkOrderActivity(supabase, workOrderId, profile.id, "edited", { fields: changed });
  }

  revalidatePath(`/work-orders/${workOrderId}`);
  revalidatePath("/work-orders", "layout");
  revalidatePath("/");
  redirect(`/work-orders/${workOrderId}`);
}

export async function deleteWorkOrder(workOrderId: string) {
  await requireOwner();
  const supabase = await createClient();

  const { error } = await supabase.from("work_orders").delete().eq("id", workOrderId);
  if (error) throw new Error(error.message);

  revalidatePath("/work-orders", "layout");
  revalidatePath("/");
  redirect("/work-orders");
}

export async function updateWorkOrderStatus(workOrderId: string, status: string) {
  const profile = await requireUser();
  const supabase = await createClient();

  const { data: previous } = await supabase.from("work_orders").select("status").eq("id", workOrderId).single();

  const { data: workOrder, error } = await supabase
    .from("work_orders")
    .update({
      status,
      completed_at: isWorkOrderClosed(status) ? new Date().toISOString() : null,
    })
    .eq("id", workOrderId)
    .select(
      "id, title, description, created_by, assigned_to, asset_id, vendor_id, priority, due_date, recurrence_interval_value, recurrence_interval_unit"
    )
    .single();

  if (error || !workOrder) {
    throw new Error(error?.message ?? "No se pudo actualizar la tarea.");
  }

  if (previous && previous.status !== status) {
    await logWorkOrderActivity(supabase, workOrderId, profile.id, "status_changed", {
      from: previous.status,
      to: status,
    });
  }

  const ownerId = await getOwnerId(supabase);
  if (ownerId && ownerId !== profile.id) {
    await notifyUser(ownerId, "status_changed", {
      body: `${profile.full_name} cambió "${workOrder.title}" a ${status}`,
      url: `/work-orders/${workOrder.id}`,
    });
  }

  // Recurring task just got closed out (done or deliberately skipped) —
  // spawn its next occurrence right here instead of relying on a cron job
  // to notice. A skip still advances the schedule so the maintenance
  // cadence doesn't stall.
  if (isWorkOrderClosed(status) && workOrder.recurrence_interval_value && workOrder.recurrence_interval_unit) {
    const nextDueDate = workOrder.due_date
      ? advanceDate(workOrder.due_date, workOrder.recurrence_interval_unit as IntervalUnit, workOrder.recurrence_interval_value)
      : isoDateOffset(0);

    const { data: nextWorkOrder } = await supabase
      .from("work_orders")
      .insert({
        title: workOrder.title,
        description: workOrder.description,
        priority: workOrder.priority,
        asset_id: workOrder.asset_id,
        vendor_id: workOrder.vendor_id,
        assigned_to: workOrder.assigned_to,
        created_by: workOrder.created_by,
        due_date: nextDueDate,
        source: "pm",
        recurrence_interval_value: workOrder.recurrence_interval_value,
        recurrence_interval_unit: workOrder.recurrence_interval_unit,
      })
      .select("id")
      .single();

    if (nextWorkOrder && workOrder.assigned_to) {
      await notifyUser(workOrder.assigned_to, "task_assigned", {
        body: `Tarea recurrente: ${workOrder.title}`,
        url: `/work-orders/${nextWorkOrder.id}`,
      });
    }
  }

  revalidatePath(`/work-orders/${workOrderId}`);
  revalidatePath("/work-orders", "layout");
  revalidatePath("/");
}

export async function addWorkOrderNote(formData: FormData) {
  const profile = await requireUser();
  const supabase = await createClient();

  const workOrderId = String(formData.get("work_order_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  const notifyOwner = formData.get("notify_owner") === "on";
  if (!workOrderId || !body) return;

  const { data: note, error } = await supabase
    .from("work_order_notes")
    .insert({
      work_order_id: workOrderId,
      author_id: profile.id,
      body,
      notify_owner: notifyOwner,
    })
    .select("id, work_orders(title)")
    .single();

  if (error) throw new Error(error.message);

  if (notifyOwner) {
    const ownerId = await getOwnerId(supabase);
    if (ownerId && ownerId !== profile.id) {
      const workOrderTitle =
        (note?.work_orders as unknown as { title: string } | null)?.title ?? "una tarea";
      await notifyUser(ownerId, "note_flagged", {
        body: `${profile.full_name} marcó una nota en "${workOrderTitle}": ${body}`,
        url: `/work-orders/${workOrderId}`,
      });
    }
  }

  revalidatePath(`/work-orders/${workOrderId}`);
}

export type WorkOrderAttachmentState = { error?: string } | undefined;

export async function uploadWorkOrderAttachment(
  workOrderId: string,
  _prevState: WorkOrderAttachmentState,
  formData: FormData
): Promise<WorkOrderAttachmentState> {
  const profile = await requireUser();
  const supabase = await createClient();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Elige un archivo primero." };
  }

  try {
    await uploadAttachment(supabase, { workOrderId }, profile.id, file);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo subir el archivo." };
  }

  revalidatePath(`/work-orders/${workOrderId}`);
  return undefined;
}

export async function deleteWorkOrderAttachment(attachmentId: string, storagePath: string, workOrderId: string) {
  await requireUser();
  const supabase = await createClient();

  await supabase.storage.from("attachments").remove([storagePath]);
  const { error } = await supabase.from("attachments").delete().eq("id", attachmentId);
  if (error) throw new Error(error.message);

  revalidatePath(`/work-orders/${workOrderId}`);
}
