import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { buttonPrimary, card, input, label as labelClass } from "@/lib/ui";
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
    contact_name: string | null;
    trades: VendorTrade[];
    phone: string | null;
    email: string | null;
    notes: string | null;
  };
}) {
  return (
    <form action={action} className={`space-y-4 p-5 ${card}`}>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Nombre (empresa o persona)">
          <input name="name" required defaultValue={defaultValues?.name} className={input} />
        </Field>
        <Field label="Persona de contacto (opcional)">
          <input
            name="contact_name"
            placeholder="A quién preguntar"
            defaultValue={defaultValues?.contact_name ?? ""}
            className={input}
          />
        </Field>
      </div>

      <div className="space-y-1.5">
        <label className={labelClass}>Especialidades (puedes elegir varias)</label>
        <div className="flex flex-wrap gap-2">
          {TRADE_OPTIONS.map((opt) => (
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

      <SubmitButton className={buttonPrimary} pendingLabel="Guardando...">
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
