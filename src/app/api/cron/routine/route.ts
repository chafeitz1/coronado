import "server-only";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToUser } from "@/lib/notifications/send";

export const dynamic = "force-dynamic";

// The house's own clock, not the server's — every date/time elsewhere in
// this app is UTC-date-only, so this is the first place time-of-day
// actually matters, and it has to be the property's local time or every
// reminder fires at the wrong hour.
const HOUSE_TIMEZONE = "America/Panama";

// Matches the pg_cron schedule (supabase/migrations/0036_guest_routine_cron.sql,
// every 15 minutes) — a routine item is "due" once its time falls inside
// the window ending now, so this catches anything that passed since the
// last run without needing the two schedules to be pixel-perfectly synced.
const WINDOW_MINUTES = 15;

function nowInHouseTimezone() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: HOUSE_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    minutesSinceMidnight: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

// Fired every 15 min by Supabase's pg_cron (not Vercel's own Cron Jobs —
// see the migration for why). Pure reminder: no task is created, nothing
// to complete, just a push to staff naming what's due right now — only
// when house_occupancy says guests/residents are actually in the house.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.ROUTINE_CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: occupancy } = await supabase.from("house_occupancy").select("guests_present").eq("id", 1).single();
  if (!occupancy?.guests_present) {
    return NextResponse.json({ ok: true, skipped: "no guests" });
  }

  const { data: items } = await supabase.from("routine_items").select("id, time, title").order("time");
  if (!items || items.length === 0) return NextResponse.json({ ok: true, sent: 0 });

  const { date, minutesSinceMidnight } = nowInHouseTimezone();

  const due = items.filter((item) => {
    const [h, m] = item.time.split(":").map(Number);
    const itemMinutes = h * 60 + m;
    return itemMinutes <= minutesSinceMidnight && itemMinutes > minutesSinceMidnight - WINDOW_MINUTES;
  });

  if (due.length === 0) return NextResponse.json({ ok: true, sent: 0, checked: items.length });

  const { data: staff } = await supabase.from("profiles").select("id").eq("role", "staff");
  const staffIds = (staff ?? []).map((p) => p.id);

  let sent = 0;
  for (const item of due) {
    // Atomic "have I already sent this today" check via the unique
    // constraint — if another overlapping run already inserted this same
    // (item, date) pair, this insert fails and we skip instead of
    // double-notifying.
    const { error: insertError } = await supabase
      .from("routine_item_sends")
      .insert({ routine_item_id: item.id, sent_date: date });
    if (insertError) continue;

    await Promise.all(
      staffIds.map((userId) =>
        sendPushToUser(userId, "⏰ Rutina de huéspedes", { body: item.title, url: "/" })
      )
    );
    sent++;
  }

  return NextResponse.json({ ok: true, sent, checked: items.length });
}
