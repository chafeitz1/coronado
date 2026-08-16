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
      className="size-4 rounded border-hairline accent-primary disabled:opacity-50"
      onChange={(e) => {
        const checked = e.target.checked;
        startTransition(() => {
          setNotificationPreference(userId, eventType, channel, checked);
        });
      }}
    />
  );
}
