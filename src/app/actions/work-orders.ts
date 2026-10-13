"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser, requireOwner } from "@/lib/auth";
import { notifyUser } from "@/lib/notifications/send";
import { advanceDate, isoDateOffset } from "@/lib/dates";
import { uploadAttachment, saveAttachmentRecord } from "@/lib/attachments-server";
import { isWorkOrderClosed, type Database, type IntervalUnit } from "@/lib/types/database";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

async function getOwnerId(supabase: SupabaseClient) {
  const { data } = await supabase.from("profiles").select("id").eq("role", "owner").limit(1).single();
  return data?.id ?? null;
}

// One glance at the push/email list should say what happened without
// opening it — a distinct title + emoji per status beats a generic "Una
// tarea cambió de estado" (the status_changed event's default label) and
// the raw status string the body used to show verbatim (e.g. "a done").
const STATUS_NOTIFICATION: Record<string, { title: string; emoji: string; verb: string }> = {
  done: { title: "Tarea completada", emoji: "✅", verb: "completó" },
  in_progress: { title: "Tarea en progreso", emoji: "🔧", verb: "empezó" },
  skipped: { title: "Tarea salteada", emoji: "⏭️", verb: "salteó" },
  open: { title: "Tarea reabierta", emoji: "↩️", verb: "reabrió" },
};

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
  const assetId = String(formData.get("asset_id") ?? "") || null;
  const dueDate = String(formData.get("due_date") ?? "") || null;
  // Residents and staff can only create one-time orders unassigned to
  // staff (e.g. reporting something broken for the owner to route to a
  // vendor); owner can assign directly on creation. Recurrence is
  // owner-only too — the form never shows these fields to non-owners, and
  // this re-checks server-side regardless of what a crafted request
  // sends (RLS backs this up too).
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

// Same form as the standalone /work-orders/new page, but for the side
// panel opened from List/Calendar/Board view — those views take over the
// whole page (no split detail column), so navigating to /work-orders/new
// would drop the current ?display= and land back on the To Do split view.
// Stays on the current view and closes the panel instead of redirecting.
export async function createWorkOrderPanel(
  _prevState: MaintenanceTaskState,
  formData: FormData
): Promise<MaintenanceTaskState> {
  const profile = await requireUser();
  const supabase = await createClient();

  try {
    await insertWorkOrder(supabase, profile, formData);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo crear la tarea." };
  }

  revalidatePath("/");
  revalidatePath("/work-orders", "layout");
  return { ok: true };
}

