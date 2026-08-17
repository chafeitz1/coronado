import Link from "next/link";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SuccessBanner } from "@/components/ui/success-banner";
import { VendorList } from "@/components/vendor-list";
import { buttonPrimary, pageHeading } from "@/lib/ui";

export default async function VendorsPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; deleted?: string }>;
}) {
  const profile = await requireUser();
  const supabase = await createClient();
  const { created, deleted } = await searchParams;

  const { data: vendors } = await supabase
    .from("vendors")
    .select("id, name, trades, phone, email")
    .order("name");

  return (
    <div className="space-y-6">
      {created && <SuccessBanner message="Proveedor guardado." />}
      {deleted && <SuccessBanner message="Proveedor borrado." />}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className={pageHeading}>Proveedores</h1>
        {profile.role === "owner" && (
          <Link href="/vendors/new" className={buttonPrimary}>
            <Plus className="size-4" /> Nuevo proveedor
          </Link>
        )}
      </div>

      <VendorList vendors={vendors ?? []} />
    </div>
  );
}
