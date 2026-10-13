import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PurchasesView } from "@/components/purchases/purchases-view";
import type { PurchaseItemRow } from "@/components/purchases/types";
import { getDictionary } from "@/lib/i18n/dictionaries";

function single<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

export default async function PurchasesPage() {
  const profile = await requireUser();
  const dict = getDictionary(profile.locale);
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("purchase_items")
    .select(
      "id, title, quantity, notes, list_type, status, requested_by, purchased_by, purchased_at, created_at, image_path, ordered_at, requester:profiles!purchase_items_requested_by_fkey(full_name), buyer:profiles!purchase_items_purchased_by_fkey(full_name), orderer:profiles!purchase_items_ordered_by_fkey(full_name)"
    )
    .order("created_at", { ascending: false });

  const items: PurchaseItemRow[] = (rows ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    quantity: row.quantity,
    notes: row.notes,
    list_type: row.list_type,
    status: row.status,
    requested_by: row.requested_by,
    purchased_by: row.purchased_by,
    purchased_at: row.purchased_at,
    created_at: row.created_at,
    image_path: row.image_path,
    imageUrl: row.image_path ? supabase.storage.from("attachments").getPublicUrl(row.image_path).data.publicUrl : null,
    ordered_at: row.ordered_at,
    requester: single(row.requester),
    buyer: single(row.buyer),
    orderer: single(row.orderer),
  }));

  return (
    <PurchasesView
      items={items}
      dict={dict}
      locale={profile.locale}
      currentUserId={profile.id}
      isOwner={profile.role === "owner"}
    />
  );
}
