import { notFound } from "next/navigation";
import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { updateAsset } from "@/app/actions/assets";
import { AssetForm } from "@/components/asset-form";
import { pageHeading } from "@/lib/ui";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default async function EditAssetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireOwner();
  const dict = getDictionary(profile.locale);
  const supabase = await createClient();

  const [{ data: asset }, { data: vendors }] = await Promise.all([
    supabase.from("assets").select("*").eq("id", id).single(),
    supabase.from("vendors").select("id, name").order("name"),
  ]);
  if (!asset) notFound();

  return (
    <div className="max-w-lg space-y-6">
      <h1 className={pageHeading}>{dict.assetDetail.editAsset}</h1>
      <AssetForm
        action={updateAsset.bind(null, asset.id)}
        submitLabel={dict.assetForm.submitEdit}
        vendors={vendors ?? []}
        dict={dict}
        defaultValues={asset}
      />
    </div>
  );
}
