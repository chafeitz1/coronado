import Link from "next/link";
import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { togglePmSchedule } from "@/app/actions/pm-schedules";

const UNIT_LABELS: Record<string, string> = {
  days: "días",
  weeks: "semanas",
  months: "meses",
  years: "años",
};

export default async function PmSchedulesPage() {
  await requireOwner();
  const supabase = await createClient();

  const { data: schedules } = await supabase
    .from("pm_schedules")
    .select("id, title, interval_value, interval_unit, next_due_date, active, assets(name), assignee:profiles!pm_schedules_default_assignee_fkey(full_name)")
    .order("next_due_date");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Mantenimiento preventivo</h1>
          <p className="text-sm text-black/60 dark:text-white/60">
            Genera tareas automáticamente por calendario.
          </p>
        </div>
        <Link
          href="/pm-schedules/new"
          className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
        >
          + Nueva regla
        </Link>
      </div>

      <ul className="divide-y divide-black/10 rounded-lg border border-black/10 dark:divide-white/10 dark:border-white/10">
        {schedules?.map((s) => {
          const asset = Array.isArray(s.assets) ? s.assets[0] : s.assets;
          const assignee = Array.isArray(s.assignee) ? s.assignee[0] : s.assignee;
          return (
            <li key={s.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <div>
                <p className="font-medium">{s.title}</p>
                <p className="text-xs text-black/60 dark:text-white/60">
                  Cada {s.interval_value} {UNIT_LABELS[s.interval_unit]} · próxima: {s.next_due_date}
                  {asset ? ` · ${asset.name}` : ""}
                  {assignee ? ` · asignada a ${assignee.full_name}` : ""}
                  {!s.active && " · inactiva"}
                </p>
              </div>
              <form action={togglePmSchedule.bind(null, s.id, !s.active)}>
                <button
                  type="submit"
                  className="rounded-md border border-black/15 px-3 py-1.5 text-xs hover:bg-black/[0.03] dark:border-white/15 dark:hover:bg-white/[0.04]"
                >
                  {s.active ? "Desactivar" : "Activar"}
                </button>
              </form>
            </li>
          );
        })}
        {(!schedules || schedules.length === 0) && (
          <li className="px-4 py-3 text-sm text-black/50 dark:text-white/50">
            No hay reglas de mantenimiento preventivo.
          </li>
        )}
      </ul>
    </div>
  );
}
