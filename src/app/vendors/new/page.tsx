import { createVendor } from "@/app/actions/vendors";
import { requireUser } from "@/lib/auth";
import { VendorForm } from "@/components/vendor-form";
import { pageHeading } from "@/lib/ui";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default async function NewVendorPage() {
  const profile = await requireUser();
  const dict = getDictionary(profile.locale);

  return (
    <div className="max-w-lg space-y-6">
      <h1 className={pageHeading}>{dict.vendorForm.title}</h1>
      <VendorForm action={createVendor} submitLabel={dict.vendorForm.submit} dict={dict} locale={profile.locale} />
    </div>
  );
}
