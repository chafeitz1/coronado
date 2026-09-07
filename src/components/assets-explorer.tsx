"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { Search, Plus, CalendarClock, Repeat, Wrench } from "lucide-react";
import { AssetsList } from "@/components/assets-list";
import { AssetPanel, type AssetPanelMode } from "@/components/asset-panel";
import { OverdueBadge } from "@/components/ui/badge";
import { card, input, mutedText, sectionHeading } from "@/lib/ui";
import { daysUntil } from "@/lib/dates";
import { format, type Dictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/types/database";
import type { AssetSummary, AssetDetailData } from "@/components/asset-types";

const MAINTENANCE_DUE_WINDOW_DAYS = 30;

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
  const [search, setSearch] = useState("");

  const panelAsset = panelState?.assetId ? (assets.find((a) => a.id === panelState.assetId) ?? null) : null;

  const q = search.trim().toLowerCase();
  // Search only narrows the browsable list below — the "Upcoming
  // maintenance" attention section above stays as-is regardless of query,
  // same way the directory's search doesn't touch anything outside its
  // own list.
  const searchedAssets = useMemo(
    () =>
      assets.filter(
        (a) =>
          !q ||
          a.name.toLowerCase().includes(q) ||
          a.category?.toLowerCase().includes(q) ||
          a.location?.toLowerCase().includes(q) ||
          a.brand?.toLowerCase().includes(q) ||
          a.model?.toLowerCase().includes(q)
      ),
    [assets, q]
  );

  // Suggests existing categories/locations in the create/edit form —
  // nudges people toward reusing "Piscina" instead of also typing
  // "piscina"/"Pool", same idea as the directory's vendor-trade suggestions.
  const existingCategories = useMemo(
    () => [...new Set(assets.map((a) => a.category).filter((c): c is string => !!c))].sort((a, b) => a.localeCompare(b)),
    [assets]
  );
  const existingLocations = useMemo(
    () => [...new Set(assets.map((a) => a.location).filter((l): l is string => !!l))].sort((a, b) => a.localeCompare(b)),
    [assets]
  );

  const unitLabels: Record<string, string> = useMemo(
    () => ({
      days: dict.assetDetail.unitDays,
      weeks: dict.assetDetail.unitWeeks,
      months: dict.assetDetail.unitMonths,
      years: dict.assetDetail.unitYears,
    }),
    [dict]
  );

  const assetSummaries: AssetSummary[] = searchedAssets.map((a) => {
    // upcoming is already sorted ascending by due_date (see assets/page.tsx)
    const nextUpcoming = a.upcoming[0] ?? null;
    return {
      id: a.id,
      name: a.name,
      category: a.category,
      location: a.location,
      status: a.status,
      coverUrl: a.attachments[0]?.publicUrl,
      nextMaintenanceDate: nextUpcoming?.due_date ?? null,
      nextMaintenanceOverdue: !!(nextUpcoming?.due_date && daysUntil(nextUpcoming.due_date) < 0),
      nextMaintenanceRecurrenceText: nextUpcoming?.recurrence_interval_value
        ? format(dict.assetDetail.recurrence, {
            value: nextUpcoming.recurrence_interval_value,
            unit: unitLabels[nextUpcoming.recurrence_interval_unit ?? ""] ?? nextUpcoming.recurrence_interval_unit ?? "",
          })
        : null,
    };
  });

  const maintenanceDue = useMemo(() => {
    return assets
      .filter((a) => a.status === "active")
      .flatMap((a) =>
        a.upcoming
          .filter((wo) => wo.due_date && daysUntil(wo.due_date) <= MAINTENANCE_DUE_WINDOW_DAYS)
          .map((wo) => ({
            workOrderId: wo.id,
            assetId: a.id,
            assetName: a.name,
            coverUrl: a.attachments[0]?.publicUrl,
            title: wo.title,
            days: daysUntil(wo.due_date!),
            recurrenceText: wo.recurrence_interval_value
              ? format(dict.assetDetail.recurrence, {
                  value: wo.recurrence_interval_value,
                  unit: unitLabels[wo.recurrence_interval_unit ?? ""] ?? wo.recurrence_interval_unit ?? "",
                })
              : null,
          }))
      )
      .sort((a, b) => a.days - b.days);
  }, [assets, dict, unitLabels]);

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={dict.assets.searchPlaceholder}
            className={`${input} pl-9`}
          />
        </div>
        {isOwner && (
          <button
            type="button"
            onClick={() => setPanelState({ mode: "create", assetId: null })}
            aria-label={dict.assets.newAsset}
            title={dict.assets.newAsset}
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary transition-colors hover:bg-primary-active"
          >
            <Plus className="size-5" />
          </button>
        )}
      </div>

      {maintenanceDue.length > 0 && (
        <section className="space-y-2">
          <h2 className={sectionHeading}>
            <span className="inline-flex items-center gap-1.5">
              <CalendarClock className="size-3.5 text-status-progress-fg" />
              {dict.assets.maintenanceDueTitle} <span className="text-ink-faint">· {maintenanceDue.length}</span>
            </span>
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {maintenanceDue.map((item) => (
              <button
                key={item.workOrderId}
                type="button"
                onClick={() => setPanelState({ mode: "view", assetId: item.assetId })}
                className={`flex flex-col gap-3 p-4 text-left transition-colors hover:bg-surface-hover ${card}`}
              >
                <div className="flex items-center gap-3">
                  <AssetThumb url={item.coverUrl} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{item.assetName}</p>
                    <p className={`${mutedText} truncate`}>{item.title}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {item.days < 0 ? (
                    <OverdueBadge locale={locale} />
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-status-progress-bg px-2.5 py-1 text-xs font-semibold text-status-progress-fg">
                      {format(dict.badges.dueIn, { days: item.days })}
                    </span>
                  )}
                  {item.recurrenceText && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-canvas-soft px-2 py-0.5 text-[11px] font-medium text-ink-muted">
                      <Repeat className="size-3" strokeWidth={2} /> {item.recurrenceText}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-2">
        {maintenanceDue.length > 0 && <h2 className={sectionHeading}>{dict.assets.allAssetsTitle}</h2>}
        <AssetsList
          assets={assetSummaries}
          isOwner={isOwner}
          dict={dict}
          locale={locale}
          onSelect={(assetId) => setPanelState({ mode: "view", assetId })}
          onEdit={(assetId) => setPanelState({ mode: "edit", assetId })}
          emptyMessage={q ? dict.assets.emptySearch : undefined}
        />
      </section>

      {panelState && (panelState.mode === "create" || panelAsset) && (
        <AssetPanel
          key={panelState.mode === "create" ? "create" : `${panelState.mode}-${panelState.assetId}`}
          mode={panelState.mode}
          asset={panelState.mode === "create" ? null : panelAsset}
          vendors={vendors}
          staff={staff}
          existingCategories={existingCategories}
          existingLocations={existingLocations}
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
