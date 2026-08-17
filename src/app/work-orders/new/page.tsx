import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createWorkOrder } from "@/app/actions/work-orders";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { buttonPrimary, card, input, pageHeading } from "@/lib/ui";

export default async function NewWorkOrderPage() {
  const profile = await requireUser();
  const supabase = await createClient();

  const [{ data: assets }, { data: staff }] = await Promise.all([
    supabase.from("assets").select("id, name").order("name"),
    profile.role === "owner"
      ? supabase.from("profiles").select("id, full_name").eq("role", "staff").order("full_name")
      : Promise.resolve({ data: null }),
  ]);

  return (
    <div className="max-w-lg space-y-6">
      <h1 className={pageHeading}>Nueva tarea</h1>

      <form action={createWorkOrder} className={`space-y-4 p-5 ${card}`}>
        <Field label="Título">
          <input name="title" required className={input} />
        </Field>

        <Field label="Descripción">
          <textarea name="description" rows={3} className={input} />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Prioridad">
            <select name="priority" defaultValue="medium" className={input}>
              <option value="low">Baja</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
            </select>
          </Field>

          <Field label="Fecha límite">
            <input type="date" name="due_date" className={input} />
          </Field>
        </div>

        <Field label="Activo relacionado (opcional)">
          <select name="asset_id" defaultValue="" className={input}>
            <option value="">— Ninguno —</option>
            {assets?.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </Field>

        {profile.role === "owner" && (
          <Field label="Asignar a">
            <select name="assigned_to" defaultValue="" className={input}>
              <option value="">— Sin asignar —</option>
              {staff?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name}
                </option>
              ))}
            </select>
          </Field>
        )}

        <SubmitButton className={buttonPrimary} pendingLabel="Creando...">
          Crear tarea
        </SubmitButton>
      </form>
    </div>
  );
}
