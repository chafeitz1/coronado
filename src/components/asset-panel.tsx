"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Pencil,
  Trash2,
  Power,
  PowerOff,
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
import { StatusBadge } from "@/components/ui/badge";
import { WorkOrderStatusChip } from "@/components/work-order-status-chip";
import { EmptyState } from "@/components/ui/empty-state";
import { createAsset, updateAsset, deleteAsset, updateAssetStatus } from "@/app/actions/assets";
import { listCard, listRow, mutedText, sectionHeading } from "@/lib/ui";
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

  // How often this asset needs maintenance is a property of the asset,
  // not of any single upcoming task — so it's shown once in the header
  // (deduped across upcoming recurring tasks) instead of repeated on
  // every row in the list below.
  const recurrenceLabels: string[] = [];
  if (asset) {
    const seen = new Set<string>();
    for (const wo of asset.upcoming) {
      if (!wo.recurrence_interval_value || !wo.recurrence_interval_unit) continue;
      const key = `${wo.recurrence_interval_value}-${wo.recurrence_interval_unit}`;
      if (seen.has(key)) continue;
      seen.add(key);
      recurrenceLabels.push(
        format(dict.assetDetail.recurrence, {
          value: wo.recurrence_interval_value,
          unit: unitLabels[wo.recurrence_interval_unit] ?? wo.recurrence_interval_unit,
        })
      );
    }
  }

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
          {/* pr-8 keeps the edit/delete icons clear of SidePanel's own
              floating close "X", which sits absolutely at top-right when
              there's no panel title (view mode never sets one). */}
          <div className="flex items-center gap-3 pr-8">
            <AssetThumb url={asset.attachments[0]?.publicUrl} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="min-w-0 flex-1 truncate text-lg font-semibold text-ink">{asset.name}</p>
                {isOwner && (
                  <>
                    <button
                      type="button"
                      onClick={() => setMode("edit")}
                      title={dict.assetDetail.edit}
                      className="flex size-7 shrink-0 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-canvas-soft hover:text-ink"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={deletePending}
                      title={dict.assetDetail.delete}
                      className="flex size-7 shrink-0 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-status-overdue-bg hover:text-status-overdue-fg disabled:pointer-events-none disabled:opacity-50"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </>
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <AssetStatusChip
                  status={asset.status}
                  isOwner={isOwner}
                  pending={statusPending}
                  onToggle={handleToggleStatus}
                  dict={dict}
                />
                {recurrenceLabels.map((label) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-1 rounded-full bg-canvas-soft px-2.5 py-1 text-xs font-medium text-ink-muted"
                  >
                    <Repeat className="size-3" strokeWidth={2} /> {label}
                  </span>
                ))}
              </div>
              {deleteError && <p className="mt-1 text-sm text-status-overdue-fg">{deleteError}</p>}
            </div>
          </div>

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
              <button
                type="button"
                onClick={() => setShowNewTask(true)}
                title={dict.assetDetail.newMaintenanceTask}
                aria-label={dict.assetDetail.newMaintenanceTask}
                className="flex size-7 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-canvas-soft hover:text-ink"
              >
                <Plus className="size-4" strokeWidth={2.5} />
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
                        <p className="flex items-center gap-1.5 truncate font-medium text-ink">
                          {wo.title}
                          {wo.recurrence_interval_value && (
                            <Repeat className="size-3.5 shrink-0 text-ink-faint" strokeWidth={2} />
                          )}
                        </p>
                        <p className={mutedText}>
                          {wo.due_date
                            ? format(dict.assetDetail.dueDate, { date: wo.due_date })
                            : dict.assetDetail.noDueDate}
                          {wo.vendorName && ` · ${wo.vendorName}`}
                        </p>
                      </div>
                      <WorkOrderStatusChip workOrderId={wo.id} status={wo.status} canEdit={isOwner} dict={dict} />
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

// Doubles as the status indicator and the toggle control — clicking it
// (owner only) flips active/inactive directly, no separate button needed.
function AssetStatusChip({
  status,
  isOwner,
  pending,
  onToggle,
  dict,
}: {
  status: AssetStatus;
  isOwner: boolean;
  pending: boolean;
  onToggle: () => void;
  dict: Dictionary;
}) {
  const isActive = status === "active";
  const Icon = isActive ? Power : PowerOff;
  const label = isActive ? dict.assetDetail.statusActive : dict.assetDetail.statusInactive;
  const toneClass = isActive ? "bg-status-done-bg text-status-done-fg" : "bg-canvas-soft text-ink-muted";
  const baseClass = `inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${toneClass}`;

  if (!isOwner) {
    return (
      <span className={baseClass}>
        <Icon className="size-3" strokeWidth={2.5} /> {label}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={pending}
      title={isActive ? dict.assetDetail.markInactive : dict.assetDetail.markActive}
      className={`${baseClass} transition-opacity hover:opacity-80 disabled:opacity-60`}
    >
      <Icon className="size-3" strokeWidth={2.5} /> {label}
    </button>
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
