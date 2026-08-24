import Link from "next/link";
import Image from "next/image";
import { Plus, ShieldAlert, Wrench } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { WarrantyBadge } from "@/components/ui/badge";
import { AssetsList, type AssetSummary } from "@/components/assets-list";
import { AssetsShell } from "@/components/assets-shell";
import { buttonPrimary, listCard, mutedText, pageHeading, sectionHeading } from "@/lib/ui";
import { daysUntil } from "@/lib/dates";
import { getDictionary } from "@/lib/i18n/dictionaries";

const WARRANTY_WARNING_DAYS = 60;

export default async function AssetsLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireUser();
  const dict = getDictionary(profile.locale);
  const supabase = await createClient();

  const { data: assets } = await supabase
    .from("assets")
    .select("id, name, category, location, warranty_expires, status")
    .order("name");

  const all = assets ?? [];
  const assetIds = all.map((a) => a.id);

  const { data: coverRows } =
    assetIds.length > 0
      ? await supabase
          .from("attachments")
          .select("asset_id, storage_path")
          .in("asset_id", assetIds)
          .order("created_at", { ascending: true })
      : { data: [] as { asset_id: string; storage_path: string }[] };

  const coverByAsset = new Map<string, string>();
  for (const row of coverRows ?? []) {
    if (!coverByAsset.has(row.asset_id)) {
      coverByAsset.set(row.asset_id, supabase.storage.from("attachments").getPublicUrl(row.storage_path).data.publicUrl);
    }
  }

  // Retired/disposed equipment doesn't need a warranty callout anymore.
  const warrantyAlerts = all
    .filter((a) => a.status === "active" && a.warranty_expires && daysUntil(a.warranty_expires) <= WARRANTY_WARNING_DAYS)
    .sort((a, b) => (a.warranty_expires ?? "").localeCompare(b.warranty_expires ?? ""));

  const assetSummaries: AssetSummary[] = all.map((a) => ({
    id: a.id,
    name: a.name,
    category: a.category,
    location: a.location,
    status: a.status,
    coverUrl: coverByAsset.get(a.id),
  }));

  const listPane = (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className={pageHeading}>{dict.assets.title}</h1>
        {profile.role === "owner" && (
          <Link href="/assets/new" className={buttonPrimary}>
            <Plus className="size-4" /> {dict.assets.newAsset}
          </Link>
        )}
      </div>

      {warrantyAlerts.length > 0 && (
        <section className="space-y-2">
          <h2 className={sectionHeading}>
            <span className="inline-flex items-center gap-1.5">
              <ShieldAlert className="size-3.5 text-status-overdue-fg" />
              {dict.assets.warrantyAlertsTitle} <span className="text-ink-faint">· {warrantyAlerts.length}</span>
            </span>
          </h2>
          <ul className={listCard}>
            {warrantyAlerts.map((asset) => (
              <li key={asset.id}>
                <Link
                  href={`/assets/${asset.id}`}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-hover"
                >
                  <AssetThumb url={coverByAsset.get(asset.id)} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{asset.name}</p>
                    <p className={`${mutedText} truncate`}>{[asset.category, asset.location].filter(Boolean).join(" · ")}</p>
                  </div>
                  <WarrantyBadge warrantyExpires={asset.warranty_expires!} locale={profile.locale} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-2">
        {warrantyAlerts.length > 0 && <h2 className={sectionHeading}>{dict.assets.allAssetsTitle}</h2>}
        <AssetsList assets={assetSummaries} isOwner={profile.role === "owner"} dict={dict} locale={profile.locale} />
      </section>
    </div>
  );

  return (
    <AssetsShell listPane={listPane} dict={dict}>
      {children}
    </AssetsShell>
  );
}

function AssetThumb({ url }: { url?: string }) {
  if (url) {
    return (
      <span className="relative size-9 shrink-0 overflow-hidden rounded-lg border border-hairline">
        <Image src={url} alt="" fill unoptimized className="object-cover" />
      </span>
    );
  }
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
      <Wrench className="size-4" strokeWidth={2} />
    </span>
  );
}
