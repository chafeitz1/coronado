"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { notifyUser } from "@/lib/notifications/send";
import type { WorkOrderPriority } from "@/lib/types/database";

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
  // Family can only create one-time orders unassigned to staff; owner can
  // assign directly on creation.
  const assignedTo =
    profile.role === "owner" ? String(formData.get("assigned_to") ?? "") || null : null;

  const { data: workOrder, error } = await supabase
    .from("work_orders")
    .insert({
      title,
      description,
      priority,
      asset_id: assetId,
      due_date: dueDate,
      assigned_to: assignedTo,
      created_by: profile.id,
      source: "manual",
    })
    .select("id")
    .single();

  if (error || !workOrder) {
    throw new Error(error?.message ?? "No se pudo crear la tarea.");
  }

  if (assignedTo) {
    await notifyUser(assignedTo, "task_assigned", {
      body: `Se te asignó: ${title}`,
      url: `/work-orders/${workOrder.id}`,
    });
  }

  revalidatePath("/");
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
    .select("id, title, created_by, assigned_to")
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

  revalidatePath(`/work-orders/${workOrderId}`);
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
