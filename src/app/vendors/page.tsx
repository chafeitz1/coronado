import Link from "next/link";
import { Plus, Building2, Phone, Mail } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/ui/empty-state";
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";
import { telHref, whatsAppHref } from "@/lib/phone";
import { TRADE_LABELS } from "@/lib/vendor-trades";
import { buttonPrimary, listCard, mutedText, pageHeading } from "@/lib/ui";
import type { VendorTrade } from "@/lib/types/database";

export default async function VendorsPage({
  searchParams,
}: {
  searchParams: Promise<{ trade?: string }>;
}) {
  const profile = await requireUser();
  const supabase = await createClient();
  const { trade: activeTrade } = await searchParams;

  const { data: allVendors } = await supabase
    .from("vendors")
    .select("id, name, trade, phone, email")
    .order("name");

  const tradeCounts = new Map<string, number>();
  for (const v of allVendors ?? []) {
    if (v.trade) tradeCounts.set(v.trade, (tradeCounts.get(v.trade) ?? 0) + 1);
  }

  const vendors = activeTrade ? (allVendors ?? []).filter((v) => v.trade === activeTrade) : allVendors;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className={pageHeading}>Proveedores</h1>
        {profile.role === "owner" && (
          <Link href="/vendors/new" className={buttonPrimary}>
            <Plus className="size-4" /> Nuevo proveedor
          </Link>
        )}
      </div>

      {tradeCounts.size > 0 && (
        <div className="flex flex-wrap gap-2">
          <FilterChip href="/vendors" label="Todos" active={!activeTrade} />
          {[...tradeCounts.entries()]
            .sort((a, b) => TRADE_LABELS[a[0] as VendorTrade].localeCompare(TRADE_LABELS[b[0] as VendorTrade]))
            .map(([trade, count]) => (
              <FilterChip
                key={trade}
                href={`/vendors?trade=${trade}`}
                label={`${TRADE_LABELS[trade as VendorTrade]} · ${count}`}
                active={activeTrade === trade}
              />
            ))}
        </div>
      )}

      {vendors && vendors.length > 0 ? (
        <ul className={listCard}>
          {vendors.map((vendor) => (
            <li key={vendor.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <Building2 className="size-4" strokeWidth={2} />
              </span>
              <Link href={`/vendors/${vendor.id}`} className="min-w-40 flex-1 hover:underline">
                <p className="truncate font-medium text-ink">{vendor.name}</p>
                <p className={mutedText}>
                  {vendor.trade ? TRADE_LABELS[vendor.trade as VendorTrade] : "Sin especialidad"}
                </p>
              </Link>
              <div className="flex shrink-0 items-center gap-1">
                {vendor.phone && (
                  <>
                    <a
                      href={telHref(vendor.phone)}
                      aria-label={`Llamar a ${vendor.name}`}
                      className="flex size-8 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-hover hover:text-primary"
                    >
                      <Phone className="size-4" />
                    </a>
                    <a
                      href={whatsAppHref(vendor.phone)}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`WhatsApp a ${vendor.name}`}
                      className="flex size-8 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-hover hover:text-[#25D366]"
                    >
                      <WhatsAppIcon className="size-4" />
                    </a>
                  </>
                )}
                {vendor.email && (
                  <a
                    href={`mailto:${vendor.email}`}
                    aria-label={`Email a ${vendor.name}`}
                    className="flex size-8 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-hover hover:text-primary"
                  >
                    <Mail className="size-4" />
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={Building2}
          message={activeTrade ? "No hay proveedores con esta especialidad." : "No hay proveedores registrados."}
        />
      )}
    </div>
  );
}

function FilterChip({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "border-primary bg-primary-soft text-primary"
          : "border-hairline bg-surface text-ink-muted hover:bg-surface-hover"
      }`}
    >
      {label}
    </Link>
  );
}
