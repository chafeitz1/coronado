"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { notifyUser } from "@/lib/notifications/send";
import { advanceDate, isoDateOffset } from "@/lib/dates";
import { uploadAttachment } from "@/lib/attachments-server";
import type { IntervalUnit, WorkOrderPriority } from "@/lib/types/database";

async function getOwnerId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase.from("profiles").select("id").eq("role", "owner").limit(1).single();
  return data?.id ?? null;
}

export async function createWorkOrder(formData: FormData) {
  const profile = await requireUser();
  const supabase = await createClient();

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

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

  revalidatePath("/");
  revalidatePath("/work-orders", "layout");
  redirect(`/work-orders/${workOrder.id}`);
}

export async function updateWorkOrderStatus(workOrderId: string, status: string) {
  const profile = await requireUser();
  const supabase = await createClient();

  const { data: workOrder, error } = await supabase
    .from("work_orders")
    .update({
      status,
      completed_at: status === "done" ? new Date().toISOString() : null,
    })
    .eq("id", workOrderId)
    .select(
      "id, title, description, created_by, assigned_to, asset_id, vendor_id, priority, due_date, recurrence_interval_value, recurrence_interval_unit"
    )
    .single();

  if (error || !workOrder) {
    throw new Error(error?.message ?? "No se pudo actualizar la tarea.");
  }

  const ownerId = await getOwnerId(supabase);
  if (ownerId && ownerId !== profile.id) {
    await notifyUser(ownerId, "status_changed", {
      body: `${profile.full_name} cambió "${workOrder.title}" a ${status}`,
      url: `/work-orders/${workOrder.id}`,
    });
  }

  // Recurring task just got completed — spawn its next occurrence right
  // here instead of relying on a cron job to notice.
  if (status === "done" && workOrder.recurrence_interval_value && workOrder.recurrence_interval_unit) {
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
