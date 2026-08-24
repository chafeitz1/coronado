"use client";

import { useState } from "react";
import Image from "next/image";
import { Wrench } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { AssetStatusBadge } from "@/components/ui/badge";
import { AssetRowMenu } from "@/components/asset-row-menu";
import { listCard, mutedText } from "@/lib/ui";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/types/database";
import type { AssetSummary } from "@/components/asset-types";

export type { AssetSummary };

// Client-side tabs so switching Activos/Inactivos/Todos doesn't reload
// the whole panel-view list — matches the work-orders tab pattern.
export function AssetsList({
  assets,
  isOwner,
  dict,
  locale,
  onSelect,
  onEdit,
}: {
  assets: AssetSummary[];
  isOwner: boolean;
  dict: Dictionary;
  locale: Locale;
  onSelect: (assetId: string) => void;
  onEdit: (assetId: string) => void;
}) {
  const [tab, setTab] = useState<"active" | "inactive" | "all">("active");

  const filtered = assets.filter((a) => tab === "all" || a.status === tab);

  return (
    <div className="space-y-2">
      <div className="flex gap-4 border-b border-hairline">
        <button type="button" onClick={() => setTab("active")} className={tabClass(tab === "active")}>
          {dict.assets.filterActive}
        </button>
        <button type="button" onClick={() => setTab("inactive")} className={tabClass(tab === "inactive")}>
          {dict.assets.filterInactive}
        </button>
        <button type="button" onClick={() => setTab("all")} className={tabClass(tab === "all")}>
          {dict.assets.filterAllStatus}
        </button>
      </div>

      {filtered.length > 0 ? (
        <ul className={listCard}>
          {filtered.map((asset) => (
            <li key={asset.id}>
              <div className="flex items-center gap-1 pl-4 pr-2 transition-colors hover:bg-surface-hover">
                <button
                  type="button"
                  onClick={() => onSelect(asset.id)}
                  className="flex min-w-0 flex-1 items-center gap-3 py-3 text-left"
                >
                  <AssetThumb url={asset.coverUrl} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 truncate text-sm font-medium text-ink">
                      <span className="truncate">{asset.name}</span>
                      <AssetStatusBadge status={asset.status} locale={locale} />
                    </p>
                    <p className={`${mutedText} truncate`}>
                      {[asset.category, asset.location].filter(Boolean).join(" · ") || dict.assets.noCategory}
                    </p>
                  </div>
                </button>
                {isOwner && (
                  <AssetRowMenu
                    assetId={asset.id}
                    assetName={asset.name}
                    status={asset.status}
                    dict={dict}
                    onEdit={() => onEdit(asset.id)}
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={Wrench} message={dict.assets.empty} />
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

function tabClass(active: boolean) {
  return `-mb-px border-b-2 px-1 pb-2 text-sm font-medium transition-colors ${
    active ? "border-primary text-primary" : "border-transparent text-ink-muted hover:text-ink"
  }`;
}
