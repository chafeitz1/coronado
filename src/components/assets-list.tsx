"use client";

import { useState } from "react";
import Image from "next/image";
import { CalendarClock, History, Repeat, Wrench } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { AssetStatusBadge } from "@/components/ui/badge";
import { AssetRowMenu } from "@/components/asset-row-menu";
import { card, mutedText } from "@/lib/ui";
import { formatLongDate } from "@/lib/dates";
import { format, type Dictionary } from "@/lib/i18n/dictionaries";
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
        // Card grid (not a thin list) so each asset's photo can actually
        // be seen — a small avatar-style thumbnail looks lost in a
        // single-column row.
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((asset) => (
            <div key={asset.id} className={`flex items-start gap-2 p-3 ${card}`}>
              <button
                type="button"
                onClick={() => onSelect(asset.id)}
                className="flex min-w-0 flex-1 items-start gap-3 text-left"
              >
                <AssetThumb url={asset.coverUrl} />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-ink">
                    <span className="truncate">{asset.name}</span>
                    <AssetStatusBadge status={asset.status} locale={locale} />
                  </p>
                  <p className={`${mutedText} truncate`}>
                    {[asset.category, asset.location].filter(Boolean).join(" · ") || dict.assets.noCategory}
                  </p>
                  {/* Next maintenance is more actionable than last, so it
                      takes priority when both are known — falls back to
                      last only for assets with no upcoming task. */}
                  {asset.nextMaintenanceDate ? (
                    <p
                      className={`mt-1.5 flex items-center gap-1.5 text-xs ${
                        asset.nextMaintenanceOverdue ? "font-medium text-status-overdue-fg" : "text-ink-faint"
                      }`}
                    >
                      <CalendarClock className="size-3.5 shrink-0" strokeWidth={2} />
                      {format(dict.assets.nextMaintenanceLabel, {
                        date: formatLongDate(asset.nextMaintenanceDate.slice(0, 10), locale),
                      })}
                      {asset.nextMaintenanceRecurring && <Repeat className="size-3 shrink-0" strokeWidth={2} />}
                    </p>
                  ) : (
                    asset.lastMaintenanceDate && (
                      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-ink-faint">
                        <History className="size-3.5 shrink-0" strokeWidth={2} />
                        {format(dict.assets.lastMaintenanceLabel, {
                          date: formatLongDate(asset.lastMaintenanceDate.slice(0, 10), locale),
                        })}
                      </p>
                    )
                  )}
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
          ))}
        </div>
      ) : (
        <EmptyState icon={Wrench} message={dict.assets.empty} />
      )}
    </div>
  );
}

function AssetThumb({ url }: { url?: string }) {
  if (url) {
    return (
      <span className="relative size-14 shrink-0 overflow-hidden rounded-full border border-hairline">
        <Image src={url} alt="" fill unoptimized className="object-cover" />
      </span>
    );
  }
  return (
    <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
      <Wrench className="size-6" strokeWidth={2} />
    </span>
  );
}

function tabClass(active: boolean) {
  return `-mb-px border-b-2 px-1 pb-2 text-sm font-medium transition-colors ${
    active ? "border-primary text-primary" : "border-transparent text-ink-muted hover:text-ink"
  }`;
}
