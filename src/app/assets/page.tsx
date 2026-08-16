import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonPrimary, listCard, mutedText, pageHeading } from "@/lib/ui";

export default async function AssetsPage() {
  const profile = await requireUser();
  const supabase = await createClient();

  const { data: assets } = await supabase
    .from("assets")
    .select("id, name, category, location")
    .order("name");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className={pageHeading}>Activos</h1>
        {profile.role === "owner" && (
          <Link href="/assets/new" className={buttonPrimary}>
            + Nuevo activo
          </Link>
        )}
      </div>

      {assets && assets.length > 0 ? (
        <ul className={listCard}>
          {assets.map((asset) => (
            <li key={asset.id} className="px-4 py-3.5">
              <p className="font-medium text-zinc-900 dark:text-zinc-50">{asset.name}</p>
              <p className={mutedText}>
                {[asset.category, asset.location].filter(Boolean).join(" · ") || "Sin categoría"}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon="🧰" message="No hay activos registrados." />
      )}
    </div>
  );
}
