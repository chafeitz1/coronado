import "server-only";
import webpush from "web-push";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import type { NotificationEventType } from "@/lib/types/database";

const EVENT_LABELS: Record<NotificationEventType, string> = {
  task_assigned: "Nueva tarea asignada",
  status_changed: "Una tarea cambió de estado",
  due_soon: "Tarea por vencer",
  overdue: "Tarea vencida",
  note_flagged: "Nota importante",
};

let vapidConfigured = false;
function configureVapid() {
  if (vapidConfigured) return;
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return;
  webpush.setVapidDetails(
    VAPID_SUBJECT ?? "mailto:owner@example.com",
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
  vapidConfigured = true;
}

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export interface NotifyPayload {
  title?: string;
  body: string;
  url?: string;
}

/**
 * Dispatches a notification to a single user for a given event type,
 * respecting that user's per-channel preferences (configured by the
 * owner in /admin/staff). Missing preference rows default to "on" so
 * notifications work out of the box before anyone visits the settings page.
 */
export async function notifyUser(
  userId: string,
  eventType: NotificationEventType,
  payload: NotifyPayload
) {
  const admin = createAdminClient();

  const { data: prefs } = await admin
    .from("notification_preferences")
    .select("channel, enabled")
    .eq("user_id", userId)
    .eq("event_type", eventType);

  const pushEnabled = prefs?.find((p) => p.channel === "push")?.enabled ?? true;
  const emailEnabled = prefs?.find((p) => p.channel === "email")?.enabled ?? true;

  const title = payload.title ?? EVENT_LABELS[eventType];

  await Promise.all([
    pushEnabled ? sendPushToUser(userId, title, payload) : null,
    emailEnabled ? sendEmailToUser(userId, title, payload) : null,
  ]);
}

async function sendPushToUser(userId: string, title: string, payload: NotifyPayload) {
  configureVapid();
  if (!vapidConfigured) return;

  const admin = createAdminClient();
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", userId);

  if (!subs?.length) return;

  const body = JSON.stringify({ title, body: payload.body, url: payload.url ?? "/" });

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth_key },
          },
          body
        );
      } catch (err: unknown) {
        // Expired/invalid subscription: clean it up so we stop retrying it.
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await admin.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    })
  );
}

/**
 * Sends a Supabase-generated auth link (magic link / invite) by hand via
 * Resend, for accounts the owner created without triggering Supabase's
 * built-in invite email (see inviteMember/sendInvite in actions/admin.ts).
 */
export async function sendInviteEmail(email: string, fullName: string, actionLink: string) {
  if (!resend) return;

  await resend.emails.send({
    from: process.env.NOTIFICATIONS_FROM_EMAIL ?? "Casa Coronado <notificaciones@resend.dev>",
    to: email,
    subject: "Te invitaron a Casa Coronado",
    html: `<p>Hola ${fullName},</p><p>Te invitaron a Casa Coronado. Haz clic para entrar y configurar tu cuenta:</p><p><a href="${actionLink}">Entrar a Casa Coronado</a></p>`,
  });
}

async function sendEmailToUser(userId: string, title: string, payload: NotifyPayload) {
  if (!resend) return;

  const admin = createAdminClient();
  const { data: authUser } = await admin.auth.admin.getUserById(userId);
  const email = authUser?.user?.email;
  if (!email) return;

  await resend.emails.send({
    from: process.env.NOTIFICATIONS_FROM_EMAIL ?? "Casa Coronado <notificaciones@resend.dev>",
    to: email,
    subject: title,
    html: `<p>${payload.body}</p>${
      payload.url
        ? `<p><a href="${process.env.NEXT_PUBLIC_APP_URL ?? ""}${payload.url}">Ver en Casa Coronado</a></p>`
        : ""
    }`,
  });
}
