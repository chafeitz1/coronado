"use client";

import { useState } from "react";
import { SidePanel } from "@/components/ui/side-panel";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { createRoutineItem, updateRoutineItem, deleteRoutineItem } from "@/app/actions/routine";
import { buttonGhost, buttonPrimary, buttonSecondary, card, input, mutedText } from "@/lib/ui";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { RoutineItem } from "./types";

// Owner-only: add/edit/delete the fixed timeline staff see read-only in
// RoutineTimeline. No useActionState/panel-close-on-success plumbing here
// since there's nowhere to redirect to — this closes its own inline form
// and lets the parent's revalidated data (via each action's
// revalidatePath("/")) flow back down as fresh props.
export function RoutineEditorPanel({
  items,
  dict,
  onClose,
}: {
  items: RoutineItem[];
  dict: Dictionary;
  onClose: () => void;
}) {
  const [editingId, setEditingId] = useState<string | "new" | null>(null);

  return (
    <SidePanel open onClose={onClose} title={dict.routine.editTitle}>
      <div className="space-y-3">
        {items.length > 0 && (
          <ul className={`divide-y divide-hairline overflow-hidden ${card}`}>
            {items.map((item) =>
              editingId === item.id ? (
                <li key={item.id} className="p-4">
                  <RoutineItemForm item={item} dict={dict} onDone={() => setEditingId(null)} />
                </li>
              ) : (
                <li key={item.id} className="flex items-center gap-3 p-4">
                  <span className="w-14 shrink-0 font-mono text-sm text-ink-muted">{item.time.slice(0, 5)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{item.title}</p>
                    {item.steps && <p className={`truncate text-xs ${mutedText}`}>{item.steps}</p>}
                  </div>
                  <button type="button" onClick={() => setEditingId(item.id)} className={buttonGhost}>
                    {dict.workOrderDetail.edit}
                  </button>
                  <form action={deleteRoutineItem.bind(null, item.id)}>
                    <ConfirmSubmitButton confirmMessage={dict.routine.deleteConfirm} className={buttonGhost}>
                      {dict.workOrderDetail.delete}
                    </ConfirmSubmitButton>
                  </form>
                </li>
              )
            )}
          </ul>
        )}

        {editingId === "new" ? (
          <div className={`p-4 ${card}`}>
            <RoutineItemForm dict={dict} onDone={() => setEditingId(null)} />
          </div>
        ) : (
          <button type="button" onClick={() => setEditingId("new")} className={`w-full ${buttonSecondary}`}>
            + {dict.routine.addItem}
          </button>
        )}
      </div>
    </SidePanel>
  );
}

function RoutineItemForm({ item, dict, onDone }: { item?: RoutineItem; dict: Dictionary; onDone: () => void }) {
  async function action(formData: FormData) {
    if (item) await updateRoutineItem(item.id, formData);
    else await createRoutineItem(formData);
    onDone();
  }

  return (
    <form action={action} className="space-y-3">
      <Field label={dict.routine.timeLabel}>
        <input type="time" name="time" required defaultValue={item?.time.slice(0, 5)} className={input} />
      </Field>
      <Field label={dict.routine.itemTitleLabel}>
        <input type="text" name="title" required defaultValue={item?.title} className={input} />
      </Field>
      <Field label={dict.routine.stepsLabel}>
        <textarea name="steps" rows={3} defaultValue={item?.steps ?? ""} className={input} />
      </Field>
      <div className="flex items-center gap-2">
        <SubmitButton className={`flex-1 ${buttonPrimary}`} pendingLabel={dict.workOrderForm.submitPending}>
          {dict.workOrderForm.submitEdit}
        </SubmitButton>
        <button type="button" onClick={onDone} className={buttonGhost}>
          {dict.workOrderDetail.cancel}
        </button>
      </div>
    </form>
  );
}
