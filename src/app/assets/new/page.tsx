import { createAsset } from "@/app/actions/assets";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { buttonPrimary, card, input, pageHeading } from "@/lib/ui";

export default function NewAssetPage() {
  return (
    <div className="max-w-lg space-y-6">
      <h1 className={pageHeading}>Nuevo activo</h1>

      <form action={createAsset} className={`space-y-4 p-5 ${card}`}>
        <Field label="Nombre">
          <input name="name" required className={input} />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Categoría">
            <input name="category" placeholder="A/C, plomería, cocina..." className={input} />
          </Field>
          <Field label="Ubicación">
            <input name="location" placeholder="Cocina, techo, garaje..." className={input} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Fecha de compra">
            <input type="date" name="purchase_date" className={input} />
          </Field>
          <Field label="Garantía vence">
            <input type="date" name="warranty_expires" className={input} />
          </Field>
        </div>

        <Field label="Notas">
          <textarea name="notes" rows={3} className={input} />
        </Field>

        <SubmitButton className={buttonPrimary} pendingLabel="Guardando...">
          Guardar
        </SubmitButton>
      </form>
    </div>
  );
}
