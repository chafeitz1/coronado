import { createAsset } from "@/app/actions/assets";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AssetForm } from "@/components/asset-form";
import { pageHeading } from "@/lib/ui";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default async function NewAssetPage() {
  const profile = await requireUser();
  const dict = getDictionary(profile.locale);
  const supabase = await createClient();
  const { data: vendors } = await supabase.from("vendors").select("id, name").order("name");

  return (
    <div className="max-w-lg space-y-6">
      <h1 className={pageHeading}>{dict.assets.newAsset}</h1>
      <AssetForm action={createAsset} submitLabel={dict.assetForm.submit} vendors={vendors ?? []} dict={dict} />
    </div>
  );
}
