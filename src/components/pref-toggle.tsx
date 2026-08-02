"use client";

import { useTransition } from "react";
import { setNotificationPreference } from "@/app/actions/admin";
import type { NotificationChannel, NotificationEventType } from "@/lib/types/database";

export function PrefToggle({
  userId,
  eventType,
  channel,
  defaultEnabled,
}: {
  userId: string;
  eventType: NotificationEventType;
  channel: NotificationChannel;
  defaultEnabled: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <input
      type="checkbox"
      defaultChecked={defaultEnabled}
      disabled={isPending}
      onChange={(e) => {
        const checked = e.target.checked;
        startTransition(() => {
          setNotificationPreference(userId, eventType, channel, checked);
        });
      }}
    />
  );
}
