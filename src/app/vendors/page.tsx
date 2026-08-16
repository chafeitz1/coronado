import Link from "next/link";
import { Plus, Building2 } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonPrimary, listCard, listRow, mutedText, pageHeading } from "@/lib/ui";

export default async function VendorsPage() {
  const profile = await requireUser();
  const supabase = await createClient();

  const { data: vendors } = await supabase
    .from("vendors")
    .select("id, name, trade, phone, email")
    .order("name");

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

      {vendors && vendors.length > 0 ? (
        <ul className={listCard}>
          {vendors.map((vendor) => (
            <li key={vendor.id} className={listRow}>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <Building2 className="size-4" strokeWidth={2} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-ink">{vendor.name}</p>
                <p className={mutedText}>
                  {[vendor.trade, vendor.phone, vendor.email].filter(Boolean).join(" · ") || "Sin datos de contacto"}
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={Building2} message="No hay proveedores registrados." />
      )}
    </div>
  );
}
