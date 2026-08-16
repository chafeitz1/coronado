import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createPmSchedule } from "@/app/actions/pm-schedules";
import { Field } from "@/components/ui/field";
import { buttonPrimary, card, input, pageHeading } from "@/lib/ui";

export default async function NewPmSchedulePage() {
  await requireOwner();
  const supabase = await createClient();

  const [{ data: assets }, { data: staff }] = await Promise.all([
    supabase.from("assets").select("id, name").order("name"),
    supabase.from("profiles").select("id, full_name").eq("role", "staff").order("full_name"),
  ]);

  return (
    <div className="max-w-lg space-y-6">
      <h1 className={pageHeading}>Nueva regla de mantenimiento</h1>

      <form action={createPmSchedule} className={`space-y-4 p-5 ${card}`}>
        <Field label="Título de la tarea">
          <input name="title" required placeholder="Cambiar filtros de A/C" className={input} />
        </Field>

        <Field label="Descripción">
          <textarea name="description" rows={2} className={input} />
        </Field>

        <Field label="Activo">
          <select name="asset_id" required className={input}>
            {assets?.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Repetir cada">
            <input type="number" name="interval_value" min={1} defaultValue={3} required className={input} />
          </Field>
          <Field label="Unidad">
            <select name="interval_unit" defaultValue="months" className={input}>
              <option value="days">Días</option>
              <option value="weeks">Semanas</option>
              <option value="months">Meses</option>
              <option value="years">Años</option>
            </select>
          </Field>
        </div>

        <Field label="Próxima fecha">
          <input type="date" name="next_due_date" required className={input} />
        </Field>

        <Field label="Asignar por defecto a">
          <select name="default_assignee" defaultValue="" className={input}>
            <option value="">— Sin asignar —</option>
            {staff?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name}
              </option>
            ))}
          </select>
        </Field>

        <button type="submit" className={buttonPrimary}>
          Guardar
        </button>
      </form>
    </div>
  );
}
