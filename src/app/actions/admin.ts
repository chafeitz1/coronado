"use server";

import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { NotificationChannel, NotificationEventType, UserRole } from "@/lib/types/database";

export async function inviteMember(formData: FormData) {
  await requireOwner();

  const email = String(formData.get("email") ?? "").trim();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const role = String(formData.get("role") ?? "staff") as UserRole;
  if (!email || !fullName) return;

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName, role },
  });

  if (error) throw new Error(error.message);

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
}
