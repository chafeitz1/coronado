"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Field } from "@/components/ui/field";
import { Avatar } from "@/components/ui/avatar";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { addExpense, deleteExpense } from "@/app/actions/payroll";
import { formatCurrency } from "@/lib/money";
import { formatLongDate, formatMonthYear } from "@/lib/dates";
import { buttonGhost, buttonSecondary, card, input, mutedText, pageHeading, sectionHeading } from "@/lib/ui";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Locale, PayrollSubcategory } from "@/lib/types/database";

export type PayrollExpense = {
  id: string;
  date: string;
  subcategory: PayrollSubcategory;
  amount: number;
  expected_amount: number | null;
  notes: string | null;
};

const SUBCATEGORIES: PayrollSubcategory[] = ["quincena", "decimo", "vacacion", "adelanto", "liquidacion"];

export function PayrollDetail({
  person,
  expenses,
  dict,
  locale,
}: {
  person: { id: string; full_name: string; avatar_url: string | null };
  expenses: PayrollExpense[];
  dict: Dictionary;
  locale: Locale;
}) {
  const subcategoryLabel: Record<PayrollSubcategory, string> = {
    quincena: dict.payroll.subcategoryQuincena,
    decimo: dict.payroll.subcategoryDecimo,
    vacacion: dict.payroll.subcategoryVacacion,
    adelanto: dict.payroll.subcategoryAdelanto,
    liquidacion: dict.payroll.subcategoryLiquidacion,
  };

  const totalExpected = expenses.reduce((sum, e) => sum + (e.expected_amount ?? 0), 0);
  const totalPaid = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalPending = totalExpected - totalPaid;

  const months = new Map<string, PayrollExpense[]>();
  for (const e of expenses) {
    const key = e.date.slice(0, 7);
    const list = months.get(key);
    if (list) list.push(e);
    else months.set(key, [e]);
  }
  const monthKeys = [...months.keys()].sort((a, b) => b.localeCompare(a));

  const [addingPayment, setAddingPayment] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleAddPayment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      await addExpense(person.id, formData);
      setAddingPayment(false);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Avatar fullName={person.full_name} avatarUrl={person.avatar_url} size="md" />
        <h1 className={pageHeading}>{person.full_name}</h1>
      </div>

      <div className={`grid grid-cols-3 divide-x divide-hairline ${card}`}>
        <SummaryStat label={dict.payroll.summaryExpected} value={formatCurrency(totalExpected)} />
        <SummaryStat label={dict.payroll.summaryPaid} value={formatCurrency(totalPaid)} />
        <SummaryStat
          label={dict.payroll.summaryPending}
          value={formatCurrency(totalPending)}
          warn={totalPending > 0.004}
        />
      </div>

      {addingPayment ? (
        <form onSubmit={handleAddPayment} className={`space-y-3 p-4 ${card}`}>
          <div className="flex flex-wrap gap-3">
            <Field label={dict.payroll.dateLabel}>
              <input type="date" name="date" required className={input} />
            </Field>
            <Field label={dict.payroll.subcategoryLabel}>
              <select name="subcategory" required defaultValue="quincena" className={input}>
                {SUBCATEGORIES.map((s) => (
                  <option key={s} value={s}>
                    {subcategoryLabel[s]}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="flex flex-wrap gap-3">
            <Field label={dict.payroll.amountLabel}>
              <input type="number" step="0.01" min="0" name="amount" required className={input} />
            </Field>
            <Field label={dict.payroll.expectedAmountLabel}>
              <input type="number" step="0.01" min="0" name="expected_amount" className={input} />
            </Field>
          </div>
          <Field label={dict.payroll.notesLabel}>
            <input name="notes" className={input} />
          </Field>
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={pending} className={buttonSecondary}>
              {pending ? dict.payroll.submitPending : dict.payroll.submit}
            </button>
            <button type="button" onClick={() => setAddingPayment(false)} className={buttonGhost}>
              {dict.vendorForm.cancel}
            </button>
          </div>
        </form>
      ) : (
        <button type="button" onClick={() => setAddingPayment(true)} className={buttonGhost}>
          + {dict.payroll.addPayment}
        </button>
      )}

      {monthKeys.length > 0 ? (
        <div className="space-y-5">
          {monthKeys.map((key) => {
            const rows = months.get(key)!;
            const monthTotal = rows.reduce((sum, e) => sum + e.amount, 0);
            return (
              <section key={key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <h2 className={sectionHeading}>{formatMonthYear(key, locale)}</h2>
                  <span className={mutedText}>{formatCurrency(monthTotal)}</span>
                </div>
                <ul className={card}>
                  {rows.map((e) => (
                    <li
                      key={e.id}
                      className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-hairline px-4 py-3 last:border-b-0"
                    >
                      <span className="w-24 shrink-0 text-sm text-ink-faint">{formatLongDate(e.date, locale)}</span>
                      <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-medium text-primary">
                        {subcategoryLabel[e.subcategory]}
                      </span>
                      <span className="ml-auto text-sm font-medium text-ink">{formatCurrency(e.amount)}</span>
                      {e.expected_amount !== null && (
                        <span className={mutedText}>/ {formatCurrency(e.expected_amount)}</span>
                      )}
                      {e.notes && <p className={`w-full ${mutedText}`}>{e.notes}</p>}
                      <form action={deleteExpense.bind(null, e.id, person.id)}>
                        <ConfirmSubmitButton confirmMessage={dict.payroll.deleteConfirm} className={buttonGhost}>
                          <Trash2 className="size-3.5" />
                        </ConfirmSubmitButton>
                      </form>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      ) : (
        <p className={mutedText}>{dict.payroll.empty}</p>
      )}
    </div>
  );
}

function SummaryStat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="p-4">
      <p className={sectionHeading}>{label}</p>
      <p className={`mt-1 text-lg font-semibold ${warn ? "text-status-overdue-fg" : "text-ink"}`}>{value}</p>
    </div>
  );
}
