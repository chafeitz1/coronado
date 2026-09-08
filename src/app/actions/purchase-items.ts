"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { notifyUser } from "@/lib/notifications/send";
import type { PurchaseItemListType, PurchaseItemStatus } from "@/lib/types/database";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

async function getOwnerId(supabase: SupabaseClient) {
  const { data } = await supabase.from("profiles").select("id").eq("role", "owner").limit(1).single();
  return data?.id ?? null;
}

export type PurchaseItemState = { ok: true } | { ok: false; error: string } | null;

// "groceries" items just join the accumulating list. "urgent" ones also
// ping the owner right away — same notifyUser mechanism as task_assigned —
// since those are meant to get bought right now, not batched later.
export async function createPurchaseItem(
  _prevState: PurchaseItemState,
  formData: FormData
): Promise<PurchaseItemState> {
  const profile = await requireUser();
  const supabase = await createClient();

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { ok: false, error: "El nombre es obligatorio." };

  const quantity = String(formData.get("quantity") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const listType = (String(formData.get("list_type") ?? "groceries") || "groceries") as PurchaseItemListType;

  const { error } = await supabase.from("purchase_items").insert({
    title,
    quantity,
    notes,
    list_type: listType,
    requested_by: profile.id,
  });

  if (error) return { ok: false, error: error.message };

  if (listType === "urgent") {
    const ownerId = await getOwnerId(supabase);
    if (ownerId && ownerId !== profile.id) {
      await notifyUser(ownerId, "purchase_urgent", {
        body: `${profile.full_name} pidió comprar: ${title}`,
        url: "/purchases",
      });
    }
  }

  revalidatePath("/purchases");
  return { ok: true };
}

// Anyone can check an item off (or uncheck it, in case of a mistake) —
// doesn't wait on the owner to confirm the purchase happened.
export async function togglePurchaseItemStatus(itemId: string, nextStatus: PurchaseItemStatus) {
  const profile = await requireUser();
  const supabase = await createClient();

  await supabase
    .from("purchase_items")
    .update(
      nextStatus === "purchased"
        ? { status: "purchased", purchased_by: profile.id, purchased_at: new Date().toISOString() }
        : { status: "pending", purchased_by: null, purchased_at: null }
    )
    .eq("id", itemId);

  revalidatePath("/purchases");
}

export async function deletePurchaseItem(itemId: string) {
  await requireUser();
  const supabase = await createClient();
  await supabase.from("purchase_items").delete().eq("id", itemId);
  revalidatePath("/purchases");
}
