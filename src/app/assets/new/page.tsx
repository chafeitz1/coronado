import { createAsset } from "@/app/actions/assets";

export default function NewAssetPage() {
  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-xl font-semibold">Nuevo activo</h1>

      <form action={createAsset} className="space-y-4">
        <Field label="Nombre">
          <input
            name="name"
            required
            className="w-full rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/15 dark:bg-black/20"
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Categoría">
            <input
              name="category"
              placeholder="A/C, plomería, cocina..."
              className="w-full rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/15 dark:bg-black/20"
            />
          </Field>
          <Field label="Ubicación">
            <input
              name="location"
              placeholder="Cocina, techo, garaje..."
              className="w-full rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/15 dark:bg-black/20"
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Fecha de compra">
            <input
              type="date"
              name="purchase_date"
              className="w-full rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/15 dark:bg-black/20"
            />
          </Field>
          <Field label="Garantía vence">
            <input
              type="date"
              name="warranty_expires"
              className="w-full rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/15 dark:bg-black/20"
            />
          </Field>
        </div>

        <Field label="Notas">
          <textarea
            name="notes"
            rows={3}
            className="w-full rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/15 dark:bg-black/20"
          />
        </Field>

        <button
          type="submit"
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
        >
          Guardar
        </button>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}
