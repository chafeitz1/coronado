import Link from "next/link";
import { Plus, Wrench } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonPrimary, listCard, listRow, mutedText, pageHeading } from "@/lib/ui";

export default async function AssetsPage() {
  const profile = await requireUser();
  const supabase = await createClient();

  const { data: assets } = await supabase
    .from("assets")
    .select("id, name, category, location")
    .order("name");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className={pageHeading}>Activos</h1>
        {profile.role === "owner" && (
          <Link href="/assets/new" className={buttonPrimary}>
            <Plus className="size-4" /> Nuevo activo
          </Link>
        )}
      </div>

      {assets && assets.length > 0 ? (
        <ul className={listCard}>
          {assets.map((asset) => (
            <li key={asset.id} className={listRow}>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <Wrench className="size-4" strokeWidth={2} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-ink">{asset.name}</p>
                <p className={mutedText}>
                  {[asset.category, asset.location].filter(Boolean).join(" · ") || "Sin categoría"}
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={Wrench} message="No hay activos registrados." />
      )}
    </div>
  );
}
