import Link from "next/link";
import { notFound } from "next/navigation";
import { Phone, Mail, Pencil, Trash2, ClipboardList } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { deleteVendor } from "@/app/actions/vendors";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";
import { telHref, whatsAppHref } from "@/lib/phone";
import { TRADE_LABELS } from "@/lib/vendor-trades";
import type { VendorTrade } from "@/lib/types/database";
import { buttonSecondary, buttonUtility, card, listCard, listRow, mutedText, pageHeading, sectionHeading } from "@/lib/ui";

export default async function VendorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireUser();
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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className={pageHeading}>{vendor.name}</h1>
          {vendor.trade && <p className={mutedText}>{TRADE_LABELS[vendor.trade as VendorTrade]}</p>}
        </div>
        {profile.role === "owner" && (
          <div className="flex gap-2">
            <Link href={`/vendors/${vendor.id}/edit`} className={buttonUtility}>
              <Pencil className="size-3.5" /> Editar
            </Link>
            <form action={deleteVendor.bind(null, vendor.id)}>
              <ConfirmSubmitButton
                confirmMessage={`¿Borrar a ${vendor.name} del directorio?`}
                className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-hairline bg-surface px-3 py-1.5 text-sm font-medium text-status-overdue-fg transition-colors hover:bg-status-overdue-bg"
              >
                <Trash2 className="size-3.5" /> Borrar
              </ConfirmSubmitButton>
            </form>
          </div>
        )}
      </div>

      {(vendor.phone || vendor.email) && (
        <div className="flex flex-wrap gap-2">
          {vendor.phone && (
            <a href={telHref(vendor.phone)} className={buttonSecondary}>
              <Phone className="size-4" /> Llamar
            </a>
          )}
          {vendor.phone && (
            <a
              href={whatsAppHref(vendor.phone)}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonSecondary}
            >
              <WhatsAppIcon className="size-4 text-[#25D366]" /> WhatsApp
            </a>
          )}
          {vendor.email && (
            <a href={`mailto:${vendor.email}`} className={buttonSecondary}>
              <Mail className="size-4" /> Email
            </a>
          )}
        </div>
      )}

      <div className={`flex flex-wrap gap-x-8 gap-y-2 p-4 text-sm ${card}`}>
        {vendor.phone && (
          <span>
            <span className={mutedText}>Teléfono:</span> {vendor.phone}
          </span>
        )}
        {vendor.email && (
          <span>
            <span className={mutedText}>Email:</span> {vendor.email}
          </span>
        )}
      </div>

      {vendor.notes && (
        <div className="space-y-2">
          <h2 className={sectionHeading}>Notas</h2>
          <p className={`p-4 text-sm text-ink-secondary ${card}`}>{vendor.notes}</p>
        </div>
      )}

      <section className="space-y-2">
        <h2 className={sectionHeading}>Historial de tareas</h2>
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
                    <p className={mutedText}>{new Date(wo.created_at).toLocaleDateString("es")}</p>
                  </div>
                  <StatusBadge status={wo.status} />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={ClipboardList} message="Todavía no se le ha asignado ninguna tarea." />
        )}
      </section>
    </div>
  );
}
