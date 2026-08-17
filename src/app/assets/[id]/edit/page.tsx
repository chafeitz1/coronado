import { notFound } from "next/navigation";
import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { updateAsset } from "@/app/actions/assets";
import { AssetForm } from "@/components/asset-form";
import { pageHeading } from "@/lib/ui";

export default async function EditAssetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireOwner();
  const supabase = await createClient();

  const [{ data: asset }, { data: vendors }] = await Promise.all([
    supabase.from("assets").select("*").eq("id", id).single(),
    supabase.from("vendors").select("id, name").order("name"),
  ]);
  if (!asset) notFound();

  return (
    <div className="max-w-lg space-y-6">
      <h1 className={pageHeading}>Editar activo</h1>
      <AssetForm
        action={updateAsset.bind(null, asset.id)}
        submitLabel="Guardar cambios"
        vendors={vendors ?? []}
        defaultValues={asset}
      />
    </div>
  );
}
