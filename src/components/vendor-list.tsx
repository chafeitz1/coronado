"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Building2, Phone, Mail } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";
import { telHref, whatsAppHref } from "@/lib/phone";
import { TRADE_LABELS } from "@/lib/vendor-trades";
import { input, listCard, mutedText } from "@/lib/ui";
import type { VendorTrade } from "@/lib/types/database";

type VendorRow = {
  id: string;
  name: string;
  contact_name: string | null;
  trades: VendorTrade[];
  phone: string | null;
  email: string | null;
};

export function VendorList({ vendors }: { vendors: VendorRow[] }) {
  const [search, setSearch] = useState("");
  const [activeTrade, setActiveTrade] = useState<VendorTrade | null>(null);

  const tradeCounts = useMemo(() => {
    const counts = new Map<VendorTrade, number>();
    for (const v of vendors) {
      for (const t of v.trades) counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => TRADE_LABELS[a[0]].localeCompare(TRADE_LABELS[b[0]]));
  }, [vendors]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return vendors.filter((v) => {
      if (activeTrade && !v.trades.includes(activeTrade)) return false;
      if (q && !v.name.toLowerCase().includes(q) && !v.contact_name?.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [vendors, search, activeTrade]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o contacto..."
          className={`${input} pl-9`}
        />
      </div>

      {tradeCounts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <FilterChip label="Todos" active={!activeTrade} onClick={() => setActiveTrade(null)} />
          {tradeCounts.map(([trade, count]) => (
            <FilterChip
              key={trade}
              label={`${TRADE_LABELS[trade]} · ${count}`}
              active={activeTrade === trade}
              onClick={() => setActiveTrade(activeTrade === trade ? null : trade)}
            />
          ))}
        </div>
      )}

      {filtered.length > 0 ? (
        <ul className={listCard}>
          {filtered.map((vendor) => (
            <li key={vendor.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <Building2 className="size-4" strokeWidth={2} />
              </span>
              <Link href={`/vendors/${vendor.id}`} className="min-w-40 flex-1 hover:underline">
                <p className="truncate font-medium text-ink">{vendor.name}</p>
                <p className={`${mutedText} truncate`}>
                  {vendor.contact_name ? `${vendor.contact_name} · ` : ""}
                  {vendor.trades.length > 0
                    ? vendor.trades.map((t) => TRADE_LABELS[t]).join(", ")
                    : "Sin especialidad"}
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
          message={
            search || activeTrade ? "Ningún proveedor coincide con la búsqueda." : "No hay proveedores registrados."
          }
        />
      )}
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "border-primary bg-primary-soft text-primary"
          : "border-hairline bg-surface text-ink-muted hover:bg-surface-hover"
      }`}
    >
      {label}
    </button>
  );
}
