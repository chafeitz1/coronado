"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Pencil,
  Trash2,
  Power,
  Wrench,
  Building2,
  ClipboardList,
  Repeat,
  History,
  CalendarClock,
  Plus,
} from "lucide-react";
import { SidePanel } from "@/components/ui/side-panel";
import { AssetForm } from "@/components/asset-form";
import { AssetAttachments } from "@/components/asset-attachments";
import { NewMaintenanceTaskPanel } from "@/components/new-maintenance-task-panel";
import { StatusBadge, WarrantyBadge, AssetStatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { createAsset, updateAsset, deleteAsset, updateAssetStatus } from "@/app/actions/assets";
import { buttonUtility, listCard, listRow, mutedText, sectionHeading } from "@/lib/ui";
import { format, type Dictionary } from "@/lib/i18n/dictionaries";
import type { AssetStatus, Locale } from "@/lib/types/database";
import type { AssetDetailData } from "@/components/asset-types";

export type AssetPanelMode = "create" | "view" | "edit";

export function AssetPanel({
  mode: initialMode,
  asset,
  vendors,
  staff,
  isOwner,
  dict,
  locale,
  onClose,
}: {
  mode: AssetPanelMode;
  asset: AssetDetailData | null;
  vendors: { id: string; name: string }[];
  staff: { id: string; full_name: string }[];
  isOwner: boolean;
  dict: Dictionary;
  locale: Locale;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<AssetPanelMode>(initialMode);
  const [showNewTask, setShowNewTask] = useState(false);

  const [deletePending, startDelete] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [statusPending, startStatus] = useTransition();
  const [createError, setCreateError] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

  async function handleCreate(formData: FormData) {
    setCreateError(null);
    const result = await createAsset(null, formData);
    if (result?.ok) onClose();
    else setCreateError(result && !result.ok ? result.error : null);
  }

  async function handleUpdate(formData: FormData) {
    if (!asset) return;
    setUpdateError(null);
    const result = await updateAsset(asset.id, null, formData);
    if (result?.ok) setMode("view");
    else setUpdateError(result && !result.ok ? result.error : null);
  }

  function handleDelete() {
    if (!asset) return;
    if (!window.confirm(format(dict.assetDetail.deleteConfirm, { name: asset.name }))) return;
    startDelete(async () => {
      const result = await deleteAsset(asset.id);
      if (result.error) setDeleteError(result.error);
      else onClose();
    });
  }

  function handleToggleStatus() {
    if (!asset) return;
    const next: AssetStatus = asset.status === "active" ? "inactive" : "active";
    startStatus(async () => {
      await updateAssetStatus(asset.id, next);
    });
  }

  const unitLabels: Record<string, string> = {
    days: dict.assetDetail.unitDays,
    weeks: dict.assetDetail.unitWeeks,
    months: dict.assetDetail.unitMonths,
    years: dict.assetDetail.unitYears,
  };

  // View mode shows the asset's photo + name in the body instead — no
  // need to repeat it in the panel header too.
  const title = mode === "create" ? dict.assets.newAsset : mode === "edit" ? dict.assetDetail.editAsset : undefined;

  return (
    <SidePanel open onClose={onClose} title={title}>
      {mode === "create" && (
        <AssetForm
          action={handleCreate}
          submitLabel={dict.assetForm.submit}
          vendors={vendors}
          dict={dict}
          error={createError ?? undefined}
          onCancel={onClose}
        />
      )}

      {mode === "edit" && asset && (
        <AssetForm
          action={handleUpdate}
          submitLabel={dict.assetForm.submitEdit}
          vendors={vendors}
          dict={dict}
          defaultValues={asset}
          error={updateError ?? undefined}
          onCancel={() => setMode("view")}
        />
      )}

      {mode === "view" && asset && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <AssetThumb url={asset.attachments[0]?.publicUrl} />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-lg font-semibold text-ink">
                <span className="truncate">{asset.name}</span>
                <AssetStatusBadge status={asset.status} locale={locale} />
              </p>
              {asset.warranty_expires && <WarrantyBadge warrantyExpires={asset.warranty_expires} locale={locale} />}
            </div>
          </div>

          {isOwner && (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setMode("edit")} className={buttonUtility}>
                  <Pencil className="size-3.5" /> {dict.assetDetail.edit}
                </button>
                <button type="button" onClick={handleToggleStatus} disabled={statusPending} className={buttonUtility}>
                  <Power className="size-3.5" />
                  {asset.status === "active" ? dict.assetDetail.markInactive : dict.assetDetail.markActive}
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deletePending}
                  className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-hairline bg-surface px-3 py-1.5 text-sm font-medium text-status-overdue-fg transition-colors hover:bg-status-overdue-bg disabled:pointer-events-none disabled:opacity-50"
                >
                  <Trash2 className="size-3.5" /> {dict.assetDetail.delete}
                </button>
              </div>
              {deleteError && <p className="text-sm text-status-overdue-fg">{deleteError}</p>}
            </div>
          )}

          {(asset.category || asset.location || asset.brand || asset.model || asset.serial_number ||
            asset.purchase_date || asset.warranty_expires) && (
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {asset.category && (
                <span>
                  <span className={mutedText}>{dict.assetDetail.categoryLabel}:</span> {asset.category}
                </span>
              )}
              {asset.location && (
                <span>
                  <span className={mutedText}>{dict.assetDetail.locationLabel}:</span> {asset.location}
                </span>
              )}
              {asset.brand && (
                <span>
                  <span className={mutedText}>{dict.assetDetail.brandLabel}:</span> {asset.brand}
                </span>
              )}
              {asset.model && (
                <span>
                  <span className={mutedText}>{dict.assetDetail.modelLabel}:</span> {asset.model}
                </span>
              )}
              {asset.serial_number && (
                <span>
                  <span className={mutedText}>{dict.assetDetail.serialLabel}:</span> {asset.serial_number}
                </span>
              )}
              {asset.purchase_date && (
                <span>
                  <span className={mutedText}>{dict.assetDetail.purchaseDateLabel}:</span> {asset.purchase_date}
                </span>
              )}
              {asset.warranty_expires && (
                <span>
                  <span className={mutedText}>{dict.assetDetail.warrantyLabel}:</span> {asset.warranty_expires}
                </span>
              )}
            </div>
          )}

          {asset.preferred_vendor_id && asset.preferredVendorName && (
            <Link
              href={`/directory?vendor=${asset.preferred_vendor_id}`}
              className="flex items-center gap-3 rounded-lg border border-hairline p-3 text-sm transition-colors hover:bg-surface-hover"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <Building2 className="size-4" strokeWidth={2} />
              </span>
              <div className="min-w-0 flex-1">
                <p className={mutedText}>{dict.assetDetail.preferredVendorLabel}</p>
                <p className="font-medium text-ink">{asset.preferredVendorName}</p>
              </div>
            </Link>
          )}

          {asset.notes && (
            <div className="space-y-1.5">
              <h3 className={sectionHeading}>{dict.assetDetail.notesTitle}</h3>
              <p className="text-sm leading-relaxed text-ink-secondary">{asset.notes}</p>
            </div>
          )}

          <div className="space-y-2">
            <h3 className={sectionHeading}>{dict.assetDetail.photosTitle}</h3>
            <AssetAttachments assetId={asset.id} attachments={asset.attachments} dict={dict} />
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className={sectionHeading}>
                <span className="inline-flex items-center gap-1.5">
                  <CalendarClock className="size-3.5" /> {dict.assetDetail.upcomingTitle}
                </span>
              </h3>
              <button type="button" onClick={() => setShowNewTask(true)} className={buttonUtility}>
                <Plus className="size-3.5" /> {dict.assetDetail.newMaintenanceTask}
              </button>
            </div>
            {asset.upcoming.length > 0 ? (
              <ul className={listCard}>
                {asset.upcoming.map((wo) => (
                  <li key={wo.id}>
                    <Link href={`/work-orders/${wo.id}`} className={listRow}>
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                        <ClipboardList className="size-4" strokeWidth={2} />
                      </span>
                      <div className="min-w-40 flex-1">
                        <p className="truncate font-medium text-ink">{wo.title}</p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1">
                          <span className={mutedText}>
                            {wo.due_date
                              ? format(dict.assetDetail.dueDate, { date: wo.due_date })
                              : dict.assetDetail.noDueDate}
                            {wo.vendorName && ` · ${wo.vendorName}`}
                          </span>
                          {wo.recurrence_interval_value && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-canvas-soft px-2 py-0.5 text-[11px] font-medium text-ink-muted">
                              <Repeat className="size-3" strokeWidth={2} />
                              {format(dict.assetDetail.recurrence, {
                                value: wo.recurrence_interval_value,
                                unit: unitLabels[wo.recurrence_interval_unit ?? ""] ?? wo.recurrence_interval_unit ?? "",
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                      <StatusBadge status={wo.status} locale={locale} />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={CalendarClock} message={dict.assetDetail.emptyUpcoming} />
            )}
          </div>

          <div className="space-y-2">
            <h3 className={sectionHeading}>
              <span className="inline-flex items-center gap-1.5">
                <History className="size-3.5" /> {dict.assetDetail.historyTitle}
              </span>
            </h3>
            {asset.history.length > 0 ? (
              <ul className={listCard}>
                {asset.history.map((wo) => (
                  <li key={wo.id}>
                    <Link href={`/work-orders/${wo.id}`} className={listRow}>
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-canvas-soft text-ink-muted">
                        <ClipboardList className="size-4" strokeWidth={2} />
                      </span>
                      <div className="min-w-40 flex-1">
                        <p className="truncate font-medium text-ink">{wo.title}</p>
                        <p className={mutedText}>
                          {wo.completed_at ? new Date(wo.completed_at).toLocaleDateString(locale) : "—"}
                        </p>
                      </div>
                      <StatusBadge status={wo.status} locale={locale} />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={History} message={dict.assetDetail.emptyHistory} />
            )}
          </div>
        </div>
      )}

      {showNewTask && asset && (
        <NewMaintenanceTaskPanel
          assetId={asset.id}
          vendors={vendors}
          staff={staff}
          isOwner={isOwner}
          dict={dict}
          onClose={() => setShowNewTask(false)}
        />
      )}
    </SidePanel>
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
