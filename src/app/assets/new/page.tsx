import { createAsset } from "@/app/actions/assets";
import { createClient } from "@/lib/supabase/server";
import { AssetForm } from "@/components/asset-form";
import { pageHeading } from "@/lib/ui";

export default async function NewAssetPage() {
  const supabase = await createClient();
  const { data: vendors } = await supabase.from("vendors").select("id, name").order("name");

  return (
    <div className="max-w-lg space-y-6">
      <h1 className={pageHeading}>Nuevo activo</h1>
      <AssetForm action={createAsset} submitLabel="Guardar" vendors={vendors ?? []} />
    </div>
  );
}
