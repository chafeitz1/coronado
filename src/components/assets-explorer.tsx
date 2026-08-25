"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { Plus, CalendarClock, Repeat, Wrench } from "lucide-react";
import { AssetsList } from "@/components/assets-list";
import { AssetPanel, type AssetPanelMode } from "@/components/asset-panel";
import { OverdueBadge } from "@/components/ui/badge";
import { buttonPrimary, card, mutedText, pageHeading, sectionHeading } from "@/lib/ui";
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

  const panelAsset = panelState?.assetId ? (assets.find((a) => a.id === panelState.assetId) ?? null) : null;

  const assetSummaries: AssetSummary[] = assets.map((a) => {
    // upcoming is already sorted ascending by due_date (see assets/page.tsx)
    const nextUpcoming = a.upcoming[0] ?? null;
    return {
      id: a.id,
      name: a.name,
      category: a.category,
      location: a.location,
      status: a.status,
      coverUrl: a.attachments[0]?.publicUrl,
      // history[0] can be a skipped item (still sorted to the top by
      // completed_at) — "last maintenance" should only ever mean the last
      // time work actually happened.
      lastMaintenanceDate: a.history.find((wo) => wo.status === "done")?.completed_at ?? null,
      nextMaintenanceDate: nextUpcoming?.due_date ?? null,
      nextMaintenanceOverdue: !!(nextUpcoming?.due_date && daysUntil(nextUpcoming.due_date) < 0),
      nextMaintenanceRecurring: !!nextUpcoming?.recurrence_interval_value,
    };
  });

  const maintenanceDue = useMemo(() => {
    const unitLabels: Record<string, string> = {
      days: dict.assetDetail.unitDays,
      weeks: dict.assetDetail.unitWeeks,
      months: dict.assetDetail.unitMonths,
      years: dict.assetDetail.unitYears,
    };
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
  }, [assets, dict]);

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
