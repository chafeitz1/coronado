import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { TagInput } from "@/components/ui/tag-input";
import { VendorContactsField, type VendorContactValue } from "@/components/vendor-contacts-field";
import { buttonPrimary, buttonSecondary, input, label as labelClass } from "@/lib/ui";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { VendorTrade } from "@/lib/types/database";

export function VendorForm({
  action,
  submitLabel,
  dict,
  existingTrades,
  defaultValues,
  error,
  onCancel,
}: {
  action: (formData: FormData) => void;
  submitLabel: string;
  dict: Dictionary;
  existingTrades: VendorTrade[];
  defaultValues?: {
    name: string;
    trades: VendorTrade[];
    notes: string | null;
    is_emergency: boolean;
    contacts: VendorContactValue[];
  };
  error?: string;
  onCancel?: () => void;
}) {
  return (
    <form action={action} className="space-y-4">
      <Field label={dict.vendorForm.nameLabel}>
        <input name="name" required defaultValue={defaultValues?.name} className={input} />
      </Field>

      <div className="space-y-1.5">
        <label className={labelClass}>{dict.vendorForm.specialtiesLabel}</label>
        <TagInput
          name="trades"
          defaultValue={defaultValues?.trades}
          suggestions={existingTrades}
          placeholder={dict.vendorForm.specialtiesPlaceholder}
        />
      </div>

      <VendorContactsField defaultValue={defaultValues?.contacts} dict={dict} />

      <Field label={dict.vendorForm.notesLabel}>
        <textarea name="notes" rows={3} defaultValue={defaultValues?.notes ?? ""} className={input} />
      </Field>

      <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-secondary">
        <input
          type="checkbox"
          name="is_emergency"
          defaultChecked={defaultValues?.is_emergency}
          className="size-4 rounded border-hairline accent-status-overdue-fg"
        />
        {dict.vendorForm.emergencyLabel}
      </label>

      {error && <p className="text-sm text-status-overdue-fg">{error}</p>}

      <div className="flex gap-2 pt-1">
        <SubmitButton className={`flex-1 ${buttonPrimary}`} pendingLabel={dict.vendorForm.submitPending}>
          {submitLabel}
        </SubmitButton>
        {onCancel && (
          <button type="button" onClick={onCancel} className={buttonSecondary}>
            {dict.vendorForm.cancel}
          </button>
        )}
      </div>
    </form>
  );
}
