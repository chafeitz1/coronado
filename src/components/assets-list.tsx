"use client";

import { useState } from "react";
import Image from "next/image";
import { CalendarClock, Repeat, Wrench } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { AssetStatusBadge } from "@/components/ui/badge";
import { AssetRowMenu } from "@/components/asset-row-menu";
import { card } from "@/lib/ui";
import { formatLongDate } from "@/lib/dates";
import type { Dictionary } from "@/lib/i18n/dictionaries";
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
        // relative + h-full (not overflow-hidden) so the card can stretch to
        // match the tallest card in its grid row without clipping the "..."
        // menu's dropdown — the menu itself lives here, not inside the image
        // wrapper below, precisely so that wrapper's own overflow-hidden
        // (for the photo's rounded corners) never clips it again.
        <div key={asset.id} className={`group relative flex h-full flex-col ${card}`}>
          {isOwner && (
            <div className="absolute right-1.5 top-1.5 z-10 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
              <AssetRowMenu
                assetId={asset.id}
                assetName={asset.name}
                status={asset.status}
                dict={dict}
                onEdit={() => onEdit(asset.id)}
                variant="overlay"
              />
            </div>
          )}
          <button type="button" onClick={() => onSelect(asset.id)} className="flex flex-1 flex-col text-left">
            <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-t-md bg-canvas-soft">
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
            <div className="flex flex-1 flex-col gap-1.5 p-3">
              <p className="truncate text-sm font-medium text-ink">{asset.name}</p>
              {asset.category && (
                <span className="inline-flex w-fit rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-medium text-primary">
                  {asset.category}
                </span>
              )}
              {/* Pushed to the bottom of the card (mt-auto) so the next-
                  maintenance/recurrence lines — present on some cards, not
                  others — don't shift where each card's content block ends;
                  every card's text still starts at the same height. */}
              {(asset.nextMaintenanceDate || asset.nextMaintenanceRecurrenceText) && (
                <div className="mt-auto space-y-1 pt-1">
                  {asset.nextMaintenanceDate && (
                    <p
                      className={`flex items-center gap-1.5 text-xs ${
                        asset.nextMaintenanceOverdue ? "font-medium text-status-overdue-fg" : "text-ink-faint"
                      }`}
                    >
                      <CalendarClock className="size-3.5 shrink-0" strokeWidth={2} />
                      {formatLongDate(asset.nextMaintenanceDate.slice(0, 10), locale)}
                    </p>
                  )}
                  {asset.nextMaintenanceRecurrenceText && (
                    <p className="flex items-center gap-1.5 text-xs text-ink-faint">
                      <Repeat className="size-3 shrink-0" strokeWidth={2} />
                      {asset.nextMaintenanceRecurrenceText}
                    </p>
                  )}
                </div>
              )}
            </div>
          </button>
        </div>
      ))}
    </div>
  );
}

// Compact, information-dense table — same idea as the work-orders table
// view, with explicit column headers so it's clear what each cell means
// (name/thumb, category, location, next maintenance, recurrence).
function AssetsRows({ assets, isOwner, dict, locale, onSelect, onEdit }: ViewProps) {
  return (
    <div className={`overflow-x-auto ${card}`}>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-hairline text-xs text-ink-faint">
            <th className="whitespace-nowrap px-4 py-2.5 font-medium">{dict.assets.columnAsset}</th>
            <th className="whitespace-nowrap px-4 py-2.5 font-medium">{dict.assets.columnCategory}</th>
            <th className="whitespace-nowrap px-4 py-2.5 font-medium">{dict.assets.columnLocation}</th>
            <th className="whitespace-nowrap px-4 py-2.5 font-medium">{dict.assets.columnNextMaintenance}</th>
            <th className="whitespace-nowrap px-4 py-2.5 font-medium">{dict.assets.columnRecurrence}</th>
            {isOwner && <th className="px-2 py-2.5" aria-hidden />}
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline">
          {assets.map((asset) => (
            <tr key={asset.id} onClick={() => onSelect(asset.id)} className="cursor-pointer transition-colors hover:bg-surface-hover active:bg-surface-hover">
              <td className="px-4 py-2.5">
                <span className="flex min-w-0 items-center gap-2.5">
                  <AssetThumb url={asset.coverUrl} />
                  <span className="flex min-w-0 flex-wrap items-center gap-1.5">
                    <span className="max-w-48 truncate font-medium text-ink">{asset.name}</span>
                    <AssetStatusBadge status={asset.status} locale={locale} />
                  </span>
                </span>
              </td>
              <td className="max-w-32 truncate px-4 py-2.5 text-ink-secondary">{asset.category ?? "—"}</td>
              <td className="max-w-32 truncate px-4 py-2.5 text-ink-secondary">{asset.location ?? "—"}</td>
              <td className="whitespace-nowrap px-4 py-2.5">
                {asset.nextMaintenanceDate ? (
                  <span
                    className={`flex items-center gap-1.5 ${
                      asset.nextMaintenanceOverdue ? "font-medium text-status-overdue-fg" : "text-ink-secondary"
                    }`}
                  >
                    <CalendarClock className="size-3.5 shrink-0" strokeWidth={2} />
                    {formatLongDate(asset.nextMaintenanceDate.slice(0, 10), locale)}
                  </span>
                ) : (
                  <span className="text-ink-faint">—</span>
                )}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-ink-secondary">
                {asset.nextMaintenanceRecurrenceText ? (
                  <span className="flex items-center gap-1.5">
                    <Repeat className="size-3 shrink-0" strokeWidth={2} />
                    {asset.nextMaintenanceRecurrenceText}
                  </span>
                ) : (
                  <span className="text-ink-faint">—</span>
                )}
              </td>
              {isOwner && (
                <td className="px-2 py-2.5" onClick={(e) => e.stopPropagation()}>
                  <AssetRowMenu assetId={asset.id} assetName={asset.name} status={asset.status} dict={dict} onEdit={() => onEdit(asset.id)} />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
