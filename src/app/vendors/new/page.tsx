import { createVendor } from "@/app/actions/vendors";
import { VendorForm } from "@/components/vendor-form";
import { pageHeading } from "@/lib/ui";

export default function NewVendorPage() {
  return (
    <div className="max-w-lg space-y-6">
      <h1 className={pageHeading}>Nuevo proveedor</h1>
      <VendorForm action={createVendor} submitLabel="Guardar" />
    </div>
  );
}
