"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { Plus, ShieldAlert, Wrench } from "lucide-react";
import { AssetsList } from "@/components/assets-list";
import { AssetPanel, type AssetPanelMode } from "@/components/asset-panel";
import { WarrantyBadge } from "@/components/ui/badge";
import { buttonPrimary, listCard, mutedText, pageHeading, sectionHeading } from "@/lib/ui";
import { daysUntil } from "@/lib/dates";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/types/database";
import type { AssetSummary, AssetDetailData } from "@/components/asset-types";

const WARRANTY_WARNING_DAYS = 60;

type PanelState = { mode: AssetPanelMode; assetId: string | null } | null;

export function AssetsExplorer({
  assets,
  vendors,
  staff,
  isOwner,
  dict,
  locale,
}: {
  assets: AssetDetailData[];
  vendors: { id: string; name: string }[];
  staff: { id: string; full_name: string }[];
  isOwner: boolean;
  dict: Dictionary;
  locale: Locale;
}) {
  const searchParams = useSearchParams();
  // Lazy initializer so a `?asset=<id>` deep link (from the command
  // palette) opens the panel on first render, without an effect racing
  // the initial paint — same pattern as the vendor `?vendor=` deep link.
  const [panelState, setPanelState] = useState<PanelState>(() => {
    const assetId = searchParams.get("asset");
    return assetId ? { mode: "view", assetId } : null;
  });

  const panelAsset = panelState?.assetId ? (assets.find((a) => a.id === panelState.assetId) ?? null) : null;

  const assetSummaries: AssetSummary[] = assets.map((a) => ({
    id: a.id,
    name: a.name,
    category: a.category,
    location: a.location,
    status: a.status,
    coverUrl: a.attachments[0]?.publicUrl,
  }));

  const warrantyAlerts = useMemo(
    () =>
      assets
        .filter((a) => a.status === "active" && a.warranty_expires && daysUntil(a.warranty_expires) <= WARRANTY_WARNING_DAYS)
        .sort((a, b) => (a.warranty_expires ?? "").localeCompare(b.warranty_expires ?? "")),
    [assets]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className={pageHeading}>{dict.assets.title}</h1>
        {isOwner && (
          <button
            type="button"
            onClick={() => setPanelState({ mode: "create", assetId: null })}
            className={buttonPrimary}
          >
            <Plus className="size-4" /> {dict.assets.newAsset}
          </button>
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
                <button
                  type="button"
                  onClick={() => setPanelState({ mode: "view", assetId: asset.id })}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-hover"
                >
                  <AssetThumb url={asset.attachments[0]?.publicUrl} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{asset.name}</p>
                    <p className={`${mutedText} truncate`}>{[asset.category, asset.location].filter(Boolean).join(" · ")}</p>
                  </div>
                  <WarrantyBadge warrantyExpires={asset.warranty_expires!} locale={locale} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-2">
        {warrantyAlerts.length > 0 && <h2 className={sectionHeading}>{dict.assets.allAssetsTitle}</h2>}
        <AssetsList
          assets={assetSummaries}
          isOwner={isOwner}
          dict={dict}
          locale={locale}
          onSelect={(assetId) => setPanelState({ mode: "view", assetId })}
          onEdit={(assetId) => setPanelState({ mode: "edit", assetId })}
        />
      </section>

      {panelState && (panelState.mode === "create" || panelAsset) && (
        <AssetPanel
          key={panelState.mode === "create" ? "create" : `${panelState.mode}-${panelState.assetId}`}
          mode={panelState.mode}
          asset={panelState.mode === "create" ? null : panelAsset}
          vendors={vendors}
          staff={staff}
          isOwner={isOwner}
          dict={dict}
          locale={locale}
          onClose={() => setPanelState(null)}
        />
      )}
    </div>
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
