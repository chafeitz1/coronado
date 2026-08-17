"use client";

import { useState } from "react";
import { Repeat } from "lucide-react";
import { Field } from "@/components/ui/field";
import { input } from "@/lib/ui";

export function RecurrenceFields() {
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
        Repetir esta tarea automáticamente
      </label>

      {enabled && (
        <div className="grid grid-cols-2 gap-4 pt-1">
          <Field label="Repetir cada">
            <input
              type="number"
              name="recurrence_interval_value"
              min={1}
              defaultValue={3}
              required
              className={input}
            />
          </Field>
          <Field label="Unidad">
            <select name="recurrence_interval_unit" defaultValue="months" className={input}>
              <option value="days">Días</option>
              <option value="weeks">Semanas</option>
              <option value="months">Meses</option>
              <option value="years">Años</option>
            </select>
          </Field>
        </div>
      )}
    </div>
  );
}
