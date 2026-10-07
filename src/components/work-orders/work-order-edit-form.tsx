"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { updateWorkOrder } from "@/app/actions/work-orders";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Combobox } from "@/components/ui/combobox";
import { RecurrenceFields } from "@/components/recurrence-fields";
import { buttonGhost, buttonPrimary, card, input, mutedText, pageHeading } from "@/lib/ui";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { IntervalUnit } from "@/lib/types/database";

type Options = {
  assets: { id: string; name: string }[];
  staff: { id: string; full_name: string }[];
  vendors: { id: string; name: string }[];
};

type EditableWorkOrder = {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  asset_id: string | null;
  assigned_to: string | null;
  vendor_id: string | null;
  video_url: string | null;
  recurrence_interval_value: number | null;
  recurrence_interval_unit: string | null;
};

// Renders in place of WorkOrderDetailContent's read view when its "Editar"
// menu item is clicked — same fields the old standalone /edit page had, but
// closing back to the detail view on save instead of navigating, so it
// works identically inside WorkOrderPanel's side panel and on the
// standalone [id] page. Options (assets/staff/vendors) are fetched on open
// rather than passed down, same as NewWorkOrderPanel.
export function WorkOrderEditForm({
  workOrder,
  dict,
  onClose,
}: {
  workOrder: EditableWorkOrder;
  dict: Dictionary;
  onClose: () => void;
}) {
  const router = useRouter();
  const [options, setOptions] = useState<Options | null>(null);
  const [state, action] = useActionState(updateWorkOrder.bind(null, workOrder.id), null);

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
    <div className={`space-y-5 p-5 ${card}`}>
      <h1 className={pageHeading}>{dict.workOrderForm.editTitle}</h1>
      {options ? (
        <form action={action} className="space-y-5">
          <input
            name="title"
            required
            defaultValue={workOrder.title}
            placeholder={dict.workOrderForm.titleLabel + "... *"}
            className="w-full border-0 border-b-2 border-hairline bg-transparent px-0 py-2 text-lg font-semibold text-ink outline-none placeholder:text-ink-faint focus:border-primary"
          />

          <Field label={dict.workOrderForm.descriptionLabel}>
            <textarea name="description" rows={3} defaultValue={workOrder.description ?? ""} className={input} />
          </Field>

          <Field label={dict.workOrderForm.dueDateLabel}>
            <input type="date" name="due_date" defaultValue={workOrder.due_date ?? ""} className={input} />
          </Field>

          <Field label={dict.workOrderForm.assetLabel}>
            <Combobox
              name="asset_id"
              placeholder={dict.workOrderForm.startTyping}
              noResultsLabel={dict.workOrderForm.noOptions}
              defaultValue={workOrder.asset_id ?? undefined}
              options={options.assets.map((a) => ({ value: a.id, label: a.name }))}
            />
          </Field>

          <Field label={dict.workOrderForm.assignLabel}>
            <Combobox
              name="assigned_to"
              placeholder={dict.workOrderForm.startTyping}
              noResultsLabel={dict.workOrderForm.noOptions}
              defaultValue={workOrder.assigned_to ?? undefined}
              options={options.staff.map((s) => ({ value: s.id, label: s.full_name }))}
            />
          </Field>

          <Field label={dict.workOrderForm.vendorLabel}>
            <Combobox
              name="vendor_id"
              placeholder={dict.workOrderForm.startTyping}
              noResultsLabel={dict.workOrderForm.noOptions}
              defaultValue={workOrder.vendor_id ?? undefined}
              options={options.vendors.map((v) => ({ value: v.id, label: v.name }))}
            />
          </Field>

          <Field label={dict.workOrderForm.videoUrlLabel}>
            <input
              type="url"
              name="video_url"
              defaultValue={workOrder.video_url ?? ""}
              placeholder="https://youtube.com/..."
              className={input}
            />
          </Field>

          <RecurrenceFields
            dict={dict}
            defaultEnabled={!!workOrder.recurrence_interval_value}
            defaultValue={workOrder.recurrence_interval_value ?? 3}
            defaultUnit={(workOrder.recurrence_interval_unit as IntervalUnit) ?? "months"}
          />
          <p className={mutedText}>{dict.workOrderForm.recurrenceHint}</p>

          {state && !state.ok && <p className="text-sm text-status-overdue-fg">{state.error}</p>}

          <div className="flex items-center gap-2">
            <SubmitButton className={`flex-1 ${buttonPrimary}`} pendingLabel={dict.workOrderForm.submitPending}>
              {dict.workOrderForm.submitEdit}
            </SubmitButton>
            <button type="button" onClick={onClose} className={buttonGhost}>
              {dict.workOrderDetail.cancel}
            </button>
          </div>
        </form>
      ) : (
        <div className="animate-pulse space-y-3">
          <div className="h-8 w-2/3 rounded bg-canvas-soft" />
          <div className="h-24 rounded bg-canvas-soft" />
          <div className="h-9 rounded bg-canvas-soft" />
        </div>
      )}
    </div>
  );
}
