import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function VendorsPage() {
  const profile = await requireUser();
  const supabase = await createClient();

  const { data: vendors } = await supabase
    .from("vendors")
    .select("id, name, trade, phone, email")
    .order("name");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Proveedores</h1>
        {profile.role === "owner" && (
          <Link
            href="/vendors/new"
            className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
          >
            + Nuevo proveedor
          </Link>
        )}
      </div>

      <ul className="divide-y divide-black/10 rounded-lg border border-black/10 dark:divide-white/10 dark:border-white/10">
        {vendors?.map((vendor) => (
          <li key={vendor.id} className="px-4 py-3">
            <p className="font-medium">{vendor.name}</p>
            <p className="text-xs text-black/60 dark:text-white/60">
              {[vendor.trade, vendor.phone, vendor.email].filter(Boolean).join(" · ") || "—"}
            </p>
          </li>
        ))}
        {(!vendors || vendors.length === 0) && (
          <li className="px-4 py-3 text-sm text-black/50 dark:text-white/50">
            No hay proveedores registrados.
          </li>
        )}
      </ul>
    </div>
  );
}
