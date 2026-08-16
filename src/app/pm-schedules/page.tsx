import Link from "next/link";
import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { togglePmSchedule } from "@/app/actions/pm-schedules";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonPrimary, buttonSecondary, listCard, mutedText, pageHeading } from "@/lib/ui";

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
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className={pageHeading}>Mantenimiento preventivo</h1>
          <p className={mutedText}>Genera tareas automáticamente por calendario.</p>
        </div>
        <Link href="/pm-schedules/new" className={buttonPrimary}>
          + Nueva regla
        </Link>
      </div>

      {schedules && schedules.length > 0 ? (
        <ul className={listCard}>
          {schedules.map((s) => {
            const asset = Array.isArray(s.assets) ? s.assets[0] : s.assets;
            const assignee = Array.isArray(s.assignee) ? s.assignee[0] : s.assignee;
            return (
              <li key={s.id} className="flex items-center justify-between gap-4 px-4 py-3.5">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-medium text-zinc-900 dark:text-zinc-50">
                    {s.title}
                    {!s.active && (
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-normal text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                        inactiva
                      </span>
                    )}
                  </p>
                  <p className={mutedText}>
                    Cada {s.interval_value} {UNIT_LABELS[s.interval_unit]} · próxima: {s.next_due_date}
                    {asset ? ` · ${asset.name}` : ""}
                    {assignee ? ` · asignada a ${assignee.full_name}` : ""}
                  </p>
                </div>
                <form action={togglePmSchedule.bind(null, s.id, !s.active)} className="shrink-0">
                  <button type="submit" className={buttonSecondary}>
                    {s.active ? "Desactivar" : "Activar"}
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState icon="🔁" message="No hay reglas de mantenimiento preventivo." />
      )}
    </div>
  );
}