// Diff-based so the "Actividad" section can list which fields an edit
// touched instead of just "se editó la tarea" — compared against the row
// as it was before this update, not against the submitted form itself.
// Owner-only: editing (unlike a status change) isn't something an
// assignee can do here, matching deleteWorkOrder's permission.
// No redirect — this is called from the inline edit form inside
// WorkOrderDetailContent (both the standalone [id] page and WorkOrderPanel),
// which closes itself back to the read view on success instead of
// navigating to a separate route and losing whichever List/Calendar/Board
// view the user had open.
export async function updateWorkOrder(
  workOrderId: string,
  _prevState: MaintenanceTaskState,
  formData: FormData
): Promise<MaintenanceTaskState> {
  const profile = await requireOwner();
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("work_orders")
    .select(
      "title, description, asset_id, due_date, assigned_to, vendor_id, video_url, recurrence_interval_value, recurrence_interval_unit"
    )
    .eq("id", workOrderId)
    .single();

  if (!existing) return { ok: false, error: "Tarea no encontrada." };

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { ok: false, error: "El título es obligatorio." };

  const description = String(formData.get("description") ?? "").trim() || null;
  const assetId = String(formData.get("asset_id") ?? "") || null;
  const dueDate = String(formData.get("due_date") ?? "") || null;
  const assignedTo = String(formData.get("assigned_to") ?? "") || null;
  const vendorId = String(formData.get("vendor_id") ?? "") || null;
  const videoUrl = String(formData.get("video_url") ?? "").trim() || null;
  const recurrenceValue = Number(formData.get("recurrence_interval_value") ?? "") || null;
  const recurrenceUnit = recurrenceValue
    ? (String(formData.get("recurrence_interval_unit") ?? "") as IntervalUnit) || null
    : null;

  const update = {
    title,
    description,
    asset_id: assetId,
    due_date: dueDate,
    assigned_to: assignedTo,
    vendor_id: vendorId,
    video_url: videoUrl,
    recurrence_interval_value: recurrenceUnit ? recurrenceValue : null,
    recurrence_interval_unit: recurrenceUnit,
  };

  const { error } = await supabase.from("work_orders").update(update).eq("id", workOrderId);
  if (error) return { ok: false, error: error.message };

  const changed: string[] = [];
  if (existing.title !== title) changed.push("title");
  if ((existing.description ?? null) !== description) changed.push("description");
  if ((existing.asset_id ?? null) !== assetId) changed.push("asset_id");
  if ((existing.due_date ?? null) !== dueDate) changed.push("due_date");
  if ((existing.assigned_to ?? null) !== assignedTo) changed.push("assigned_to");
  if ((existing.vendor_id ?? null) !== vendorId) changed.push("vendor_id");
  if ((existing.video_url ?? null) !== videoUrl) changed.push("video_url");
  if (
    (existing.recurrence_interval_value ?? null) !== update.recurrence_interval_value ||
    (existing.recurrence_interval_unit ?? null) !== update.recurrence_interval_unit
  ) {
    changed.push("recurrence");
  }

  if (changed.length > 0) {
    await logWorkOrderActivity(supabase, workOrderId, profile.id, "edited", { fields: changed });
  }

  revalidatePath(`/work-orders/${workOrderId}`);
  revalidatePath("/work-orders", "layout");
  revalidatePath("/");
  return { ok: true };
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

  const { data: previous } = await supabase
    .from("work_orders")
    .select("status, assigned_to")
    .eq("id", workOrderId)
    .single();

  const { data: workOrder, error } = await supabase
    .from("work_orders")
    .update({
      status,
      completed_at: isWorkOrderClosed(status) ? new Date().toISOString() : null,
      // Credits whoever actually did the work, including on a task left
      // unassigned on purpose so either staff member could pick it up —
      // "Asignado a" becomes a record of who completed it, not a lock on
      // who's allowed to. Deliberately NOT carried into the next
      // occurrence below (that still inherits the pre-completion
      // assignment), so a recurring task stays open to whoever's free
      // next time instead of sticking to the last person who did it.
      ...(status === "done" ? { assigned_to: profile.id } : {}),
    })
    .eq("id", workOrderId)
    .select(
      "id, title, description, created_by, assigned_to, asset_id, vendor_id, priority, due_date, recurrence_interval_value, recurrence_interval_unit, series_id"
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
    const statusInfo = STATUS_NOTIFICATION[status];
    const body = statusInfo
      ? `${statusInfo.emoji} ${profile.full_name} ${statusInfo.verb} "${workOrder.title}"`
      : `${profile.full_name} cambió "${workOrder.title}" a ${status}`;
    await notifyUser(ownerId, "status_changed", {
      title: statusInfo?.title,
      body,
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

    // The pre-completion assignment, not workOrder.assigned_to above (which,
    // on a "done" close, now points at whoever just completed it) — the
    // next occurrence should stay exactly as open or as assigned as this
    // one started out, not inherit the completer specifically.
    const nextAssignedTo = previous?.assigned_to ?? null;

    // Admin client, not the request-scoped one above: work_orders_insert's
    // RLS only lets a non-owner create a one-off manual request for
    // themselves (source='manual', created_by=auth.uid(), no recurrence) —
    // none of which this system-generated "pm" row satisfies when staff
    // (not the owner) is the one closing out the task. That silently
    // dropped the next occurrence for every recurring task staff completed
    // (discovered via "Mantenimiento brazo electromecánico portón" never
    // getting its 3rd cycle), since the insert's error was never checked.
    // This spawn isn't really "created by" whoever's clicking the button —
    // it's the recurrence engine — so it runs as admin rather than loosen
    // the RLS policy meant for actual user-submitted requests.
    const adminSupabase = createAdminClient();
    const { data: nextWorkOrder, error: nextWorkOrderError } = await adminSupabase
      .from("work_orders")
      .insert({
        title: workOrder.title,
        description: workOrder.description,
        priority: workOrder.priority,
        asset_id: workOrder.asset_id,
        vendor_id: workOrder.vendor_id,
        assigned_to: nextAssignedTo,
        created_by: workOrder.created_by,
        due_date: nextDueDate,
        source: "pm",
        recurrence_interval_value: workOrder.recurrence_interval_value,
        recurrence_interval_unit: workOrder.recurrence_interval_unit,
        // Every occurrence points back to the root task of the series
        // (not just its immediate predecessor), so the detail page can
        // fetch the whole history with one query keyed on series_id.
        series_id: workOrder.series_id ?? workOrder.id,
      })
      .select("id")
      .single();

    if (nextWorkOrderError) {
      console.error(`[work-orders] failed to spawn next occurrence for ${workOrderId}:`, nextWorkOrderError.message);
    }

    if (nextWorkOrder && nextAssignedTo) {
      await notifyUser(nextAssignedTo, "task_assigned", {
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

// The file itself is already sitting in Storage by the time this runs — see
// components/work-order-attachments.tsx, which uploads directly from the
// browser (lib/attachments-client.ts) before calling this to save the DB
// row. Keeps a big PDF/photo's bytes off this Server Action's request body,
// which Vercel caps well under what a scanned multi-page report needs.
export async function saveWorkOrderAttachment(
  workOrderId: string,
  path: string,
  fileName: string,
  kind: "evidence" | "instruction" = "evidence"
) {
  // Instruction photos are reference material the owner sets up for the
  // task (how to do it), not evidence anyone adds while doing the work —
  // same owner-only bar as editing the task's own description.
  const profile = kind === "instruction" ? await requireOwner() : await requireUser();
  const supabase = await createClient();

  try {
    await saveAttachmentRecord(supabase, { workOrderId }, profile.id, path, fileName, kind);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo guardar el archivo." };
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
