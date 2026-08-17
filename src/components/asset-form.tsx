import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { buttonPrimary, card, input, label as labelClass } from "@/lib/ui";

export function AssetForm({
  action,
  submitLabel,
  vendors,
  defaultValues,
}: {
  action: (formData: FormData) => void;
  submitLabel: string;
  vendors: { id: string; name: string }[];
  defaultValues?: {
    name: string;
    category: string | null;
    location: string | null;
    brand: string | null;
    model: string | null;
    serial_number: string | null;
    preferred_vendor_id: string | null;
    purchase_date: string | null;
    warranty_expires: string | null;
    notes: string | null;
  };
}) {
  return (
    <form action={action} className={`space-y-4 p-5 ${card}`}>
      <Field label="Nombre">
        <input name="name" required defaultValue={defaultValues?.name} className={input} />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Categoría">
          <input
            name="category"
            placeholder="A/C, plomería, cocina..."
            defaultValue={defaultValues?.category ?? ""}
            className={input}
          />
        </Field>
        <Field label="Ubicación">
          <input
            name="location"
            placeholder="Cocina, techo, garaje..."
            defaultValue={defaultValues?.location ?? ""}
            className={input}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Marca">
          <input name="brand" defaultValue={defaultValues?.brand ?? ""} className={input} />
        </Field>
        <Field label="Modelo">
          <input name="model" defaultValue={defaultValues?.model ?? ""} className={input} />
        </Field>
      </div>

      <Field label="Número de serie">
        <input name="serial_number" defaultValue={defaultValues?.serial_number ?? ""} className={input} />
      </Field>

      <div className="space-y-1.5">
        <label className={labelClass}>Proveedor preferido</label>
        <select
          name="preferred_vendor_id"
          defaultValue={defaultValues?.preferred_vendor_id ?? ""}
          className={input}
        >
          <option value="">Ninguno</option>
          {vendors.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Fecha de compra">
          <input
            type="date"
            name="purchase_date"
            defaultValue={defaultValues?.purchase_date ?? ""}
            className={input}
          />
        </Field>
        <Field label="Garantía vence">
          <input
            type="date"
            name="warranty_expires"
            defaultValue={defaultValues?.warranty_expires ?? ""}
            className={input}
          />
        </Field>
      </div>

      <Field label="Notas">
        <textarea name="notes" rows={3} defaultValue={defaultValues?.notes ?? ""} className={input} />
      </Field>

      <SubmitButton className={buttonPrimary} pendingLabel="Guardando...">
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
