import { notFound } from "next/navigation";
import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { updateVendor } from "@/app/actions/vendors";
import { VendorForm } from "@/components/vendor-form";
import { pageHeading } from "@/lib/ui";

export default async function EditVendorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireOwner();
  const supabase = await createClient();

  const { data: vendor } = await supabase.from("vendors").select("*").eq("id", id).single();
  if (!vendor) notFound();

  return (
    <div className="max-w-lg space-y-6">
      <h1 className={pageHeading}>Editar proveedor</h1>
      <VendorForm action={updateVendor.bind(null, vendor.id)} submitLabel="Guardar cambios" defaultValues={vendor} />
    </div>
  );
}
