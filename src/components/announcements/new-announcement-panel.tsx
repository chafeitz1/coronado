"use client";

import { useState } from "react";
import { SidePanel } from "@/components/ui/side-panel";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { createAnnouncement } from "@/app/actions/announcements";
import { buttonPrimary, input } from "@/lib/ui";
import { format, type Dictionary } from "@/lib/i18n/dictionaries";
import { isoDateOffset } from "@/lib/dates";

// Controlled fields (rather than an uncontrolled form + formRef.reset()) so
// a successful add can clear the form but stay open — same reasoning as
// NewPurchaseItemPanel: this is meant for posting several upcoming
// deliveries/visits back to back, not necessarily just one at a time.
export function NewAnnouncementPanel({ dict, onClose }: { dict: Dictionary; onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [startDate, setStartDate] = useState(isoDateOffset(0));
  const [endDate, setEndDate] = useState("");
  const [addedCount, setAddedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setError(null);
    const result = await createAnnouncement(null, formData);
    if (result?.ok) {
      setTitle("");
      setNotes("");
      setEndDate("");
      setAddedCount((n) => n + 1);
    } else if (result && !result.ok) {
      setError(result.error);
    }
  }

  return (
    <SidePanel open onClose={onClose} title={dict.announcements.addItem}>
      <form action={handleSubmit} className="space-y-4">
        <Field label={dict.announcements.titleLabel}>
          <input
            name="title"
            required
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={input}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label={dict.announcements.startDateLabel}>
            <input
              name="start_date"
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={input}
            />
          </Field>
          <Field label={dict.announcements.endDateLabel}>
            <input
              name="end_date"
              type="date"
              min={startDate}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={input}
            />
          </Field>
        </div>

        <Field label={dict.announcements.notesLabel}>
          <textarea name="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className={input} />
        </Field>

        {error && <p className="text-sm text-status-overdue-fg">{error}</p>}
        {addedCount > 0 && (
          <p className="text-sm text-status-done-fg">{format(dict.announcements.itemsAdded, { count: addedCount })}</p>
        )}

        <SubmitButton className={`w-full ${buttonPrimary}`} pendingLabel={dict.workOrderForm.submitPending}>
          {dict.announcements.addAnother}
        </SubmitButton>
      </form>
    </SidePanel>
  );
}
