import { notFound } from "next/navigation";
import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { updateVendor } from "@/app/actions/vendors";
import { VendorForm } from "@/components/vendor-form";
import { pageHeading } from "@/lib/ui";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default async function EditVendorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireOwner();
  const dict = getDictionary(profile.locale);
  const supabase = await createClient();

  const { data: vendor } = await supabase.from("vendors").select("*").eq("id", id).single();
  if (!vendor) notFound();

  return (
    <div className="max-w-lg space-y-6">
      <h1 className={pageHeading}>{dict.vendorForm.editTitle}</h1>
      <VendorForm
        action={updateVendor.bind(null, vendor.id)}
        submitLabel={dict.vendorForm.submitEdit}
        dict={dict}
        locale={profile.locale}
        defaultValues={vendor}
      />
    </div>
  );
}
