"use client";

import { useActionState, useRef, useState } from "react";
import { Camera } from "lucide-react";
import { uploadAvatar } from "@/app/actions/profile";
import { Avatar } from "@/components/ui/avatar";
import { SubmitButton } from "@/components/ui/submit-button";
import { buttonSecondary } from "@/lib/ui";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export function AvatarForm({
  fullName,
  avatarUrl,
  dict,
}: {
  fullName: string;
  avatarUrl: string | null;
  dict: Dictionary;
}) {
  const [state, action] = useActionState(uploadAvatar, undefined);
  const [preview, setPreview] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <form ref={formRef} action={action} className="flex items-center gap-4">
      <Avatar fullName={fullName} avatarUrl={preview ?? avatarUrl} size="lg" />

      <div className="space-y-2">
        <input
          ref={inputRef}
          name="avatar"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          required
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) setPreview(URL.createObjectURL(file));
          }}
        />
        <button type="button" onClick={() => inputRef.current?.click()} className={buttonSecondary}>
          <Camera className="size-4" /> {dict.avatarForm.choosePhoto}
        </button>
        <SubmitButton className={buttonSecondary} pendingLabel={dict.avatarForm.uploadPending}>
          {dict.avatarForm.uploadPhoto}
        </SubmitButton>
        {state?.error && <p className="text-sm text-status-overdue-fg">{state.error}</p>}
      </div>
    </form>
  );
}
