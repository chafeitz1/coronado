"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { savePushSubscription, removePushSubscription } from "@/app/actions/push";
import { buttonGhost } from "@/lib/ui";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

function isPushSupported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
}

export function PushSubscribeButton() {
  const [status, setStatus] = useState<"unknown" | "subscribed" | "unsubscribed" | "unsupported">(
    () => (isPushSupported() ? "unknown" : "unsupported")
  );

  useEffect(() => {
    if (!isPushSupported()) return;
    // Register unconditionally on mount — `serviceWorker.ready` never
    // resolves if nothing has registered a worker yet, which left this
    // component stuck showing nothing on a fresh browser.
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => registration.pushManager.getSubscription())
      .then((sub) => setStatus(sub ? "subscribed" : "unsubscribed"))
      .catch(() => setStatus("unsubscribed"));
  }, []);

  if (status === "unsupported" || status === "unknown") return null;

  async function subscribe() {
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      alert("Notificaciones push no están configuradas todavía.");
      return;
    }

    const registration = await navigator.serviceWorker.register("/sw.js");
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });

    await savePushSubscription(subscription.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } });
    setStatus("subscribed");
  }

  async function unsubscribe() {
    const registration = await navigator.serviceWorker.register("/sw.js");
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await removePushSubscription(subscription.endpoint);
      await subscription.unsubscribe();
    }
    setStatus("unsubscribed");
  }

  return (
    <button
      type="button"
      onClick={status === "subscribed" ? unsubscribe : subscribe}
      className={`${buttonGhost} w-full justify-start`}
    >
      {status === "subscribed" ? (
        <>
          <Bell className="size-4" /> Notificaciones activas
        </>
      ) : (
        <>
          <BellOff className="size-4" /> Activar notificaciones
        </>
      )}
    </button>
  );
}
