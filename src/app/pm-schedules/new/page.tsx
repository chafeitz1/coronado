import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createPmSchedule } from "@/app/actions/pm-schedules";

export default async function NewPmSchedulePage() {
  await requireOwner();
  const supabase = await createClient();

  const [{ data: assets }, { data: staff }] = await Promise.all([
    supabase.from("assets").select("id, name").order("name"),
    supabase.from("profiles").select("id, full_name").eq("role", "staff").order("full_name"),
  ]);

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-xl font-semibold">Nueva regla de mantenimiento</h1>

      <form action={createPmSchedule} className="space-y-4">
        <Field label="Título de la tarea">
          <input
            name="title"
            required
            placeholder="Cambiar filtros de A/C"
            className="w-full rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/15 dark:bg-black/20"
          />
        </Field>

        <Field label="Descripción">
          <textarea
            name="description"
            rows={2}
            className="w-full rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/15 dark:bg-black/20"
          />
        </Field>

        <Field label="Activo">
          <select
            name="asset_id"
            required
            className="w-full rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/15 dark:bg-black/20"
          >
            {assets?.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Repetir cada">
            <input
              type="number"
              name="interval_value"
              min={1}
              defaultValue={3}
              required
              className="w-full rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/15 dark:bg-black/20"
            />
          </Field>
          <Field label="Unidad">
            <select
              name="interval_unit"
              defaultValue="months"
              className="w-full rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/15 dark:bg-black/20"
            >
              <option value="days">Días</option>
              <option value="weeks">Semanas</option>
              <option value="months">Meses</option>
              <option value="years">Años</option>
            </select>
          </Field>
        </div>

        <Field label="Próxima fecha">
          <input
            type="date"
            name="next_due_date"
            required
            className="w-full rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/15 dark:bg-black/20"
          />
        </Field>

        <Field label="Asignar por defecto a">
          <select
            name="default_assignee"
            defaultValue=""
            className="w-full rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/15 dark:bg-black/20"
          >
            <option value="">— Sin asignar —</option>
            {staff?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name}
              </option>
            ))}
          </select>
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
