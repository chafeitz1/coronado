"use client";

import { useActionState, useEffect } from "react";
import { SidePanel } from "@/components/ui/side-panel";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Combobox } from "@/components/ui/combobox";
import { PhotoDropzone } from "@/components/ui/photo-dropzone";
import { RecurrenceFields } from "@/components/recurrence-fields";
import { createMaintenanceTask } from "@/app/actions/work-orders";
import { buttonPrimary, input, mutedText } from "@/lib/ui";
import type { Dictionary } from "@/lib/i18n/dictionaries";

// Same fields as the standalone /work-orders/new form, minus the asset
// picker — the asset is already fixed to whichever one this panel was
// opened from — so maintenance done by a vendor gets logged without
// leaving the asset's page.
export function NewMaintenanceTaskPanel({
  assetId,
  vendors,
  staff,
  isOwner,
  dict,
  onClose,
}: {
  assetId: string;
  vendors: { id: string; name: string }[];
  staff: { id: string; full_name: string }[];
  isOwner: boolean;
  dict: Dictionary;
  onClose: () => void;
}) {
  const [state, action] = useActionState(createMaintenanceTask.bind(null, assetId), null);

  useEffect(() => {
    if (state?.ok) onClose();
  }, [state, onClose]);

  return (
    <SidePanel open onClose={onClose} title={dict.assetDetail.newMaintenanceTask}>
      <form action={action} className="space-y-4">
        <Field label={dict.workOrderForm.titleLabel}>
          <input name="title" required className={input} />
        </Field>

        <PhotoDropzone name="photo" label={dict.workOrderForm.addPhoto} />

        <Field label={dict.workOrderForm.descriptionLabel}>
          <textarea name="description" rows={3} className={input} />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label={dict.workOrderForm.priorityLabel}>
            <select name="priority" defaultValue="medium" className={input}>
              <option value="low">{dict.priorities.low}</option>
              <option value="medium">{dict.priorities.medium}</option>
              <option value="high">{dict.priorities.high}</option>
            </select>
          </Field>

          <Field label={dict.workOrderForm.dueDateLabel}>
            <input type="date" name="due_date" className={input} />
          </Field>
        </div>

        {isOwner && (
          <>
            <Field label={dict.workOrderForm.assignLabel}>
              <Combobox
                name="assigned_to"
                placeholder={dict.workOrderForm.startTyping}
                noResultsLabel={dict.workOrderForm.noOptions}
                options={staff.map((s) => ({ value: s.id, label: s.full_name }))}
              />
            </Field>

            <Field label={dict.workOrderForm.vendorLabel}>
              <Combobox
                name="vendor_id"
                placeholder={dict.workOrderForm.startTyping}
                noResultsLabel={dict.workOrderForm.noOptions}
                options={vendors.map((v) => ({ value: v.id, label: v.name }))}
              />
            </Field>

            <RecurrenceFields dict={dict} />
            <p className={mutedText}>{dict.workOrderForm.recurrenceHint}</p>
          </>
        )}

        {state && !state.ok && <p className="text-sm text-status-overdue-fg">{state.error}</p>}

        <SubmitButton className={`w-full ${buttonPrimary}`} pendingLabel={dict.workOrderForm.submitPending}>
          {dict.workOrderForm.submit}
        </SubmitButton>
      </form>
    </SidePanel>
  );
}
