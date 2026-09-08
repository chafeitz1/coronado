"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SidePanel } from "@/components/ui/side-panel";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Combobox } from "@/components/ui/combobox";
import { PhotoDropzone } from "@/components/ui/photo-dropzone";
import { RecurrenceFields } from "@/components/recurrence-fields";
import { createWorkOrderPanel } from "@/app/actions/work-orders";
import { buttonPrimary, input, mutedText } from "@/lib/ui";
import type { Dictionary } from "@/lib/i18n/dictionaries";

type Options = {
  assets: { id: string; name: string }[];
  staff: { id: string; full_name: string }[];
  vendors: { id: string; name: string }[];
};

// The full /work-orders/new form (asset picker included, unlike the
// asset-scoped NewMaintenanceTaskPanel), opened as a side panel instead of
// navigating to a separate route — for List/Calendar/Board view, which take
// over the whole page and have no split detail column to render that route
// into, so navigating there would drop the current ?display= and bounce
// back to the To Do split view. Options (assets/staff/vendors) are fetched
// on open rather than passed down from the layout, since most page loads
// never open this panel.
export function NewWorkOrderPanel({ dict, isOwner, onClose }: { dict: Dictionary; isOwner: boolean; onClose: () => void }) {
  const router = useRouter();
  const [options, setOptions] = useState<Options | null>(null);
  const [state, action] = useActionState(createWorkOrderPanel, null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/work-orders/new-options")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("failed to load"))))
      .then((json: Options) => {
        if (!cancelled) setOptions(json);
      })
      .catch(() => {
        if (!cancelled) setOptions({ assets: [], staff: [], vendors: [] });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (state?.ok) {
      router.refresh();
      onClose();
    }
  }, [state, router, onClose]);

  return (
    <SidePanel open onClose={onClose} title={dict.workOrders.newTask}>
      {options ? (
        <form action={action} className="space-y-5">
          <input
            name="title"
            required
            placeholder={dict.workOrderForm.titleLabel + "... *"}
            className="w-full border-0 border-b-2 border-hairline bg-transparent px-0 py-2 text-lg font-semibold text-ink outline-none placeholder:text-ink-faint focus:border-primary"
          />

          <PhotoDropzone name="photo" label={dict.workOrderForm.addPhoto} />

          <Field label={dict.workOrderForm.descriptionLabel}>
            <textarea name="description" rows={3} className={input} />
          </Field>

          <Field label={dict.workOrderForm.dueDateLabel}>
            <input type="date" name="due_date" className={input} />
          </Field>

          <Field label={dict.workOrderForm.assetLabel}>
            <Combobox
              name="asset_id"
              placeholder={dict.workOrderForm.startTyping}
              noResultsLabel={dict.workOrderForm.noOptions}
              options={options.assets.map((a) => ({ value: a.id, label: a.name }))}
            />
          </Field>

          {isOwner && (
            <>
              <Field label={dict.workOrderForm.assignLabel}>
                <Combobox
                  name="assigned_to"
                  placeholder={dict.workOrderForm.startTyping}
                  noResultsLabel={dict.workOrderForm.noOptions}
                  options={options.staff.map((s) => ({ value: s.id, label: s.full_name }))}
                />
              </Field>

              <Field label={dict.workOrderForm.vendorLabel}>
                <Combobox
                  name="vendor_id"
                  placeholder={dict.workOrderForm.startTyping}
                  noResultsLabel={dict.workOrderForm.noOptions}
                  options={options.vendors.map((v) => ({ value: v.id, label: v.name }))}
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
      ) : (
        <div className="animate-pulse space-y-3">
          <div className="h-8 w-2/3 rounded bg-canvas-soft" />
          <div className="h-24 rounded bg-canvas-soft" />
          <div className="h-9 rounded bg-canvas-soft" />
        </div>
      )}
    </SidePanel>
  );
}
