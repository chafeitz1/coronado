import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { buttonPrimary, buttonSecondary, input, label as labelClass } from "@/lib/ui";
import { getTradeOptions } from "@/lib/vendor-trades";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Locale, VendorTrade } from "@/lib/types/database";

export function VendorForm({
  action,
  submitLabel,
  dict,
  locale,
  defaultValues,
  error,
  onCancel,
}: {
  action: (formData: FormData) => void;
  submitLabel: string;
  dict: Dictionary;
  locale: Locale;
  defaultValues?: {
    name: string;
    contact_name: string | null;
    trades: VendorTrade[];
    phone: string | null;
    email: string | null;
    notes: string | null;
    is_emergency: boolean;
  };
  error?: string;
  onCancel?: () => void;
}) {
  const tradeOptions = getTradeOptions(locale);

  return (
    <form action={action} className="space-y-4">
      <Field label={dict.vendorForm.nameLabel}>
        <input name="name" required defaultValue={defaultValues?.name} className={input} />
      </Field>
      <Field label={dict.vendorForm.contactNameLabel}>
        <input
          name="contact_name"
          placeholder={dict.vendorForm.contactNamePlaceholder}
          defaultValue={defaultValues?.contact_name ?? ""}
          className={input}
        />
      </Field>

      <div className="space-y-1.5">
        <label className={labelClass}>{dict.vendorForm.specialtiesLabel}</label>
        <div className="flex flex-wrap gap-2">
          {tradeOptions.map((opt) => (
            <label
              key={opt.value}
              className="flex cursor-pointer items-center gap-1.5 rounded-full border border-hairline bg-surface px-3 py-1.5 text-sm text-ink-secondary transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary-soft has-[:checked]:text-primary"
            >
              <input
                type="checkbox"
                name="trades"
                value={opt.value}
                defaultChecked={defaultValues?.trades.includes(opt.value)}
                className="sr-only"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      <Field label={dict.vendorForm.phoneLabel}>
        <input
          name="phone"
          placeholder={dict.vendorForm.phonePlaceholder}
          defaultValue={defaultValues?.phone ?? ""}
          className={input}
        />
      </Field>
      <Field label={dict.vendorForm.emailLabel}>
        <input
          type="email"
          name="email"
          placeholder={dict.vendorForm.emailPlaceholder}
          defaultValue={defaultValues?.email ?? ""}
          className={input}
        />
      </Field>

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
