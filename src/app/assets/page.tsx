import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function AssetsPage() {
  const profile = await requireUser();
  const supabase = await createClient();

  const { data: assets } = await supabase
    .from("assets")
    .select("id, name, category, location")
    .order("name");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Activos</h1>
        {profile.role === "owner" && (
          <Link
            href="/assets/new"
            className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
          >
            + Nuevo activo
          </Link>
        )}
      </div>

      <ul className="divide-y divide-black/10 rounded-lg border border-black/10 dark:divide-white/10 dark:border-white/10">
        {assets?.map((asset) => (
          <li key={asset.id} className="px-4 py-3">
            <p className="font-medium">{asset.name}</p>
            <p className="text-xs text-black/60 dark:text-white/60">
              {[asset.category, asset.location].filter(Boolean).join(" · ") || "—"}
            </p>
          </li>
        ))}
        {(!assets || assets.length === 0) && (
          <li className="px-4 py-3 text-sm text-black/50 dark:text-white/50">
            No hay activos registrados.
          </li>
        )}
      </ul>
    </div>
  );
}
