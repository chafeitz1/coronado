import { Field } from "@/components/ui/field";
import { buttonPrimary, card, input } from "@/lib/ui";
import { TRADE_OPTIONS } from "@/lib/vendor-trades";
import type { VendorTrade } from "@/lib/types/database";

export function VendorForm({
  action,
  submitLabel,
  defaultValues,
}: {
  action: (formData: FormData) => void;
  submitLabel: string;
  defaultValues?: {
    name: string;
    trade: VendorTrade | null;
    phone: string | null;
    email: string | null;
    notes: string | null;
  };
}) {
  return (
    <form action={action} className={`space-y-4 p-5 ${card}`}>
      <Field label="Nombre">
        <input name="name" required defaultValue={defaultValues?.name} className={input} />
      </Field>

      <Field label="Especialidad">
        <select name="trade" defaultValue={defaultValues?.trade ?? ""} className={input}>
          <option value="">— Sin especificar —</option>
          {TRADE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Teléfono (opcional)">
          <input
            name="phone"
            placeholder="+507 6000-0000"
            defaultValue={defaultValues?.phone ?? ""}
            className={input}
          />
        </Field>
        <Field label="Email (opcional)">
          <input
            type="email"
            name="email"
            placeholder="Déjalo vacío si no tiene"
            defaultValue={defaultValues?.email ?? ""}
            className={input}
          />
        </Field>
      </div>

      <Field label="Notas">
        <textarea name="notes" rows={3} defaultValue={defaultValues?.notes ?? ""} className={input} />
      </Field>

      <button type="submit" className={buttonPrimary}>
        {submitLabel}
      </button>
    </form>
  );
}
