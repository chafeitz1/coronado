"use client";

import { useState } from "react";
import { Repeat } from "lucide-react";
import { Field } from "@/components/ui/field";
import { input } from "@/lib/ui";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export function RecurrenceFields({ dict }: { dict: Dictionary }) {
  const [enabled, setEnabled] = useState(false);

  return (
    <div className="space-y-3 rounded-lg border border-hairline p-3">
      <label className="flex items-center gap-2 text-sm font-medium text-ink-secondary">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="size-4 rounded border-hairline accent-primary"
        />
        <Repeat className="size-4 text-ink-faint" />
        {dict.workOrderForm.repeatLabel}
      </label>

      {enabled && (
        <div className="grid grid-cols-2 gap-4 pt-1">
          <Field label={dict.workOrderForm.repeatEvery}>
            <input
              type="number"
              name="recurrence_interval_value"
              min={1}
              defaultValue={3}
              required
              className={input}
            />
          </Field>
          <Field label={dict.workOrderForm.unitLabel}>
            <select name="recurrence_interval_unit" defaultValue="months" className={input}>
              <option value="days">{dict.workOrderForm.unitDays}</option>
              <option value="weeks">{dict.workOrderForm.unitWeeks}</option>
              <option value="months">{dict.workOrderForm.unitMonths}</option>
              <option value="years">{dict.workOrderForm.unitYears}</option>
            </select>
          </Field>
        </div>
      )}
    </div>
  );
}
