import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { buttonPrimary, buttonSecondary, input, label as labelClass } from "@/lib/ui";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export function AssetForm({
  action,
  submitLabel,
  vendors,
  dict,
  defaultValues,
  error,
  onCancel,
}: {
  action: (formData: FormData) => void;
  submitLabel: string;
  vendors: { id: string; name: string }[];
  dict: Dictionary;
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
  error?: string;
  onCancel?: () => void;
}) {
  return (
    <form action={action} className="space-y-4">
      <Field label={dict.assetForm.nameLabel}>
        <input name="name" required defaultValue={defaultValues?.name} className={input} />
      </Field>

      <Field label={dict.assetForm.photoLabel}>
        <input type="file" name="photo" accept="image/jpeg,image/png,image/webp" className={input} />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label={dict.assetForm.categoryLabel}>
          <input
            name="category"
            placeholder={dict.assetForm.categoryPlaceholder}
            defaultValue={defaultValues?.category ?? ""}
            className={input}
          />
        </Field>
        <Field label={dict.assetForm.locationLabel}>
          <input
            name="location"
            placeholder={dict.assetForm.locationPlaceholder}
            defaultValue={defaultValues?.location ?? ""}
            className={input}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label={dict.assetForm.brandLabel}>
          <input name="brand" defaultValue={defaultValues?.brand ?? ""} className={input} />
        </Field>
        <Field label={dict.assetForm.modelLabel}>
          <input name="model" defaultValue={defaultValues?.model ?? ""} className={input} />
        </Field>
      </div>

      <Field label={dict.assetForm.serialLabel}>
        <input name="serial_number" defaultValue={defaultValues?.serial_number ?? ""} className={input} />
      </Field>

      <div className="space-y-1.5">
        <label className={labelClass}>{dict.assetForm.preferredVendorLabel}</label>
        <select
          name="preferred_vendor_id"
          defaultValue={defaultValues?.preferred_vendor_id ?? ""}
          className={input}
        >
          <option value="">{dict.assetForm.noneVendorOption}</option>
          {vendors.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label={dict.assetForm.purchaseDateLabel}>
          <input
            type="date"
            name="purchase_date"
            defaultValue={defaultValues?.purchase_date ?? ""}
            className={input}
          />
        </Field>
        <Field label={dict.assetForm.warrantyLabel}>
          <input
            type="date"
            name="warranty_expires"
            defaultValue={defaultValues?.warranty_expires ?? ""}
            className={input}
          />
        </Field>
      </div>

      <Field label={dict.assetForm.notesLabel}>
        <textarea name="notes" rows={3} defaultValue={defaultValues?.notes ?? ""} className={input} />
      </Field>

      {error && <p className="text-sm text-status-overdue-fg">{error}</p>}

      <div className="flex gap-2 pt-1">
        <SubmitButton className={`flex-1 ${buttonPrimary}`} pendingLabel={dict.assetForm.submitPending}>
          {submitLabel}
        </SubmitButton>
        {onCancel && (
          <button type="button" onClick={onCancel} className={buttonSecondary}>
            {dict.assetForm.cancel}
          </button>
        )}
      </div>
    </form>
  );
}
