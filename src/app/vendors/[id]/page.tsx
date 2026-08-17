import Link from "next/link";
import { notFound } from "next/navigation";
import { Phone, Mail, Pencil, Trash2, ClipboardList } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { deleteVendor } from "@/app/actions/vendors";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { SuccessBanner } from "@/components/ui/success-banner";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";
import { telHref, whatsAppHref } from "@/lib/phone";
import { getTradeLabels } from "@/lib/vendor-trades";
import { getDictionary, format } from "@/lib/i18n/dictionaries";
import type { VendorTrade } from "@/lib/types/database";
import { buttonSecondary, buttonUtility, card, listCard, listRow, mutedText, pageHeading, sectionHeading } from "@/lib/ui";

export default async function VendorDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ updated?: string }>;
}) {
  const { id } = await params;
  const { updated } = await searchParams;
  const profile = await requireUser();
  const dict = getDictionary(profile.locale);
  const tradeLabels = getTradeLabels(profile.locale);
  const supabase = await createClient();

  const { data: vendor } = await supabase.from("vendors").select("*").eq("id", id).single();
  if (!vendor) notFound();

  const { data: workOrders } = await supabase
    .from("work_orders")
    .select("id, title, status, created_at")
    .eq("vendor_id", id)
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-2xl space-y-8">
      {updated && <SuccessBanner message={dict.vendorDetail.updatedBanner} />}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className={pageHeading}>{vendor.name}</h1>
          {vendor.contact_name && (
            <p className={mutedText}>{format(dict.vendorDetail.contact, { name: vendor.contact_name })}</p>
          )}
          {vendor.trades?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {(vendor.trades as VendorTrade[]).map((trade) => (
                <span
                  key={trade}
                  className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-medium text-primary"
                >
                  {tradeLabels[trade]}
                </span>
              ))}
            </div>
          )}
        </div>
        {profile.role === "owner" && (
          <div className="flex gap-2">
            <Link href={`/vendors/${vendor.id}/edit`} className={buttonUtility}>
              <Pencil className="size-3.5" /> {dict.vendorDetail.edit}
            </Link>
            <form action={deleteVendor.bind(null, vendor.id)}>
              <ConfirmSubmitButton
                confirmMessage={format(dict.vendorDetail.deleteConfirm, { name: vendor.name })}
                className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-hairline bg-surface px-3 py-1.5 text-sm font-medium text-status-overdue-fg transition-colors hover:bg-status-overdue-bg"
              >
                <Trash2 className="size-3.5" /> {dict.vendorDetail.delete}
              </ConfirmSubmitButton>
            </form>
          </div>
        )}
      </div>

      {(vendor.phone || vendor.email) && (
        <div className="flex flex-wrap gap-2">
          {vendor.phone && (
            <a href={telHref(vendor.phone)} className={buttonSecondary}>
              <Phone className="size-4" /> {dict.vendorDetail.call}
            </a>
          )}
          {vendor.phone && (
            <a
              href={whatsAppHref(vendor.phone)}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonSecondary}
            >
              <WhatsAppIcon className="size-4 text-[#25D366]" /> {dict.vendorDetail.whatsapp}
            </a>
          )}
          {vendor.email && (
            <a href={`mailto:${vendor.email}`} className={buttonSecondary}>
              <Mail className="size-4" /> {dict.vendorDetail.email}
            </a>
          )}
        </div>
      )}

      <div className={`flex flex-wrap gap-x-8 gap-y-2 p-4 text-sm ${card}`}>
        {vendor.phone && (
          <span>
            <span className={mutedText}>{dict.vendorDetail.phoneLabel}:</span> {vendor.phone}
          </span>
        )}
        {vendor.email && (
          <span>
            <span className={mutedText}>{dict.vendorDetail.emailLabel}:</span> {vendor.email}
          </span>
        )}
      </div>

      {vendor.notes && (
        <div className="space-y-2">
          <h2 className={sectionHeading}>{dict.vendorDetail.notesTitle}</h2>
          <p className={`p-4 text-sm text-ink-secondary ${card}`}>{vendor.notes}</p>
        </div>
      )}

      <section className="space-y-2">
        <h2 className={sectionHeading}>{dict.vendorDetail.historyTitle}</h2>
        {workOrders && workOrders.length > 0 ? (
          <ul className={listCard}>
            {workOrders.map((wo) => (
              <li key={wo.id}>
                <Link href={`/work-orders/${wo.id}`} className={listRow}>
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                    <ClipboardList className="size-4" strokeWidth={2} />
                  </span>
                  <div className="min-w-40 flex-1">
                    <p className="truncate font-medium text-ink">{wo.title}</p>
                    <p className={mutedText}>{new Date(wo.created_at).toLocaleDateString(profile.locale)}</p>
                  </div>
                  <StatusBadge status={wo.status} locale={profile.locale} />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={ClipboardList} message={dict.vendorDetail.emptyHistory} />
        )}
      </section>
    </div>
  );
}
