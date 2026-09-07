"use client";

import { useState } from "react";
import Image from "next/image";
import { CalendarClock, Repeat, Wrench } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { AssetStatusBadge } from "@/components/ui/badge";
import { AssetRowMenu } from "@/components/asset-row-menu";
import { card, listCard, listRow, mutedText } from "@/lib/ui";
import { formatLongDate } from "@/lib/dates";
import { format, type Dictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/types/database";
import type { AssetSummary } from "@/components/asset-types";

export type { AssetSummary };
export type AssetsView = "gallery" | "list";

// Client-side tabs so switching Activos/Inactivos/Todos doesn't reload
// the whole panel-view list — matches the work-orders tab pattern.
export function AssetsList({
  assets,
  view,
  isOwner,
  dict,
  locale,
  onSelect,
  onEdit,
  emptyMessage,
}: {
  assets: AssetSummary[];
  view: AssetsView;
  isOwner: boolean;
  dict: Dictionary;
  locale: Locale;
  onSelect: (assetId: string) => void;
  onEdit: (assetId: string) => void;
  emptyMessage?: string;
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

      {filtered.length === 0 ? (
        <EmptyState icon={Wrench} message={emptyMessage ?? dict.assets.empty} />
      ) : view === "gallery" ? (
        <AssetsGallery assets={filtered} isOwner={isOwner} dict={dict} locale={locale} onSelect={onSelect} onEdit={onEdit} />
      ) : (
        <AssetsRows assets={filtered} isOwner={isOwner} dict={dict} locale={locale} onSelect={onSelect} onEdit={onEdit} />
      )}
    </div>
  );
}

type ViewProps = {
  assets: AssetSummary[];
  isOwner: boolean;
  dict: Dictionary;
  locale: Locale;
  onSelect: (assetId: string) => void;
  onEdit: (assetId: string) => void;
};

// The photo is the point of this view — a big cover image per card (not a
// small avatar buried next to the text) so it's actually possible to make
// out what the asset is from the grid.
function AssetsGallery({ assets, isOwner, dict, locale, onSelect, onEdit }: ViewProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
      {assets.map((asset) => (
        <div key={asset.id} className={`overflow-hidden ${card}`}>
          <button type="button" onClick={() => onSelect(asset.id)} className="block w-full text-left">
            <div className="relative aspect-[4/3] w-full bg-canvas-soft">
              {asset.coverUrl ? (
                <Image src={asset.coverUrl} alt="" fill unoptimized className="object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-primary/30">
                  <Wrench className="size-10" strokeWidth={1.5} />
                </div>
              )}
              <span className="absolute left-2 top-2">
                <AssetStatusBadge status={asset.status} locale={locale} />
              </span>
            </div>
            <div className="space-y-1.5 p-3">
              <p className="truncate text-sm font-medium text-ink">{asset.name}</p>
              {asset.category && (
                <span className="inline-flex rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-medium text-primary">
                  {asset.category}
                </span>
              )}
              {asset.nextMaintenanceDate && (
                <p
                  className={`flex items-center gap-1.5 text-xs ${
                    asset.nextMaintenanceOverdue ? "font-medium text-status-overdue-fg" : "text-ink-faint"
                  }`}
                >
                  <CalendarClock className="size-3.5 shrink-0" strokeWidth={2} />
                  {format(dict.assets.nextMaintenanceLabel, {
                    date: formatLongDate(asset.nextMaintenanceDate.slice(0, 10), locale),
                  })}
                </p>
              )}
              {asset.nextMaintenanceRecurrenceText && (
                <p className="flex items-center gap-1.5 text-xs text-ink-faint">
                  <Repeat className="size-3 shrink-0" strokeWidth={2} />
                  {asset.nextMaintenanceRecurrenceText}
                </p>
              )}
            </div>
          </button>
          {isOwner && (
            <div className="flex justify-end border-t border-hairline px-2 py-1">
              <AssetRowMenu assetId={asset.id} assetName={asset.name} status={asset.status} dict={dict} onEdit={() => onEdit(asset.id)} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Compact, information-dense rows — same idea as the work-orders list:
// small thumbnail, name + category/location on one line, status and menu
// at the end, more assets visible per screen than the gallery.
function AssetsRows({ assets, isOwner, dict, locale, onSelect, onEdit }: ViewProps) {
  return (
    <ul className={listCard}>
      {assets.map((asset) => (
        <li key={asset.id} className="flex items-center">
          <button type="button" onClick={() => onSelect(asset.id)} className={`min-w-0 flex-1 ${listRow}`}>
            <AssetThumb url={asset.coverUrl} />
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-ink">
                <span className="truncate">{asset.name}</span>
                <AssetStatusBadge status={asset.status} locale={locale} />
              </p>
              <p className={`${mutedText} truncate`}>
                {[asset.category, asset.location].filter(Boolean).join(" · ")}
              </p>
            </div>
            <div className="shrink-0 text-right">
              {asset.nextMaintenanceDate && (
                <p
                  className={`flex items-center justify-end gap-1.5 text-xs ${
                    asset.nextMaintenanceOverdue ? "font-medium text-status-overdue-fg" : "text-ink-faint"
                  }`}
                >
                  <CalendarClock className="size-3.5 shrink-0" strokeWidth={2} />
                  {formatLongDate(asset.nextMaintenanceDate.slice(0, 10), locale)}
                </p>
              )}
              {asset.nextMaintenanceRecurrenceText && (
                <p className="mt-1 flex items-center justify-end gap-1.5 text-xs text-ink-faint">
                  <Repeat className="size-3 shrink-0" strokeWidth={2} />
                  {asset.nextMaintenanceRecurrenceText}
                </p>
              )}
            </div>
          </button>
          {isOwner && (
            <div className="pr-3">
              <AssetRowMenu assetId={asset.id} assetName={asset.name} status={asset.status} dict={dict} onEdit={() => onEdit(asset.id)} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

function AssetThumb({ url }: { url?: string }) {
  if (url) {
    return (
      <span className="relative size-10 shrink-0 overflow-hidden rounded-lg border border-hairline">
        <Image src={url} alt="" fill unoptimized className="object-cover" />
      </span>
    );
  }
  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
      <Wrench className="size-4" strokeWidth={2} />
    </span>
  );
}

function tabClass(active: boolean) {
  return `-mb-px border-b-2 px-1 pb-2 text-sm font-medium transition-colors ${
    active ? "border-primary text-primary" : "border-transparent text-ink-muted hover:text-ink"
  }`;
}
