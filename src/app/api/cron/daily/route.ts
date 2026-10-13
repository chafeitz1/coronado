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

  // Every owner, not just one — this house has three (Carlos, Salomón,
  // Teófilo), and before this only whichever one the query happened to
  // return first ever got the digest or a maintenance reminder.
  const { data: owners } = await supabase.from("profiles").select("id").eq("role", "owner");
  const ownerIds = (owners ?? []).map((row) => row.id);
  if (ownerIds.length === 0) {
    await supabase.from("cron_runs").insert({ result: { ok: true, skipped: "no owner" } });
    return NextResponse.json({ ok: true, skipped: "no owner" });
  }

  const [digest, maintenance, announcements] = await Promise.all([
    sendDailyDigest(supabase, ownerIds),
    sendMaintenanceReminders(supabase, ownerIds),
    sendAnnouncementReminders(supabase),
  ]);

  await supabase.from("cron_runs").insert({ result: { ok: true, digest, maintenance, announcements } });
  return NextResponse.json({ ok: true, digest, maintenance, announcements });
}

type Supabase = ReturnType<typeof createAdminClient>;

// Today's tasks (whatever their outcome) plus anything still open from
// before today, so the owner sees both "how did today go" and "what's
// been slipping." The "lt today AND status in (open, in_progress)" half of
// the filter is what makes a stale task persist: it keeps matching on
// every day's run until it's finally closed out (done or skipped), not
// just the one day it was due.
async function sendDailyDigest(supabase: Supabase, ownerIds: string[]) {
  const today = isoDateOffset(0);

  const { data: rows } = await supabase
    .from("work_orders")
    .select("id, title, status, due_date, assignee:profiles!work_orders_assigned_to_fkey(full_name)")
    .or(`due_date.eq.${today},and(due_date.lt.${today},status.in.(open,in_progress))`)
    .order("due_date");

  if (!rows || rows.length === 0) return { sent: false };

  type Row = (typeof rows)[number];
  // Split by outcome, not by due date — a skipped task counts as "no
  // completada" alongside the ones still open, tagged "omitida" so it
  // doesn't read like it's merely running late.
  const completed = rows.filter((r) => r.status === "done");
  const notCompleted = rows.filter((r) => r.status !== "done");

  // Evidence photos under each completed task — "¿de verdad se hizo?" at a
  // glance, without opening the task. Only for completed tasks (there's
  // nothing to show yet for one still open); capped at 3 thumbnails each so
  // one task with a dozen photos doesn't blow up the email. PDFs (vendor
  // reports etc. also filed as "evidence") don't render as images, so those
  // are skipped here — the photos only.
  const completedIds = completed.map((r) => r.id);
  const { data: attachmentRows } = completedIds.length
    ? await supabase
        .from("attachments")
        .select("work_order_id, storage_path")
        .in("work_order_id", completedIds)
        .eq("kind", "evidence")
        .order("created_at")
    : { data: [] };

  const MAX_PHOTOS_PER_TASK = 3;
  const photosByWorkOrder = new Map<string, string[]>();
  for (const row of attachmentRows ?? []) {
    if (row.storage_path.toLowerCase().endsWith(".pdf")) continue;
    const existing = photosByWorkOrder.get(row.work_order_id) ?? [];
    if (existing.length >= MAX_PHOTOS_PER_TASK) continue;
    const url = supabase.storage.from("attachments").getPublicUrl(row.storage_path).data.publicUrl;
    existing.push(url);
    photosByWorkOrder.set(row.work_order_id, existing);
  }

  const assigneeOf = (r: Row) => single(r.assignee)?.full_name ?? "Sin asignar";
  const completedLine = (r: Row) => {
    const photos = photosByWorkOrder.get(r.id) ?? [];
    const photosHtml = photos.length
      ? `<div style="margin-top:4px;display:flex;gap:6px;">${photos
          .map(
            (url) =>
              `<img src="${url}" width="72" height="72" style="width:72px;height:72px;object-fit:cover;border-radius:6px;border:1px solid #e7e5e4;display:block;" />`
          )
          .join("")}</div>`
      : "";
    return `<li style="margin-bottom:${photos.length ? "10px" : "4px"};">${r.title} (${assigneeOf(r)})${photosHtml}</li>`;
  };
  const notCompletedLine = (r: Row) => {
    if (r.status === "skipped") return `<li style="margin-bottom:4px;">${r.title} — omitida (${assigneeOf(r)})</li>`;
    const daysLate = r.due_date! < today ? -daysUntil(r.due_date!) : 0;
    const when = r.due_date === today ? "vence hoy" : daysLate === 1 ? "venció ayer" : `venció hace ${daysLate} días`;
    return `<li style="margin-bottom:4px;">${r.title} — ${when} (${assigneeOf(r)})</li>`;
  };

  const listStyle = 'style="margin:0;padding-left:18px;font-size:14px;color:#18181b;"';
  const labelStyle = 'style="margin:0 0 8px;font-size:13px;font-weight:600;color:#78716c;"';
  const emptyStyle = 'style="margin:0 0 12px;font-size:14px;color:#18181b;"';

  const emailHtml = `
    <p ${labelStyle}>✅ Completadas (${completed.length}):</p>
    ${
      completed.length
        ? `<ul ${listStyle}>${completed.map(completedLine).join("")}</ul>`
        : `<p ${emptyStyle}>Ninguna todavía.</p>`
    }
    <p ${labelStyle}>❌ No completadas (${notCompleted.length}):</p>
    ${
      notCompleted.length
        ? `<ul ${listStyle}>${notCompleted.map(notCompletedLine).join("")}</ul>`
        : `<p style="margin:0;font-size:14px;color:#18181b;">Ninguna — todo al día.</p>`
    }
  `;

  const body = `Hoy: ${completed.length}/${rows.length} tareas completadas${
    notCompleted.length ? `, ${notCompleted.length} sin completar` : ""
  }.`;

  await Promise.all(ownerIds.map((ownerId) => notifyUser(ownerId, "daily_digest", { body, url: "/work-orders", emailHtml })));
  return { sent: true, completed: completed.length, notCompleted: notCompleted.length };
}

// Fires once per maintenance task, the first time it's within 14 days of
// its due date (a >= check, not ==, so a missed cron run doesn't lose the
// reminder) — maintenance_reminder_sent_at then keeps it from repeating.
async function sendMaintenanceReminders(supabase: Supabase, ownerIds: string[]) {
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

    // One flag per task, not per owner — fired to every owner here, then
    // marked sent once so the next run's "is null" filter skips it for
    // everyone, instead of only the first owner who happened to get it.
    await Promise.all(
      ownerIds.map((ownerId) =>
        notifyUser(ownerId, "maintenance_reminder", {
          body: `Mantenimiento de ${assetName} (${row.title}) vence ${when} — coordiná al proveedor.`,
          url: `/work-orders/${row.id}`,
        })
      )
    );
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
