"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Field } from "@/components/ui/field";
import { Avatar } from "@/components/ui/avatar";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { addExpense, deleteExpense } from "@/app/actions/payroll";
import { PayrollLoansSection, type Loan } from "@/components/payroll-loans-section";
import { formatCurrency } from "@/lib/money";
import { formatLongDate, formatMonthYear } from "@/lib/dates";
import {
  computeDecimoAccrual,
  computeVacationAccrual,
  computePrimaAntiguedadAccrual,
  decimoSegmentStart,
  periodFromDateString,
  periodOrdinal,
  periodRepresentativeDate,
  quincenaTotal,
  type Period,
  type PayrollEntryLike,
} from "@/lib/payroll-accrual";
import { buttonGhost, buttonSecondary, card, input, mutedText, pageHeading, sectionHeading } from "@/lib/ui";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Locale, PayrollSubcategory } from "@/lib/types/database";

// adelanto/liquidación only now — quincena/décimo/vacación/prima are
// captured in Registro (payroll_entries), not this flat event log.
export type PayrollExpense = {
  id: string;
  date: string;
  subcategory: PayrollSubcategory;
  amount: number;
  notes: string | null;
};

export type PayrollEntryRecord = PayrollEntryLike & { id: string; period: Period };

export type SalaryHistoryEntry = { salary: number; effective_date: string };

const SUBCATEGORIES: PayrollSubcategory[] = ["adelanto", "liquidacion"];

