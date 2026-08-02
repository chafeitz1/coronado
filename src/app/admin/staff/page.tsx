import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { inviteMember } from "@/app/actions/admin";
import { PrefToggle } from "@/components/pref-toggle";
import type { NotificationEventType } from "@/lib/types/database";

const EVENTS: { key: NotificationEventType; label: string }[] = [
  { key: "task_assigned", label: "Tarea asignada" },
  { key: "status_changed", label: "Cambio de estado" },
  { key: "due_soon", label: "Por vencer" },
  { key: "overdue", label: "Vencida" },
];

export default async function StaffAdminPage() {
  const owner = await requireOwner();
  const supabase = await createClient();

  const [{ data: members }, { data: prefs }, { data: ownerPrefs }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, role").neq("role", "owner").order("full_name"),
    supabase.from("notification_preferences").select("user_id, event_type, channel, enabled"),
    supabase
      .from("notification_preferences")
      .select("channel, enabled")
      .eq("user_id", owner.id)
      .eq("event_type", "note_flagged"),
  ]);

  const prefLookup = new Map(
    (prefs ?? []).map((p) => [`${p.user_id}:${p.event_type}:${p.channel}`, p.enabled])
  );
  const ownerNoteEmailEnabled =
    ownerPrefs?.find((p) => p.channel === "email")?.enabled ?? true;

  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <h1 className="text-xl font-semibold">Tus notificaciones</h1>
        <label className="flex items-center gap-2 text-sm">
          <PrefToggle
            userId={owner.id}
            eventType="note_flagged"
            channel="email"
            defaultEnabled={ownerNoteEmailEnabled}
          />
          Avísame por email cuando alguien marque una nota como importante
        </label>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Invitar a alguien</h2>
        <form action={inviteMember} className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="text-sm font-medium">Nombre</label>
            <input
              name="full_name"
              required
              className="rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/15 dark:bg-black/20"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Email</label>
            <input
              type="email"
              name="email"
              required
              className="rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/15 dark:bg-black/20"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Rol</label>
            <select
              name="role"
              defaultValue="staff"
              className="rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/15 dark:bg-black/20"
            >
              <option value="staff">Personal</option>
              <option value="family">Familia</option>
            </select>
          </div>
          <button
            type="submit"
            className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
          >
            Enviar invitación
          </button>
        </form>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Personal y familia</h2>
        {members?.map((member) => (
          <div key={member.id} className="rounded-lg border border-black/10 p-4 dark:border-white/10">
            <p className="font-medium">
              {member.full_name}{" "}
              <span className="text-xs font-normal text-black/50 dark:text-white/50">
                ({member.role === "staff" ? "Personal" : "Familia"})
              </span>
            </p>
            {member.role === "staff" ? (
              <table className="mt-3 w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-black/50 dark:text-white/50">
                    <th className="pb-1 font-normal">Evento</th>
                    <th className="pb-1 font-normal">Push</th>
                    <th className="pb-1 font-normal">Email</th>
                  </tr>
                </thead>
                <tbody>
                  {EVENTS.map((event) => (
                    <tr key={event.key}>
                      <td className="py-1">{event.label}</td>
                      <td className="py-1">
                        <PrefToggle
                          userId={member.id}
                          eventType={event.key}
                          channel="push"
                          defaultEnabled={
                            prefLookup.get(`${member.id}:${event.key}:push`) ?? true
                          }
                        />
                      </td>
                      <td className="py-1">
                        <PrefToggle
                          userId={member.id}
                          eventType={event.key}
                          channel="email"
                          defaultEnabled={
                            prefLookup.get(`${member.id}:${event.key}:email`) ?? true
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="mt-1 text-xs text-black/50 dark:text-white/50">
                Puede ver y crear tareas puntuales.
              </p>
            )}
          </div>
        ))}
        {(!members || members.length === 0) && (
          <p className="text-sm text-black/50 dark:text-white/50">
            Todavía no has invitado a nadie.
          </p>
        )}
      </section>
    </div>
  );
}

