"use client";

import { useState, useTransition } from "react";
import { Avatar } from "@/components/ui/avatar";
import { saveRegistroRow } from "@/app/actions/payroll-registro";
import { formatCurrency } from "@/lib/money";
import { buttonSecondary, card, input, mutedText } from "@/lib/ui";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Period } from "@/lib/payroll-accrual";

export type RegistroPerson = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  previousQuincena: number | null;
  registeredThisPeriod: number;
};

export function PayrollRegistroView({
  period,
  people,
  dict,
}: {
  period: Period;
  people: RegistroPerson[];
  dict: Dictionary;
}) {
  return (
    <div className="space-y-3">
      {people.map((person) => (
        <RegistroRow key={person.id} person={person} period={period} dict={dict} />
      ))}
    </div>
  );
}

function RegistroRow({ person, period, dict }: { person: RegistroPerson; period: Period; dict: Dictionary }) {
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    setSaved(false);
    startTransition(async () => {
      await saveRegistroRow(person.id, period, formData);
      form.reset();
      setSaved(true);
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`space-y-3 p-4 transition-colors focus-within:bg-primary-soft/30 ${card}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <Avatar fullName={person.full_name} avatarUrl={person.avatar_url} size="sm" />
          <span className="font-medium text-ink">{person.full_name}</span>
        </div>
        {person.registeredThisPeriod > 0.004 && (
          <span className={mutedText}>
            {dict.payroll.alreadyRegisteredLabel}: {formatCurrency(person.registeredThisPeriod)}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <label className="space-y-1">
          <span className="block text-xs text-ink-faint">{dict.payroll.subcategoryQuincena}</span>
          <input
            type="number"
            step="0.01"
            min="0"
            name="quincena"
            defaultValue={person.previousQuincena ?? undefined}
            placeholder="0.00"
            className={input}
          />
        </label>
        <label className="space-y-1">
          <span className="block text-xs text-ink-faint">{dict.payroll.subcategoryDecimo}</span>
          <input type="number" step="0.01" min="0" name="decimo" placeholder="0.00" className={input} />
        </label>
        <label className="space-y-1">
          <span className="block text-xs text-ink-faint">{dict.payroll.subcategoryVacacion}</span>
          <input type="number" step="0.01" min="0" name="vacacion" placeholder="0.00" className={input} />
        </label>
        <label className="space-y-1">
          <span className="block text-xs text-ink-faint">{dict.payroll.subcategoryAdelanto}</span>
          <input type="number" step="0.01" min="0" name="adelanto" placeholder="0.00" className={input} />
        </label>
      </div>

      <div className="flex items-center gap-2">
        <button type="submit" disabled={pending} className={buttonSecondary}>
          {pending ? dict.payroll.submitPending : dict.payroll.saveRow}
        </button>
        {saved && !pending && <span className={mutedText}>{dict.payroll.savedBanner}</span>}
      </div>
    </form>
  );
}
