import { createVendor } from "@/app/actions/vendors";
import { Field } from "@/components/ui/field";
import { buttonPrimary, card, input, pageHeading } from "@/lib/ui";

export default function NewVendorPage() {
  return (
    <div className="max-w-lg space-y-6">
      <h1 className={pageHeading}>Nuevo proveedor</h1>

      <form action={createVendor} className={`space-y-4 p-5 ${card}`}>
        <Field label="Nombre">
          <input name="name" required className={input} />
        </Field>

        <Field label="Especialidad">
          <input name="trade" placeholder="Plomero, electricista, jardinero..." className={input} />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Teléfono">
            <input name="phone" className={input} />
          </Field>
          <Field label="Email">
            <input type="email" name="email" className={input} />
          </Field>
        </div>

        <Field label="Notas">
          <textarea name="notes" rows={3} className={input} />
        </Field>

        <button type="submit" className={buttonPrimary}>
          Guardar
        </button>
      </form>
    </div>
  );
}
