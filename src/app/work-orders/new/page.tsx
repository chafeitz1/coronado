import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createWorkOrder } from "@/app/actions/work-orders";

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
      <h1 className="text-xl font-semibold">Nueva tarea</h1>

      <form action={createWorkOrder} className="space-y-4">
        <Field label="Título">
          <input
            name="title"
            required
            className="w-full rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/15 dark:bg-black/20"
          />
        </Field>

        <Field label="Descripción">
          <textarea
            name="description"
            rows={3}
            className="w-full rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/15 dark:bg-black/20"
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Prioridad">
            <select
              name="priority"
              defaultValue="medium"
              className="w-full rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/15 dark:bg-black/20"
            >
              <option value="low">Baja</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
            </select>
          </Field>

          <Field label="Fecha límite">
            <input
              type="date"
              name="due_date"
              className="w-full rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/15 dark:bg-black/20"
            />
          </Field>
        </div>

        <Field label="Activo relacionado (opcional)">
          <select
            name="asset_id"
            defaultValue=""
            className="w-full rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/15 dark:bg-black/20"
          >
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
            <select
              name="assigned_to"
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
        )}

        <button
          type="submit"
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
        >
          Crear tarea
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
