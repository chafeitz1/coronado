import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AssetsExplorer } from "@/components/assets-explorer";
import { getDictionary, format } from "@/lib/i18n/dictionaries";
import { mutedText, pageHeading } from "@/lib/ui";
import { isWorkOrderClosed } from "@/lib/types/database";
import type { AssetDetailData, AssetAttachmentItem, AssetWorkOrder } from "@/components/asset-types";

function single<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

export default async function AssetsPage() {
  const profile = await requireUser();
  const dict = getDictionary(profile.locale);
  const supabase = await createClient();
  const isOwner = profile.role === "owner";

  const [{ data: assetRows }, { data: vendors }, { data: staff }] = await Promise.all([
    supabase
      .from("assets")
      .select(
        "id, name, category, location, brand, model, serial_number, preferred_vendor_id, purchase_date, warranty_expires, notes, status, preferred_vendor:vendors(name, avatar_url)"
      )
      .order("name"),
    supabase.from("vendors").select("id, name").order("name"),
    isOwner
      ? supabase.from("profiles").select("id, full_name").eq("role", "staff").order("full_name")
      : Promise.resolve({ data: null }),
  ]);

  const assetsBase = assetRows ?? [];
  const assetIds = assetsBase.map((a) => a.id);

  const [{ data: attachmentRows }, { data: workOrderRows }] = await Promise.all([
    assetIds.length > 0
      ? supabase
          .from("attachments")
          .select("id, asset_id, storage_path, file_name, uploaded_by")
          .in("asset_id", assetIds)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [] as { id: string; asset_id: string | null; storage_path: string; file_name: string; uploaded_by: string }[] }),
    assetIds.length > 0
      ? supabase
          .from("work_orders")
          .select(
            "id, title, status, due_date, completed_at, recurrence_interval_value, recurrence_interval_unit, asset_id, vendor:vendors(name)"
          )
          .in("asset_id", assetIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as never[] }),
  ]);

  const attachmentsByAsset = new Map<string, AssetAttachmentItem[]>();
  for (const row of attachmentRows ?? []) {
    if (!row.asset_id) continue;
    const list = attachmentsByAsset.get(row.asset_id) ?? [];
    list.push({
      id: row.id,
      storagePath: row.storage_path,
      fileName: row.file_name,
      publicUrl: supabase.storage.from("attachments").getPublicUrl(row.storage_path).data.publicUrl,
      canDelete: isOwner || row.uploaded_by === profile.id,
    });
    attachmentsByAsset.set(row.asset_id, list);
  }

  const upcomingByAsset = new Map<string, AssetWorkOrder[]>();
  const historyByAsset = new Map<string, AssetWorkOrder[]>();
  for (const wo of (workOrderRows ?? []) as unknown as {
    id: string;
    title: string;
    status: AssetWorkOrder["status"];
    due_date: string | null;
    completed_at: string | null;
    recurrence_interval_value: number | null;
    recurrence_interval_unit: AssetWorkOrder["recurrence_interval_unit"];
    asset_id: string | null;
    vendor: { name: string } | { name: string }[] | null;
  }[]) {
    if (!wo.asset_id) continue;
    const entry: AssetWorkOrder = {
      id: wo.id,
      title: wo.title,
      status: wo.status,
      due_date: wo.due_date,
      completed_at: wo.completed_at,
      recurrence_interval_value: wo.recurrence_interval_value,
      recurrence_interval_unit: wo.recurrence_interval_unit,
      vendorName: single(wo.vendor)?.name ?? null,
    };
    const target = isWorkOrderClosed(entry.status) ? historyByAsset : upcomingByAsset;
    const list = target.get(wo.asset_id) ?? [];
    list.push(entry);
    target.set(wo.asset_id, list);
  }
  for (const list of upcomingByAsset.values()) {
    list.sort((a, b) => (a.due_date ?? "9999-99-99").localeCompare(b.due_date ?? "9999-99-99"));
  }
  for (const list of historyByAsset.values()) {
    list.sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? ""));
  }

  const assets: AssetDetailData[] = assetsBase.map((a) => ({
    id: a.id,
    name: a.name,
    category: a.category,
    location: a.location,
    brand: a.brand,
    model: a.model,
    serial_number: a.serial_number,
    preferred_vendor_id: a.preferred_vendor_id,
    preferredVendorName: single(a.preferred_vendor)?.name ?? null,
    preferredVendorAvatarUrl: single(a.preferred_vendor)?.avatar_url ?? null,
    purchase_date: a.purchase_date,
    warranty_expires: a.warranty_expires,
    notes: a.notes,
    status: a.status,
    attachments: attachmentsByAsset.get(a.id) ?? [],
    upcoming: upcomingByAsset.get(a.id) ?? [],
    history: historyByAsset.get(a.id) ?? [],
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className={pageHeading}>{dict.assets.title}</h1>
        <p className={mutedText}>{format(dict.assets.subtitleCount, { count: assets.length })}</p>
      </div>

      <AssetsExplorer
        assets={assets}
        vendors={vendors ?? []}
        staff={staff ?? []}
        isOwner={isOwner}
        dict={dict}
        locale={profile.locale}
      />
    </div>
  );
}
