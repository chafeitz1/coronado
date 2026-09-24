"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { notifyUser, sendPushToUser } from "@/lib/notifications/send";
import { MAX_ATTACHMENT_BYTES, ALLOWED_ATTACHMENT_TYPES } from "@/lib/attachments";
import type { PurchaseItemListType, PurchaseItemStatus } from "@/lib/types/database";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

async function getOwnerId(supabase: SupabaseClient) {
  const { data } = await supabase.from("profiles").select("id").eq("role", "owner").limit(1).single();
  return data?.id ?? null;
}

export type PurchaseItemState = { ok: true } | { ok: false; error: string } | null;

// Inner fragment only — placed inside notifyUser's branded email shell
// (see NotifyPayload.emailHtml), not a full document itself.
function urgentPurchaseEmailBody(params: {
  quantity: string | null;
  notes: string | null;
  requesterName: string;
  imageUrl: string | null;
  otherPending: { title: string; quantity: string | null }[];
}) {
  const { quantity, notes, requesterName, imageUrl, otherPending } = params;
  return `
    ${imageUrl ? `<img src="${imageUrl}" alt="" style="width:100%;max-height:220px;object-fit:cover;border-radius:8px;margin-bottom:14px;display:block;" />` : ""}
    <div style="background:#fdeaea;border-radius:8px;padding:12px 16px;${otherPending.length ? "margin-bottom:20px;" : ""}">
      <p style="margin:0;font-size:14px;color:#18181b;">Pedido por <strong>${requesterName}</strong>${quantity ? ` · ${quantity}` : ""}</p>
      ${notes ? `<p style="margin:6px 0 0;font-size:13px;color:#78716c;">${notes}</p>` : ""}
    </div>
    ${
      otherPending.length
        ? `<p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#78716c;">Otras compras urgentes pendientes (${otherPending.length}):</p>
           <ul style="margin:0;padding-left:18px;font-size:14px;color:#18181b;">
             ${otherPending.map((i) => `<li style="margin-bottom:4px;">${i.title}${i.quantity ? ` · ${i.quantity}` : ""}</li>`).join("")}
           </ul>`
        : ""
    }
  `;
}

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

  let imagePath: string | null = null;
  const image = formData.get("image");
  if (image instanceof File && image.size > 0) {
    if (!ALLOWED_ATTACHMENT_TYPES.includes(image.type)) {
      return { ok: false, error: "La imagen debe ser JPG, PNG o WEBP." };
    }
    if (image.size > MAX_ATTACHMENT_BYTES) {
      return { ok: false, error: "La imagen es demasiado grande (máx. 5MB)." };
    }
    const safeName = image.name.replace(/[^a-zA-Z0-9._-]+/g, "_");
    const path = `purchases/${profile.id}/${Date.now()}-${safeName}`;
    const { error: uploadError } = await supabase.storage
      .from("attachments")
      .upload(path, image, { contentType: image.type });
    if (uploadError) return { ok: false, error: "No se pudo subir la imagen." };
    imagePath = path;
  }

  const { data: inserted, error } = await supabase
    .from("purchase_items")
    .insert({
      title,
      quantity,
      notes,
      list_type: listType,
      requested_by: profile.id,
      image_path: imagePath,
    })
    .select("id")
    .single();

  if (error) {
    if (imagePath) await supabase.storage.from("attachments").remove([imagePath]);
    return { ok: false, error: error.message };
  }

  if (listType === "urgent") {
    const ownerId = await getOwnerId(supabase);
    if (ownerId && ownerId !== profile.id) {
      const { data: otherPending } = await supabase
        .from("purchase_items")
        .select("title, quantity")
        .eq("list_type", "urgent")
        .eq("status", "pending")
        .neq("id", inserted.id)
        .order("created_at", { ascending: true });

      const imageUrl = imagePath ? supabase.storage.from("attachments").getPublicUrl(imagePath).data.publicUrl : null;

      await notifyUser(ownerId, "purchase_urgent", {
        body: `${profile.full_name} pidió comprar: ${title}`,
        url: "/purchases",
        emailEyebrow: "🛒 Compra urgente",
        emailEyebrowColor: "#dc2626",
        emailTitle: title,
        emailHtml: urgentPurchaseEmailBody({
          quantity,
          notes,
          requesterName: profile.full_name,
          imageUrl,
          otherPending: otherPending ?? [],
        }),
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

  const { data: item } = await supabase
    .from("purchase_items")
    .update(
      nextStatus === "purchased"
        ? { status: "purchased", purchased_by: profile.id, purchased_at: new Date().toISOString() }
        : { status: "pending", purchased_by: null, purchased_at: null }
    )
    .eq("id", itemId)
    .select("title")
    .single();

  // Push-only (no email, no NotificationEventType/preference row) — this is
  // meant as a quick heads-up when staff checks something off, not a formal
  // channel Carlos would want to configure or get emailed about.
  if (nextStatus === "purchased" && item) {
    const ownerId = await getOwnerId(supabase);
    if (ownerId && ownerId !== profile.id) {
      await sendPushToUser(ownerId, "Compra recibida", {
        body: `${profile.full_name} marcó "${item.title}" como comprado`,
        url: "/purchases",
      });
    }
  }

  revalidatePath("/purchases");
}

// Middle step for urgent items, between "requested" and "purchased": the
// owner marks it here once they've placed the order (often remotely, e.g.
// Amazon), so staff on-site — and the owner themself — can tell at a glance
// what's already on its way versus what still needs to be ordered. Anyone
// can toggle it, same as the purchased status; it doesn't gate anything.
export async function toggleOrderedStatus(itemId: string, ordered: boolean) {
  const profile = await requireUser();
  const supabase = await createClient();

  await supabase
    .from("purchase_items")
    .update(ordered ? { ordered_at: new Date().toISOString(), ordered_by: profile.id } : { ordered_at: null, ordered_by: null })
    .eq("id", itemId);

  revalidatePath("/purchases");
}

export async function deletePurchaseItem(itemId: string, imagePath: string | null) {
  await requireUser();
  const supabase = await createClient();
  await supabase.from("purchase_items").delete().eq("id", itemId);
  if (imagePath) await supabase.storage.from("attachments").remove([imagePath]);
  revalidatePath("/purchases");
}
