import "server-only";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyUser } from "@/lib/notifications/send";
import { isoDateOffset, daysUntil } from "@/lib/dates";

export const dynamic = "force-dynamic";

function single<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

const STATUS_LABELS: Record<string, string> = {
  done: "Completada",
  skipped: "Omitida",
  in_progress: "En progreso",
  open: "Sin completar",
};

// Runs once a day (see vercel.json) — a single cron invocation covers both
// the 6pm digest and the maintenance-reminder sweep, since Vercel Hobby
// only guarantees daily granularity anyway and there's no reason to spend
// a second invocation on this.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: owner } = await supabase.from("profiles").select("id").eq("role", "owner").limit(1).single();
  if (!owner) return NextResponse.json({ ok: true, skipped: "no owner" });

  const [digest, maintenance] = await Promise.all([
    sendDailyDigest(supabase, owner.id),
    sendMaintenanceReminders(supabase, owner.id),
  ]);

  return NextResponse.json({ ok: true, digest, maintenance });
}

type Supabase = ReturnType<typeof createAdminClient>;

// Today's tasks (whatever their outcome) plus anything still open from
// before today, so the owner sees both "how did today go" and "what's
// been slipping."
async function sendDailyDigest(supabase: Supabase, ownerId: string) {
  const today = isoDateOffset(0);

  const { data: rows } = await supabase
    .from("work_orders")
    .select("id, title, status, due_date, assignee:profiles!work_orders_assigned_to_fkey(full_name)")
    .or(`due_date.eq.${today},and(due_date.lt.${today},status.in.(open,in_progress))`)
    .order("due_date");

  if (!rows || rows.length === 0) return { sent: false };

  type Row = (typeof rows)[number];
  const dueToday = rows.filter((r) => r.due_date === today);
  const stillOpenFromBefore = rows.filter((r) => r.due_date !== today);

  const line = (r: Row) => {
    const assignee = single(r.assignee)?.full_name ?? "Sin asignar";
    return `<li>${r.title} — ${STATUS_LABELS[r.status] ?? r.status} (${assignee})</li>`;
  };

  const emailHtml = `
    <h2>Resumen del día</h2>
    ${
      dueToday.length
        ? `<p><strong>Tareas de hoy (${dueToday.length}):</strong></p><ul>${dueToday.map(line).join("")}</ul>`
        : "<p>No había tareas programadas para hoy.</p>"
    }
    ${
      stillOpenFromBefore.length
        ? `<p><strong>Atrasadas y sin cerrar (${stillOpenFromBefore.length}):</strong></p><ul>${stillOpenFromBefore.map(line).join("")}</ul>`
        : ""
    }
  `;

  const doneCount = dueToday.filter((r) => r.status === "done").length;
  const body = `Hoy: ${doneCount}/${dueToday.length} tareas completadas${
    stillOpenFromBefore.length ? `, ${stillOpenFromBefore.length} atrasadas sin cerrar` : ""
  }.`;

  await notifyUser(ownerId, "daily_digest", { body, url: "/work-orders", emailHtml });
  return { sent: true, dueToday: dueToday.length, stillOpenFromBefore: stillOpenFromBefore.length };
}

// Fires once per maintenance task, the first time it's within 14 days of
// its due date (a >= check, not ==, so a missed cron run doesn't lose the
// reminder) — maintenance_reminder_sent_at then keeps it from repeating.
async function sendMaintenanceReminders(supabase: Supabase, ownerId: string) {
  const cutoff = isoDateOffset(14);

  const { data: rows } = await supabase
    .from("work_orders")
    .select("id, title, due_date, status, asset:assets(name)")
    .not("asset_id", "is", null)
    .not("due_date", "is", null)
    .is("maintenance_reminder_sent_at", null)
    .lte("due_date", cutoff)
    .in("status", ["open", "in_progress"]);

  if (!rows || rows.length === 0) return { sent: 0 };

  let sent = 0;
  for (const row of rows) {
    const assetName = single(row.asset)?.name ?? "un activo";
    const days = daysUntil(row.due_date!);
    const when = days <= 0 ? "hoy o ya venció" : `en ${days} días`;

    await notifyUser(ownerId, "maintenance_reminder", {
      body: `Mantenimiento de ${assetName} (${row.title}) vence ${when} — coordiná al proveedor.`,
      url: `/work-orders/${row.id}`,
    });
    await supabase.from("work_orders").update({ maintenance_reminder_sent_at: new Date().toISOString() }).eq("id", row.id);
    sent++;
  }

  return { sent };
}
