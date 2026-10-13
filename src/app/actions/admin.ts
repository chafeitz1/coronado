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
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/auth/confirm`,
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

  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/auth/confirm` },
  });
  if (error) return { error: error.message };

  await sendInviteEmail(email, profile.full_name, data.properties.action_link);
  return {};
}

export async function updateStaffHireDate(userId: string, formData: FormData) {
  await requireOwner();
  const supabase = await createClient();

  const hireDate = String(formData.get("hire_date") ?? "").trim() || null;
  const terminationDate = String(formData.get("termination_date") ?? "").trim() || null;

  await supabase
    .from("staff_details")
    .upsert({ user_id: userId, hire_date: hireDate, termination_date: terminationDate }, { onConflict: "user_id" });

  revalidatePath("/directory");
  revalidatePath("/finance/payroll", "layout");
}

const ROLES: UserRole[] = ["owner", "resident", "staff"];

// Name, phone, and role live on profiles; birth date is staff_details —
// one form covers all of it since they're edited together in the panel's
// contact block. Email stays read-only there (it's the account's login
// identity). birth_date is only present in the submitted form when the
// person is currently staff, so it's only touched then.
export async function updatePersonInfo(userId: string, formData: FormData) {
  await requireOwner();
  const supabase = await createClient();

  const fullName = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const roleRaw = String(formData.get("role") ?? "");
  const role = ROLES.includes(roleRaw as UserRole) ? (roleRaw as UserRole) : undefined;
  const birthDateField = formData.get("birth_date");

  const updates: { full_name?: string; phone: string | null; role?: UserRole } = { phone };
  if (fullName) updates.full_name = fullName;
  if (role) updates.role = role;

  await supabase.from("profiles").update(updates).eq("id", userId);
  if (birthDateField !== null) {
    const birthDate = String(birthDateField).trim() || null;
    await supabase.from("staff_details").upsert({ user_id: userId, birth_date: birthDate }, { onConflict: "user_id" });
  }

  revalidatePath("/directory");
}

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function uploadPersonAvatar(
  userId: string,
  _prevState: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string }> {
  await requireOwner();

  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) return { error: "Elige una foto primero." };
  if (!ALLOWED_AVATAR_TYPES.includes(file.type)) return { error: "Solo se permiten fotos JPG, PNG o WEBP." };
  if (file.size > MAX_AVATAR_BYTES) return { error: "La foto no puede pesar más de 5MB." };

  const supabase = await createClient();
  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${userId}/avatar.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (uploadError) return { error: uploadError.message };

  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(path);
  const avatarUrl = `${publicUrl}?v=${Date.now()}`;

  const { error: updateError } = await supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("id", userId);
  if (updateError) return { error: updateError.message };

  revalidatePath("/directory");
  return {};
}

const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
const ALLOWED_DOCUMENT_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

// Supabase Storage rejects object keys built from an unsanitized filename
// (e.g. a phone screenshot's default "Screenshot 2026-08-24 at 12.19.22
// PM.png" — the spaces make it an "Invalid key") — strip it down to safe
// characters before using it in the path.
function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_");
}

export async function uploadStaffDocument(
  userId: string,
  _prevState: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string }> {
  await requireOwner();

  const file = formData.get("document");
  if (!(file instanceof File) || file.size === 0) return { error: "Elige un archivo primero." };
  if (!ALLOWED_DOCUMENT_TYPES.includes(file.type)) {
    return { error: "Solo se permiten fotos JPG, PNG, WEBP o un PDF." };
  }
  if (file.size > MAX_DOCUMENT_BYTES) return { error: "El archivo no puede pesar más de 10MB." };

  const supabase = await createClient();
  const path = `${userId}/${Date.now()}-${sanitizeFileName(file.name)}`;

  const { error: uploadError } = await supabase.storage
    .from("staff-documents")
    .upload(path, file, { contentType: file.type });
  if (uploadError) return { error: uploadError.message };

  const { data: existing } = await supabase
    .from("staff_details")
    .select("id_document_path")
    .eq("user_id", userId)
    .maybeSingle();
  if (existing?.id_document_path && existing.id_document_path !== path) {
    await supabase.storage.from("staff-documents").remove([existing.id_document_path]);
  }

  await supabase
    .from("staff_details")
    .upsert({ user_id: userId, id_document_path: path }, { onConflict: "user_id" });

  revalidatePath("/directory");
  return {};
}

export async function deleteStaffDocument(userId: string): Promise<{ error?: string }> {
  await requireOwner();
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("staff_details")
    .select("id_document_path")
    .eq("user_id", userId)
    .maybeSingle();
  if (existing?.id_document_path) {
    await supabase.storage.from("staff-documents").remove([existing.id_document_path]);
  }

  await supabase.from("staff_details").update({ id_document_path: null }).eq("user_id", userId);

  revalidatePath("/directory");
  return {};
}

export async function getStaffDocumentUrl(userId: string): Promise<{ url?: string; error?: string }> {
  await requireOwner();
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("staff_details")
    .select("id_document_path")
    .eq("user_id", userId)
    .maybeSingle();
  if (!existing?.id_document_path) return { error: "No hay documento cargado." };

  const { data, error } = await supabase.storage
    .from("staff-documents")
    .createSignedUrl(existing.id_document_path, 60);
  if (error) return { error: error.message };

  return { url: data.signedUrl };
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
