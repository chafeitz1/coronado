"use client";

import { useActionState, useEffect } from "react";
import { SidePanel } from "@/components/ui/side-panel";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { inviteMember } from "@/app/actions/admin";
import { buttonPrimary, input } from "@/lib/ui";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export function InvitePanel({ dict, onClose }: { dict: Dictionary; onClose: () => void }) {
  const [state, action] = useActionState(inviteMember, null);

  useEffect(() => {
    if (state?.ok) onClose();
  }, [state, onClose]);

  return (
    <SidePanel open onClose={onClose} title={dict.directory.inviteSomeone}>
      <form action={action} className="space-y-4">
        <Field label={dict.directory.nameLabel}>
          <input name="full_name" required className={input} />
        </Field>
        <Field label={dict.directory.emailLabel}>
          <input type="email" name="email" required className={input} />
        </Field>
        <Field label={dict.directory.phoneLabel}>
          <input name="phone" placeholder={dict.vendorForm.contactPhonePlaceholder} className={input} />
        </Field>
        <Field label={dict.directory.roleLabel}>
          <select name="role" defaultValue="staff" className={input}>
            <option value="staff">{dict.directory.staffOption}</option>
            <option value="resident">{dict.directory.residentOption}</option>
            <option value="owner">{dict.directory.ownerOption}</option>
          </select>
        </Field>

        <label className="flex items-center gap-2 text-sm text-ink-secondary">
          <input
            type="checkbox"
            name="send_invite"
            defaultChecked
            className="size-4 rounded border-hairline accent-primary"
          />
          {dict.directory.sendInviteNow}
        </label>

        {state && !state.ok && <p className="text-sm text-status-overdue-fg">{state.error}</p>}

        <SubmitButton className={`w-full ${buttonPrimary}`} pendingLabel={dict.directory.sendInvitePending}>
          {dict.directory.sendInvite}
        </SubmitButton>
      </form>
    </SidePanel>
  );
}
