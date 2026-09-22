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
  purchase_urgent: "Compra urgente",
  daily_digest: "Resumen del día",
  maintenance_reminder: "Mantenimiento próximo",
  announcement_created: "Nuevo anuncio",
  announcement_happened: "Anuncio marcado como sucedido",
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

// Same brand shell every "amigable" email reads as — an eyebrow label over
// a title, on the dark-header/white-card layout. Callers only supply the
// eyebrow (+ optional color, for urgency) and the body markup that goes
// under the title.
export function brandedEmailHtml(params: { eyebrow: string; eyebrowColor?: string; title: string; bodyHtml: string }) {
  const { eyebrow, eyebrowColor = "#0075de", title, bodyHtml } = params;
  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:0 auto;">
      <div style="background-color:#1F1D1A;padding:18px 24px;border-radius:12px 12px 0 0;text-align:center;">
        <img src="${process.env.NEXT_PUBLIC_APP_URL ?? ""}/brand/bonsai-logo-principal-blanco.png" alt="Bonsai" width="58" height="30" style="display:inline-block;height:30px;width:58px;" />
      </div>
      <div style="background:#ffffff;border:1px solid #e7e5e4;border-top:none;border-radius:0 0 12px 12px;padding:24px;">
        <p style="margin:0 0 4px;font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:${eyebrowColor};">${eyebrow}</p>
        <h1 style="margin:0 0 14px;font-size:20px;line-height:1.3;color:#18181b;">${title}</h1>
        ${bodyHtml}
      </div>
    </div>
  `;
}

export interface NotifyPayload {
  title?: string;
  body: string;
  url?: string;
  // Push notifications and the plain-text `body` above can't carry a
  // multi-item list (the daily digest, say) — when set, the email uses
  // this instead of wrapping `body` in a single <p>. Push always uses
  // `body`, since a push notification is a short line, not a document.
  emailHtml?: string;
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

export async function sendPushToUser(userId: string, title: string, payload: NotifyPayload) {
  configureVapid();
  if (!vapidConfigured) {
    console.error("[push] not sent: VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY missing from server env");
    return;
  }

  const admin = createAdminClient();
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", userId);

  if (!subs?.length) {
    console.error(`[push] not sent: no push_subscriptions row for user ${userId}`);
    return;
  }

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
        const errBody = (err as { body?: string })?.body;
        console.error(`[push] send failed for subscription ${sub.id} (status ${statusCode}): ${errBody ?? err}`);
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
    from: process.env.NOTIFICATIONS_FROM_EMAIL ?? "Bonsai <notificaciones@resend.dev>",
    to: email,
    subject: "Te invitaron a Bonsai",
    html: `<p>Hola ${fullName},</p><p>Te invitaron a Bonsai. Haz clic para entrar y configurar tu cuenta:</p><p><a href="${actionLink}">Entrar a Bonsai</a></p>`,
  });
}

async function sendEmailToUser(userId: string, title: string, payload: NotifyPayload) {
  if (!resend) return;

  const admin = createAdminClient();
  const { data: authUser } = await admin.auth.admin.getUserById(userId);
  const email = authUser?.user?.email;
  if (!email) return;

  await resend.emails.send({
    from: process.env.NOTIFICATIONS_FROM_EMAIL ?? "Bonsai <notificaciones@resend.dev>",
    to: email,
    subject: title,
    html: `${payload.emailHtml ?? `<p>${payload.body}</p>`}${
      payload.url
        ? `<div style="max-width:480px;margin:16px auto 0;text-align:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
             <a href="${process.env.NEXT_PUBLIC_APP_URL ?? ""}${payload.url}" style="display:inline-block;background-color:#0075de;color:#ffffff;font-weight:600;font-size:14px;padding:12px 28px;border-radius:8px;text-decoration:none;">Ver en Bonsai</a>
           </div>`
        : ""
    }`,
  });
}
