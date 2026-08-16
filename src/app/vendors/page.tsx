import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonPrimary, listCard, mutedText, pageHeading } from "@/lib/ui";

export default async function VendorsPage() {
  const profile = await requireUser();
  const supabase = await createClient();

  const { data: vendors } = await supabase
    .from("vendors")
    .select("id, name, trade, phone, email")
    .order("name");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className={pageHeading}>Proveedores</h1>
        {profile.role === "owner" && (
          <Link href="/vendors/new" className={buttonPrimary}>
            + Nuevo proveedor
          </Link>
        )}
      </div>

      {vendors && vendors.length > 0 ? (
        <ul className={listCard}>
          {vendors.map((vendor) => (
            <li key={vendor.id} className="px-4 py-3.5">
              <p className="font-medium text-zinc-900 dark:text-zinc-50">{vendor.name}</p>
              <p className={mutedText}>
                {[vendor.trade, vendor.phone, vendor.email].filter(Boolean).join(" · ") || "Sin datos de contacto"}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon="🛠️" message="No hay proveedores registrados." />
      )}
    </div>
  );
}