export function PayrollDetail({
  person,
  expenses,
  entries,
  hireDate,
  terminationDate,
  salaryHistory,
  loans,
  dict,
  locale,
}: {
  person: { id: string; full_name: string; avatar_url: string | null };
  expenses: PayrollExpense[];
  entries: PayrollEntryRecord[];
  hireDate: string | null;
  terminationDate: string | null;
  salaryHistory: SalaryHistoryEntry[];
  loans: Loan[];
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

  const quincenaTotalPaid = entries.reduce((sum, e) => sum + quincenaTotal(e), 0);
  const lastEntryPeriod = entries.reduce<Period | null>((latest, e) => {
    if (!latest) return e.period;
    return periodOrdinal(e.period.year, e.period.month, e.period.half) > periodOrdinal(latest.year, latest.month, latest.half)
      ? e.period
      : latest;
  }, null);

  const asOfDate = terminationDate ?? new Date().toISOString().slice(0, 10);
  const asOfPeriod = periodFromDateString(asOfDate);
  const currentSalary = salaryHistory[0]?.salary ?? 0;
  const decimoStat = asOfPeriod ? getDecimoStat(entries, expenses, asOfPeriod) : null;
  const vacacionStat = asOfPeriod ? getVacacionStat(entries, expenses, asOfPeriod) : null;
  const primaStat = asOfPeriod ? getPrimaStat(expenses, hireDate, currentSalary, asOfPeriod) : null;

  const timelineItems: { id: string; date: string; label: string; amount: number; deletable: boolean }[] = [];
  for (const e of entries) {
    const date = periodRepresentativeDate(e.period);
    const total = quincenaTotal(e);
    if (total !== 0) timelineItems.push({ id: `${e.id}-q`, date, label: dict.payroll.subcategoryQuincena, amount: total, deletable: false });
    if (e.decimo_paid !== 0) timelineItems.push({ id: `${e.id}-d`, date, label: dict.payroll.subcategoryDecimo, amount: e.decimo_paid, deletable: false });
    if (e.vacation_paid !== 0) timelineItems.push({ id: `${e.id}-v`, date, label: dict.payroll.subcategoryVacacion, amount: e.vacation_paid, deletable: false });
    if (e.prima_paid !== 0) timelineItems.push({ id: `${e.id}-p`, date, label: dict.payroll.primaTitle, amount: e.prima_paid, deletable: false });
  }
  for (const e of expenses) {
    timelineItems.push({ id: e.id, date: e.date, label: subcategoryLabel[e.subcategory], amount: e.amount, deletable: true });
  }

  const months = new Map<string, typeof timelineItems>();
  for (const item of timelineItems) {
    const key = item.date.slice(0, 7);
    const list = months.get(key);
    if (list) list.push(item);
    else months.set(key, [item]);
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
        <div className={`grid grid-cols-2 divide-x divide-hairline ${card}`}>
          <SummaryStat label={dict.payroll.summaryPaid} value={formatCurrency(quincenaTotalPaid)} />
          <SummaryStat
            label={dict.payroll.lastPaidLabel}
            value={lastEntryPeriod ? formatLongDate(periodRepresentativeDate(lastEntryPeriod), locale) : dict.payroll.neverPaid}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {decimoStat && (
          <div className={`space-y-3 p-4 ${card}`}>
            <h3 className="text-sm font-medium text-ink">{dict.payroll.decimoTitle}</h3>
            <StatLine label={dict.payroll.accruedLabel} value={formatCurrency(decimoStat.accrued)} />
            <StatLine label={dict.payroll.summaryPaid} value={formatCurrency(decimoStat.paid)} />
            <StatLine
              label={dict.payroll.summaryPending}
              value={formatCurrency(decimoStat.pending)}
              warn={decimoStat.pending > 0.004}
            />
          </div>
        )}
        {vacacionStat && (
          <div className={`space-y-3 p-4 ${card}`}>
            <h3 className="text-sm font-medium text-ink">{dict.payroll.vacacionTitle}</h3>
            <StatLine label={dict.payroll.accruedLabel} value={formatCurrency(vacacionStat.accrued)} />
            <StatLine
              label={dict.payroll.lastPaidLabel}
              value={vacacionStat.lastPaid ? formatLongDate(vacacionStat.lastPaid, locale) : dict.payroll.neverPaid}
            />
          </div>
        )}
        {primaStat && (
          <div className={`space-y-3 p-4 ${card}`}>
            <h3 className="text-sm font-medium text-ink">{dict.payroll.primaTitle}</h3>
            <StatLine label={dict.payroll.accruedLabel} value={formatCurrency(primaStat.accrued)} />
            <StatLine
              label={dict.payroll.accrualSinceLabel}
              value={primaStat.since ? formatLongDate(primaStat.since, locale) : "—"}
            />
          </div>
        )}
      </div>

      <PayrollLoansSection personId={person.id} loans={loans} dict={dict} locale={locale} />

      {addingPayment ? (
        <form onSubmit={handleAddPayment} className={`space-y-3 p-4 ${card}`}>
          <div className="flex flex-wrap gap-3">
            <Field label={dict.payroll.dateLabel}>
              <input type="date" name="date" required className={input} />
            </Field>
            <Field label={dict.payroll.subcategoryLabel}>
              <select name="subcategory" required defaultValue="adelanto" className={input}>
                {SUBCATEGORIES.map((s) => (
                  <option key={s} value={s}>
                    {subcategoryLabel[s]}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label={dict.payroll.amountLabel}>
            <input type="number" step="0.01" min="0" name="amount" required className={input} />
          </Field>
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
            const rows = [...months.get(key)!].sort((a, b) => (a.date < b.date ? 1 : -1));
            const monthTotal = rows.reduce((sum, e) => sum + e.amount, 0);
            return (
              <section key={key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <h2 className={sectionHeading}>{formatMonthYear(key, locale)}</h2>
                  <span className={mutedText}>{formatCurrency(monthTotal)}</span>
                </div>
                <ul className={card}>
                  {rows.map((item) => (
                    <li
                      key={item.id}
                      className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-hairline px-4 py-3 last:border-b-0"
                    >
                      <span className="w-24 shrink-0 text-sm text-ink-faint">{formatLongDate(item.date, locale)}</span>
                      <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-medium text-primary">
                        {item.label}
                      </span>
                      <span className="ml-auto text-sm font-medium text-ink">{formatCurrency(item.amount)}</span>
                      {item.deletable && (
                        <form action={deleteExpense.bind(null, item.id, person.id)}>
                          <ConfirmSubmitButton confirmMessage={dict.payroll.deleteConfirm} className={buttonGhost}>
                            <Trash2 className="size-3.5" />
                          </ConfirmSubmitButton>
                        </form>
                      )}
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

function StatLine({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className={mutedText}>{label}</span>
      <span className={`text-sm font-semibold ${warn ? "text-status-overdue-fg" : "text-ink"}`}>{value}</span>
    </div>
  );
}

function makeEntryLookup(entries: PayrollEntryRecord[]): (p: Period) => number {
  const byOrdinal = new Map<number, number>();
  for (const e of entries) {
    const ord = periodOrdinal(e.period.year, e.period.month, e.period.half);
    byOrdinal.set(ord, (byOrdinal.get(ord) ?? 0) + quincenaTotal(e));
  }
  return (p) => byOrdinal.get(periodOrdinal(p.year, p.month, p.half)) ?? 0;
}

function latestDate(dates: string[]): string | null {
  return dates.length > 0 ? dates.reduce((a, b) => (b > a ? b : a)) : null;
}

// Décimo accrues on a fixed legal calendar segment regardless of payment
// history, so "pendiente" nets the segment total against whatever décimo
// was already paid in THIS segment — and treats a liquidación inside the
// segment as settling it in full, since a liquidación is a combined payout
// of whatever's accrued.
function getDecimoStat(entries: PayrollEntryRecord[], expenses: PayrollExpense[], asOf: Period) {
  const lookup = makeEntryLookup(entries);
  const accrued = computeDecimoAccrual(lookup, asOf);
  const segmentStart = decimoSegmentStart(asOf);
  const segmentStartOrd = periodOrdinal(segmentStart.year, segmentStart.month, segmentStart.half);
  const asOfOrd = periodOrdinal(asOf.year, asOf.month, asOf.half);
  const inSegment = (ord: number) => ord >= segmentStartOrd && ord <= asOfOrd;
  const paidDirectly = entries
    .filter((e) => inSegment(periodOrdinal(e.period.year, e.period.month, e.period.half)))
    .reduce((s, e) => s + e.decimo_paid, 0);
  const settledByLiquidacion = expenses.some((e) => {
    if (e.subcategory !== "liquidacion") return false;
    const p = periodFromDateString(e.date);
    return p ? inSegment(periodOrdinal(p.year, p.month, p.half)) : false;
  });
  const paid = settledByLiquidacion ? accrued : paidDirectly;
  return { accrued, paid, pending: Math.max(0, accrued - paid) };
}

function getVacacionStat(entries: PayrollEntryRecord[], expenses: PayrollExpense[], asOf: Period) {
  const lookup = makeEntryLookup(entries);
  const realPeriods = entries.map((e) => e.period);

  let lastPayout: Period | null = null;
  const consider = (p: Period) => {
    if (!lastPayout || periodOrdinal(p.year, p.month, p.half) > periodOrdinal(lastPayout.year, lastPayout.month, lastPayout.half)) {
      lastPayout = p;
    }
  };
  for (const e of entries) if (e.vacation_paid !== 0) consider(e.period);
  const lastLiquidacion = latestDate(expenses.filter((e) => e.subcategory === "liquidacion").map((e) => e.date));
  if (lastLiquidacion) {
    const p = periodFromDateString(lastLiquidacion);
    if (p) consider(p);
  }

  const accrued = computeVacationAccrual(realPeriods, lastPayout, lookup, asOf);
  return { accrued, lastPaid: lastPayout ? periodRepresentativeDate(lastPayout) : null };
}

function getPrimaStat(expenses: PayrollExpense[], hireDate: string | null, currentSalary: number, asOf: Period) {
  if (!hireDate) return { accrued: 0, since: null };
  const liquidacionDates = expenses.filter((e) => e.subcategory === "liquidacion").map((e) => e.date);
  const lastLiquidacion = latestDate(liquidacionDates);
  const resetAnchor = lastLiquidacion ? periodFromDateString(lastLiquidacion) : null;
  const accrued = computePrimaAntiguedadAccrual(currentSalary, hireDate, resetAnchor, asOf);
  return { accrued, since: lastLiquidacion ?? hireDate };
}
