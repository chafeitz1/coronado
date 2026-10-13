"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser, requireOwner } from "@/lib/auth";
import { notifyUser } from "@/lib/notifications/send";
import { formatLongDate } from "@/lib/dates";
import type { AnnouncementStatus } from "@/lib/types/database";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

async function getOwnerId(supabase: SupabaseClient) {
  const { data } = await supabase.from("profiles").select("id").eq("role", "owner").limit(1).single();
  return data?.id ?? null;
}

async function getStaffIds(supabase: SupabaseClient) {
  const { data } = await supabase.from("profiles").select("id").eq("role", "staff");
  return (data ?? []).map((row) => row.id);
}

function dateRangeLabel(startDate: string, endDate: string | null) {
  const start = formatLongDate(startDate, "es");
  if (!endDate || endDate === startDate) return start;
  return `${start} al ${formatLongDate(endDate, "es")}`;
}

export type AnnouncementState = { ok: true } | { ok: false; error: string } | null;

// Only the owner posts these (see announcements_insert_owner RLS policy) —
// creating one is the trigger, not a status change, so every staff member
// gets pinged right away instead of waiting to notice it in the app.
export async function createAnnouncement(
  _prevState: AnnouncementState,
  formData: FormData
): Promise<AnnouncementState> {
  const profile = await requireOwner();
  const supabase = await createClient();

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { ok: false, error: "El título es obligatorio." };

  const startDate = String(formData.get("start_date") ?? "").trim();
  if (!startDate) return { ok: false, error: "La fecha es obligatoria." };

  const endDateRaw = String(formData.get("end_date") ?? "").trim();
  const endDate = endDateRaw || null;
  if (endDate && endDate < startDate) {
    return { ok: false, error: "La fecha final no puede ser antes que la fecha de inicio." };
  }

  const notes = String(formData.get("notes") ?? "").trim() || null;

  const { error } = await supabase
    .from("announcements")
    .insert({ title, notes, start_date: startDate, end_date: endDate, created_by: profile.id });

  if (error) return { ok: false, error: error.message };

  const staffIds = await getStaffIds(supabase);
  const when = dateRangeLabel(startDate, endDate);
  const emailHtml = `
    <div style="background:#e8f2fe;border-radius:8px;padding:12px 16px;">
      <p style="margin:0;font-size:14px;color:#18181b;"><strong>${when}</strong></p>
      ${notes ? `<p style="margin:6px 0 0;font-size:13px;color:#78716c;">${notes}</p>` : ""}
    </div>
  `;

  await Promise.all(
    staffIds.map((staffId) =>
      notifyUser(staffId, "announcement_created", {
        body: `${title} — ${when}`,
        url: "/announcements",
        emailTitle: title,
        emailHtml,
      })
    )
  );

  revalidatePath("/announcements");
  return { ok: true };
}

// Anyone can mark one as happened (staff on-site, most often) or undo a
// mistaken mark — same low-friction model as purchase_items' status toggle.
export async function toggleAnnouncementStatus(announcementId: string, nextStatus: AnnouncementStatus) {
  const profile = await requireUser();
  const supabase = await createClient();

  const { data: item } = await supabase
    .from("announcements")
    .update(
      nextStatus === "happened"
        ? { status: "happened", happened_by: profile.id, happened_at: new Date().toISOString() }
        : { status: "pending", happened_by: null, happened_at: null }
    )
    .eq("id", announcementId)
    .select("title, start_date, end_date")
    .single();

  if (nextStatus === "happened" && item) {
    const ownerId = await getOwnerId(supabase);
    if (ownerId && ownerId !== profile.id) {
      const when = dateRangeLabel(item.start_date, item.end_date);
      await notifyUser(ownerId, "announcement_happened", {
        body: `${profile.full_name} marcó "${item.title}" (${when}) como sucedido`,
        url: "/announcements",
        emailEyebrow: "✅ Anuncio sucedido",
        emailEyebrowColor: "#15803d",
        emailTitle: item.title,
        emailHtml: `
          <div style="background:#eafbf0;border-radius:8px;padding:12px 16px;">
            <p style="margin:0;font-size:14px;color:#18181b;">Marcado por <strong>${profile.full_name}</strong></p>
            <p style="margin:6px 0 0;font-size:13px;color:#78716c;">${when}</p>
          </div>
        `,
      });
    }
  }

  revalidatePath("/announcements");
}

// Owner-only (announcements_delete_owner RLS) — unlike purchase_items,
// nobody but the owner can erase one of these once it exists.
export async function deleteAnnouncement(announcementId: string) {
  await requireOwner();
  const supabase = await createClient();
  await supabase.from("announcements").delete().eq("id", announcementId);
  revalidatePath("/announcements");
}
