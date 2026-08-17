import Link from "next/link";
import { Plus, ShieldAlert, Wrench } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { WarrantyBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { SuccessBanner } from "@/components/ui/success-banner";
import { buttonPrimary, listCard, listRow, mutedText, pageHeading, sectionHeading } from "@/lib/ui";
import { daysUntil } from "@/lib/dates";

const WARRANTY_WARNING_DAYS = 60;

export default async function AssetsPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; deleted?: string }>;
}) {
  const profile = await requireUser();
  const supabase = await createClient();
  const { created, deleted } = await searchParams;

  const { data: assets } = await supabase
    .from("assets")
    .select("id, name, category, location, warranty_expires")
    .order("name");

  const all = assets ?? [];
  const warrantyAlerts = all
    .filter((a) => a.warranty_expires && daysUntil(a.warranty_expires) <= WARRANTY_WARNING_DAYS)
    .sort((a, b) => (a.warranty_expires ?? "").localeCompare(b.warranty_expires ?? ""));

  return (
    <div className="space-y-6">
      {created && <SuccessBanner message="Activo guardado." />}
      {deleted && <SuccessBanner message="Activo borrado." />}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className={pageHeading}>Activos</h1>
        {profile.role === "owner" && (
          <Link href="/assets/new" className={buttonPrimary}>
            <Plus className="size-4" /> Nuevo activo
          </Link>
        )}
      </div>

      {warrantyAlerts.length > 0 && (
        <section className="space-y-2">
          <h2 className={sectionHeading}>
            <span className="inline-flex items-center gap-1.5">
              <ShieldAlert className="size-3.5 text-status-overdue-fg" />
              Garantías por vencer <span className="text-ink-faint">· {warrantyAlerts.length}</span>
            </span>
          </h2>
          <ul className={listCard}>
            {warrantyAlerts.map((asset) => (
              <li key={asset.id}>
                <Link href={`/assets/${asset.id}`} className={listRow}>
                  <div className="min-w-40 flex-1">
                    <p className="truncate font-medium text-ink">{asset.name}</p>
                    <p className={mutedText}>{[asset.category, asset.location].filter(Boolean).join(" · ")}</p>
                  </div>
                  <WarrantyBadge warrantyExpires={asset.warranty_expires!} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-2">
        {warrantyAlerts.length > 0 && <h2 className={sectionHeading}>Todos los activos</h2>}
        {all.length > 0 ? (
          <ul className={listCard}>
            {all.map((asset) => (
              <li key={asset.id}>
                <Link href={`/assets/${asset.id}`} className={listRow}>
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                    <Wrench className="size-4" strokeWidth={2} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink">{asset.name}</p>
                    <p className={mutedText}>
                      {[asset.category, asset.location].filter(Boolean).join(" · ") || "Sin categoría"}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={Wrench} message="No hay activos registrados." />
        )}
      </section>
    </div>
  );
}
