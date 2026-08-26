"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Field } from "@/components/ui/field";
import { Avatar } from "@/components/ui/avatar";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { addExpense, deleteExpense } from "@/app/actions/payroll";
import { formatCurrency } from "@/lib/money";
import { formatLongDate, formatMonthYear } from "@/lib/dates";
import {
  DECIMO_MONTHLY_RATE,
  VACATION_MONTHLY_RATE,
  accrualPeriodStart,
  computeAccrual,
  type SalaryEntry,
} from "@/lib/payroll-accrual";
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
  hireDate,
  terminationDate,
  salaryHistory,
  dict,
  locale,
}: {
  person: { id: string; full_name: string; avatar_url: string | null };
  expenses: PayrollExpense[];
  hireDate: string | null;
  terminationDate: string | null;
  salaryHistory: SalaryEntry[];
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

  // Quincena keeps the esperado/pagado/pendiente shape — décimo and
  // vacación get their own accrual cards below instead, so mixing their
  // expected_amount in here would double-count against those.
  const quincenaEntries = expenses.filter((e) => e.subcategory === "quincena");
  const quincenaPaid = quincenaEntries.reduce((sum, e) => sum + e.amount, 0);
  const quincenaWithExpected = quincenaEntries.filter((e) => e.expected_amount !== null);
  const quincenaExpected = quincenaWithExpected.reduce((sum, e) => sum + (e.expected_amount ?? 0), 0);
  const quincenaPending = quincenaExpected - quincenaWithExpected.reduce((sum, e) => sum + e.amount, 0);

  const asOf = terminationDate ?? new Date().toISOString().slice(0, 10);
  const decimoAccrual = getAccrualStat(expenses, "decimo", hireDate, asOf, salaryHistory, DECIMO_MONTHLY_RATE);
  const vacacionAccrual = getAccrualStat(expenses, "vacacion", hireDate, asOf, salaryHistory, VACATION_MONTHLY_RATE);

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

      <div className="space-y-3">
        <h2 className={sectionHeading}>{dict.payroll.quincenaTitle}</h2>
        <div className={`grid grid-cols-3 divide-x divide-hairline ${card}`}>
          <SummaryStat label={dict.payroll.summaryExpected} value={formatCurrency(quincenaExpected)} />
          <SummaryStat label={dict.payroll.summaryPaid} value={formatCurrency(quincenaPaid)} />
          <SummaryStat
            label={dict.payroll.summaryPending}
            value={formatCurrency(quincenaPending)}
            warn={quincenaPending > 0.004}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <AccrualCard title={dict.payroll.decimoTitle} stat={decimoAccrual} dict={dict} locale={locale} />
        <AccrualCard title={dict.payroll.vacacionTitle} stat={vacacionAccrual} dict={dict} locale={locale} />
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

type AccrualStat = { accrued: number; lastPaid: string | null };

function getAccrualStat(
  expenses: PayrollExpense[],
  subcategory: PayrollSubcategory,
  hireDate: string | null,
  asOf: string,
  salaryHistory: SalaryEntry[],
  monthlyRate: number
): AccrualStat {
  const paymentDates = expenses.filter((e) => e.subcategory === subcategory).map((e) => e.date);
  const periodStart = accrualPeriodStart(paymentDates, hireDate);
  const lastPaid = paymentDates.length > 0 ? paymentDates.reduce((a, b) => (b > a ? b : a)) : null;
  if (!periodStart) return { accrued: 0, lastPaid };
  return { accrued: computeAccrual(periodStart, asOf, salaryHistory, monthlyRate), lastPaid };
}

function AccrualCard({
  title,
  stat,
  dict,
  locale,
}: {
  title: string;
  stat: AccrualStat;
  dict: Dictionary;
  locale: Locale;
}) {
  return (
    <div className={`space-y-3 p-4 ${card}`}>
      <h3 className="text-sm font-medium text-ink">{title}</h3>
      <div className="flex items-baseline justify-between">
        <span className={mutedText}>{dict.payroll.accruedLabel}</span>
        <span className="text-lg font-semibold text-ink">{formatCurrency(stat.accrued)}</span>
      </div>
      <div className="flex items-baseline justify-between">
        <span className={mutedText}>{dict.payroll.lastPaidLabel}</span>
        <span className="text-sm text-ink-secondary">
          {stat.lastPaid ? formatLongDate(stat.lastPaid, locale) : dict.payroll.neverPaid}
        </span>
      </div>
    </div>
  );
}
