"use server";

import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { sendInviteEmail } from "@/lib/notifications/send";
import type { NotificationChannel, NotificationEventType, UserRole } from "@/lib/types/database";

export type InviteActionState = { ok: true } | { ok: false; error: string } | null;

export async function inviteMember(
  _prevState: InviteActionState,
  formData: FormData
): Promise<InviteActionState> {
  await requireOwner();

  const email = String(formData.get("email") ?? "").trim();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const role = String(formData.get("role") ?? "staff") as UserRole;
  const sendNow = formData.get("send_invite") === "on";
  if (!email || !fullName) return { ok: false, error: "Nombre y email son obligatorios." };

  const admin = createAdminClient();
  let userId: string | undefined;

  if (sendNow) {
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName, role },
    });
    if (error) return { ok: false, error: error.message };
    userId = data.user?.id;
  } else {
    // Create the account without sending Supabase's built-in invite email —
    // the owner sends it later (once, or resends) via sendInvite below.
    const { data, error } = await admin.auth.admin.createUser({
      email,
      email_confirm: false,
      user_metadata: { full_name: fullName, role },
    });
    if (error) return { ok: false, error: error.message };
    userId = data.user?.id;
  }

  if (phone && userId) {
    const supabase = await createClient();
    await supabase.from("profiles").update({ phone }).eq("id", userId);
  }

  revalidatePath("/directory");
  return { ok: true };
}

export async function sendInvite(userId: string): Promise<{ error?: string }> {
  await requireOwner();
  const supabase = await createClient();
  const admin = createAdminClient();

  const [{ data: profile }, { data: authUser }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", userId).single(),
    admin.auth.admin.getUserById(userId),
  ]);

  const email = authUser?.user?.email;
  if (!profile || !email) return { error: "No se encontró la cuenta." };

  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (error) return { error: error.message };

  await sendInviteEmail(email, profile.full_name, data.properties.action_link);
  return {};
}

export async function updateStaffHireDate(userId: string, formData: FormData) {
  await requireOwner();
  const supabase = await createClient();

  const hireDate = String(formData.get("hire_date") ?? "").trim() || null;

  await supabase.from("staff_details").upsert({ user_id: userId, hire_date: hireDate }, { onConflict: "user_id" });

  revalidatePath("/directory");
}

export async function addSalaryChange(userId: string, formData: FormData) {
  await requireOwner();
  const supabase = await createClient();

  const salaryRaw = String(formData.get("salary") ?? "").trim();
  const salary = Number(salaryRaw);
  if (!salaryRaw || Number.isNaN(salary)) return;
  const effectiveDate = String(formData.get("effective_date") ?? "").trim() || new Date().toISOString().slice(0, 10);

  await supabase.from("staff_salary_history").insert({ user_id: userId, salary, effective_date: effectiveDate });

  revalidatePath("/directory");
}

export async function setNotificationPreference(
  userId: string,
  eventType: NotificationEventType,
  channel: NotificationChannel,
  enabled: boolean
) {
  await requireOwner();
  const supabase = await createClient();

  await supabase
    .from("notification_preferences")
    .upsert(
      { user_id: userId, event_type: eventType, channel, enabled },
      { onConflict: "user_id,event_type,channel" }
    );

  revalidatePath("/directory");
  revalidatePath("/profile");
}
