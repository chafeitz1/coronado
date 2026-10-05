import "server-only";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyUser, sendPushToUser } from "@/lib/notifications/send";
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
// Logged to cron_runs on every hit (even unauthorized ones) — Vercel's own
// log retention on this plan is too short to tell us whether the scheduled
// trigger is actually firing, so this table is the durable record instead.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const supabase = createAdminClient();

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    await supabase.from("cron_runs").insert({ result: { ok: false, reason: "unauthorized" } });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: owner } = await supabase.from("profiles").select("id").eq("role", "owner").limit(1).single();
  if (!owner) {
    await supabase.from("cron_runs").insert({ result: { ok: true, skipped: "no owner" } });
    return NextResponse.json({ ok: true, skipped: "no owner" });
  }

  const [digest, maintenance, announcements] = await Promise.all([
    sendDailyDigest(supabase, owner.id),
    sendMaintenanceReminders(supabase, owner.id),
    sendAnnouncementReminders(supabase),
  ]);

  await supabase.from("cron_runs").insert({ result: { ok: true, digest, maintenance, announcements } });
  return NextResponse.json({ ok: true, digest, maintenance, announcements });
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
    return `<li style="margin-bottom:4px;">${r.title} — ${STATUS_LABELS[r.status] ?? r.status} (${assignee})</li>`;
  };
  const listStyle = 'style="margin:0;padding-left:18px;font-size:14px;color:#18181b;"';
  const labelStyle = 'style="margin:0 0 8px;font-size:13px;font-weight:600;color:#78716c;"';

  const emailHtml = `
    ${
      dueToday.length
        ? `<p ${labelStyle}>Tareas de hoy (${dueToday.length}):</p><ul ${listStyle}>${dueToday.map(line).join("")}</ul>`
        : `<p style="margin:0;font-size:14px;color:#18181b;">No había tareas programadas para hoy.</p>`
    }
    ${
      stillOpenFromBefore.length
        ? `<p ${labelStyle}>Atrasadas y sin cerrar (${stillOpenFromBefore.length}):</p><ul ${listStyle}>${stillOpenFromBefore.map(line).join("")}</ul>`
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

// Push-only (no email, same as the purchase "Compra recibida" nudge) —
// fires every day an announcement's window has arrived/passed and nobody
// marked it "sucedido" yet, to everyone (staff + owner) so whoever is on
// site can confirm it. No sent-at flag: unlike maintenance reminders this
// is meant to repeat daily until someone acts on it, not fire once.
async function sendAnnouncementReminders(supabase: Supabase) {
  const today = isoDateOffset(0);

  const { data: rows } = await supabase
    .from("announcements")
    .select("id, title, start_date, end_date")
    .eq("status", "pending");

  const due = (rows ?? []).filter((r) => (r.end_date ?? r.start_date) <= today);
  if (due.length === 0) return { sent: 0 };

  const { data: profiles } = await supabase.from("profiles").select("id");
  const userIds = (profiles ?? []).map((p) => p.id);
  if (userIds.length === 0) return { sent: 0 };

  await Promise.all(
    due.flatMap((row) =>
      userIds.map((userId) =>
        sendPushToUser(userId, "¿Este anuncio ya sucedió?", {
          body: `"${row.title}" todavía no se marcó como sucedido — confirmalo en Anuncios.`,
          url: "/announcements",
        })
      )
    )
  );

  return { sent: due.length * userIds.length, announcements: due.length };
}
