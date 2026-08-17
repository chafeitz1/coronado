import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Trash2, Building2, ClipboardList, Repeat, History, CalendarClock } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { deleteAsset } from "@/app/actions/assets";
import { StatusBadge, WarrantyBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { SuccessBanner } from "@/components/ui/success-banner";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { AssetAttachments } from "@/app/assets/[id]/attachments-section";
import { getDictionary, format } from "@/lib/i18n/dictionaries";
import {
  buttonUtility,
  card,
  listCard,
  listRow,
  mutedText,
  pageHeading,
  sectionHeading,
} from "@/lib/ui";

export default async function AssetDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; updated?: string }>;
}) {
  const { id } = await params;
  const { created, updated } = await searchParams;
  const profile = await requireUser();
  const dict = getDictionary(profile.locale);
  const supabase = await createClient();

  const { data: asset } = await supabase
    .from("assets")
    .select("*, preferred_vendor:vendors(id, name, phone)")
    .eq("id", id)
    .single();

  if (!asset) notFound();
  const preferredVendor = single(asset.preferred_vendor);

  const { data: attachmentRows } = await supabase
    .from("attachments")
    .select("id, storage_path, file_name, uploaded_by")
    .eq("asset_id", id)
    .order("created_at", { ascending: false });

  const attachments = (attachmentRows ?? []).map((a) => ({
    id: a.id,
    storagePath: a.storage_path,
    fileName: a.file_name,
    publicUrl: supabase.storage.from("attachments").getPublicUrl(a.storage_path).data.publicUrl,
    canDelete: profile.role === "owner" || a.uploaded_by === profile.id,
  }));

  const { data: relatedOrders } = await supabase
    .from("work_orders")
    .select("id, title, status, due_date, completed_at, recurrence_interval_value, recurrence_interval_unit")
    .eq("asset_id", id)
    .order("created_at", { ascending: false });

  const orders = relatedOrders ?? [];
  const upcoming = orders
    .filter((wo) => wo.status !== "done")
    .sort((a, b) => (a.due_date ?? "9999-99-99").localeCompare(b.due_date ?? "9999-99-99"));
  const history = orders
    .filter((wo) => wo.status === "done")
    .sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? ""));

  const unitLabels: Record<string, string> = {
    days: dict.assetDetail.unitDays,
    weeks: dict.assetDetail.unitWeeks,
    months: dict.assetDetail.unitMonths,
    years: dict.assetDetail.unitYears,
  };

  const details = [
    { label: dict.assetDetail.categoryLabel, value: asset.category },
    { label: dict.assetDetail.locationLabel, value: asset.location },
    { label: dict.assetDetail.brandLabel, value: asset.brand },
    { label: dict.assetDetail.modelLabel, value: asset.model },
    { label: dict.assetDetail.serialLabel, value: asset.serial_number },
    { label: dict.assetDetail.purchaseDateLabel, value: asset.purchase_date },
    { label: dict.assetDetail.warrantyLabel, value: asset.warranty_expires },
  ].filter((d) => d.value);

  return (
    <div className="space-y-8">
      {created && <SuccessBanner message={dict.assets.createdBanner} />}
      {updated && <SuccessBanner message={dict.assetDetail.updatedBanner} />}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className={pageHeading}>{asset.name}</h1>
          {asset.warranty_expires && <WarrantyBadge warrantyExpires={asset.warranty_expires} locale={profile.locale} />}
        </div>
        {profile.role === "owner" && (
          <div className="flex gap-2">
            <Link href={`/assets/${asset.id}/edit`} className={buttonUtility}>
              <Pencil className="size-3.5" /> {dict.assetDetail.edit}
            </Link>
            <form action={deleteAsset.bind(null, asset.id)}>
              <ConfirmSubmitButton
                confirmMessage={format(dict.assetDetail.deleteConfirm, { name: asset.name })}
                className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-hairline bg-surface px-3 py-1.5 text-sm font-medium text-status-overdue-fg transition-colors hover:bg-status-overdue-bg"
              >
                <Trash2 className="size-3.5" /> {dict.assetDetail.delete}
              </ConfirmSubmitButton>
            </form>
          </div>
        )}
      </div>

      {details.length > 0 && (
        <div className={`grid grid-cols-2 gap-x-8 gap-y-2 p-4 text-sm ${card}`}>
          {details.map((d) => (
            <span key={d.label}>
              <span className={mutedText}>{d.label}:</span> {d.value}
            </span>
          ))}
        </div>
      )}

      {preferredVendor && (
        <Link
          href={`/vendors/${preferredVendor.id}`}
          className={`flex items-center gap-3 p-4 text-sm transition-colors hover:bg-surface-hover ${card}`}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
            <Building2 className="size-4" strokeWidth={2} />
          </span>
          <div className="min-w-0 flex-1">
            <p className={mutedText}>{dict.assetDetail.preferredVendorLabel}</p>
            <p className="font-medium text-ink">{preferredVendor.name}</p>
          </div>
        </Link>
      )}

      {asset.notes && (
        <div className="space-y-2">
          <h2 className={sectionHeading}>{dict.assetDetail.notesTitle}</h2>
          <p className={`p-4 text-sm text-ink-secondary ${card}`}>{asset.notes}</p>
        </div>
      )}

      <section className="space-y-2">
        <h2 className={sectionHeading}>{dict.assetDetail.photosTitle}</h2>
        <AssetAttachments assetId={asset.id} attachments={attachments} dict={dict} />
      </section>

      <section className="space-y-2">
        <h2 className={sectionHeading}>
          <span className="inline-flex items-center gap-1.5">
            <CalendarClock className="size-3.5" /> {dict.assetDetail.upcomingTitle}
          </span>
        </h2>
        {upcoming.length > 0 ? (
          <ul className={listCard}>
            {upcoming.map((wo) => (
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
                      {wo.due_date ? format(dict.assetDetail.dueDate, { date: wo.due_date }) : dict.assetDetail.noDueDate}
                      {wo.recurrence_interval_value &&
                        ` · ${format(dict.assetDetail.recurrence, {
                          value: wo.recurrence_interval_value,
                          unit: unitLabels[wo.recurrence_interval_unit ?? ""] ?? wo.recurrence_interval_unit ?? "",
                        })}`}
                    </p>
                  </div>
                  <StatusBadge status={wo.status} locale={profile.locale} />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={CalendarClock} message={dict.assetDetail.emptyUpcoming} />
        )}
      </section>

      <section className="space-y-2">
        <h2 className={sectionHeading}>
          <span className="inline-flex items-center gap-1.5">
            <History className="size-3.5" /> {dict.assetDetail.historyTitle}
          </span>
        </h2>
        {history.length > 0 ? (
          <ul className={listCard}>
            {history.map((wo) => (
              <li key={wo.id}>
                <Link href={`/work-orders/${wo.id}`} className={listRow}>
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-canvas-soft text-ink-muted">
                    <ClipboardList className="size-4" strokeWidth={2} />
                  </span>
                  <div className="min-w-40 flex-1">
                    <p className="truncate font-medium text-ink">{wo.title}</p>
                    <p className={mutedText}>
                      {wo.completed_at ? new Date(wo.completed_at).toLocaleDateString(profile.locale) : "—"}
                    </p>
                  </div>
                  <StatusBadge status={wo.status} locale={profile.locale} />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={History} message={dict.assetDetail.emptyHistory} />
        )}
      </section>
    </div>
  );
}

function single<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}
