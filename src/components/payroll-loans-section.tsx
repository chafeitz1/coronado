"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Field } from "@/components/ui/field";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { createLoan, deleteLoan, recordLoanPayment, deleteLoanPayment } from "@/app/actions/payroll-loans";
import { formatCurrency } from "@/lib/money";
import { formatLongDate } from "@/lib/dates";
import { computeLoanSchedule, type Period } from "@/lib/payroll-accrual";
import { buttonGhost, buttonSecondary, card, input, mutedText, sectionHeading } from "@/lib/ui";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Locale, LoanCategory, LoanStatus } from "@/lib/types/database";

export type LoanPayment = { id: string; amount: number; payment_date: string; notes: string | null };

export type Loan = {
  id: string;
  category: LoanCategory;
  principal_amount: number;
  num_installments: number;
  request_date: string;
  start_year: number;
  start_month: number;
  start_half: 1 | 2;
  status: LoanStatus;
  notes: string | null;
  payments: LoanPayment[];
};

export function PayrollLoansSection({
  personId,
  loans,
  dict,
  locale,
}: {
  personId: string;
  loans: Loan[];
  dict: Dictionary;
  locale: Locale;
}) {
  const categoryLabel: Record<LoanCategory, string> = {
    prestamo: dict.payroll.categoryPrestamoOption,
    adelanto: dict.payroll.categoryAdelantoOption,
  };

  const [addingLoan, setAddingLoan] = useState(false);
  const [addPending, startAdd] = useTransition();

  function handleAddLoan(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startAdd(async () => {
      await createLoan(personId, formData);
      setAddingLoan(false);
    });
  }

  return (
    <div className="space-y-4">
      <h2 className={sectionHeading}>{dict.payroll.loansHeading}</h2>

      {loans.map((loan) => (
        <LoanCard key={loan.id} loan={loan} personId={personId} categoryLabel={categoryLabel} dict={dict} locale={locale} />
      ))}

      {addingLoan ? (
        <form onSubmit={handleAddLoan} className={`space-y-3 p-4 ${card}`}>
          <div className="flex flex-wrap gap-3">
            <Field label={dict.payroll.categoryLabel}>
              <select name="category" required defaultValue="adelanto" className={input}>
                <option value="adelanto">{dict.payroll.categoryAdelantoOption}</option>
                <option value="prestamo">{dict.payroll.categoryPrestamoOption}</option>
              </select>
            </Field>
            <Field label={dict.payroll.requestDateLabel}>
              <input type="date" name="request_date" required className={input} />
            </Field>
          </div>
          <div className="flex flex-wrap gap-3">
            <Field label={dict.payroll.principalLabel}>
              <input type="number" step="0.01" min="0.01" name="principal_amount" required className={input} />
            </Field>
            <Field label={dict.payroll.installmentsLabel}>
              <input type="number" step="1" min="1" name="num_installments" required defaultValue={1} className={input} />
            </Field>
          </div>
          <Field label={dict.payroll.notesLabel}>
            <input name="notes" className={input} />
          </Field>
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={addPending} className={buttonSecondary}>
              {addPending ? dict.payroll.submitPending : dict.payroll.submit}
            </button>
            <button type="button" onClick={() => setAddingLoan(false)} className={buttonGhost}>
              {dict.vendorForm.cancel}
            </button>
          </div>
        </form>
      ) : (
        <button type="button" onClick={() => setAddingLoan(true)} className={buttonGhost}>
          + {dict.payroll.newLoan}
        </button>
      )}
    </div>
  );
}

function LoanCard({
  loan,
  personId,
  categoryLabel,
  dict,
  locale,
}: {
  loan: Loan;
  personId: string;
  categoryLabel: Record<LoanCategory, string>;
  dict: Dictionary;
  locale: Locale;
}) {
  const startPeriod: Period = { year: loan.start_year, month: loan.start_month, half: loan.start_half };
  const schedule = computeLoanSchedule(loan.principal_amount, loan.num_installments, startPeriod);
  const totalPaid = loan.payments.reduce((sum, p) => sum + p.amount, 0);
  const balance = Math.max(0, loan.principal_amount - totalPaid);

  let cumulative = 0;
  let installmentsPaid = 0;
  for (const inst of schedule) {
    cumulative += inst.amount;
    if (totalPaid + 0.005 >= cumulative) installmentsPaid++;
    else break;
  }
  const nextInstallment = schedule[installmentsPaid] ?? null;

  const [addingPayment, setAddingPayment] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleAddPayment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      await recordLoanPayment(loan.id, personId, formData);
      setAddingPayment(false);
    });
  }

  return (
    <div className={`space-y-3 p-4 ${card}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-medium text-primary">
            {categoryLabel[loan.category]}
          </span>
          <p className="mt-1 text-sm font-medium text-ink">
            {formatCurrency(loan.principal_amount)} · {formatLongDate(loan.request_date, locale)}
          </p>
          {loan.notes && <p className={mutedText}>{loan.notes}</p>}
        </div>
        <form action={deleteLoan.bind(null, loan.id, personId)}>
          <ConfirmSubmitButton confirmMessage={dict.payroll.deleteLoanConfirm} className={buttonGhost}>
            <Trash2 className="size-3.5" />
          </ConfirmSubmitButton>
        </form>
      </div>

      <div className="grid grid-cols-3 gap-2 text-sm">
        <div>
          <p className={mutedText}>{dict.payroll.installmentsPaidLabel}</p>
          <p className="font-medium text-ink">
            {installmentsPaid}/{loan.num_installments}
          </p>
        </div>
        <div>
          <p className={mutedText}>{dict.payroll.nextInstallmentLabel}</p>
          <p className="font-medium text-ink">{nextInstallment ? formatCurrency(nextInstallment.amount) : "—"}</p>
        </div>
        <div>
          <p className={mutedText}>{dict.payroll.balanceLabel}</p>
          <p className="font-medium text-ink">{formatCurrency(balance)}</p>
        </div>
      </div>

      {loan.payments.length > 0 && (
        <ul className="space-y-1.5 border-t border-hairline pt-2 text-sm">
          {loan.payments.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-2 text-ink-secondary">
              <span>{formatLongDate(p.payment_date, locale)}</span>
              <span className="ml-auto">{formatCurrency(p.amount)}</span>
              <form action={deleteLoanPayment.bind(null, p.id, personId)}>
                <ConfirmSubmitButton confirmMessage={dict.payroll.deletePaymentConfirm} className={buttonGhost}>
                  <Trash2 className="size-3" />
                </ConfirmSubmitButton>
              </form>
            </li>
          ))}
        </ul>
      )}

      {addingPayment ? (
        <form onSubmit={handleAddPayment} className="space-y-2 border-t border-hairline pt-3">
          <div className="flex flex-wrap gap-3">
            <Field label={dict.payroll.dateLabel}>
              <input type="date" name="payment_date" required className={input} />
            </Field>
            <Field label={dict.payroll.amountLabel}>
              <input type="number" step="0.01" min="0.01" name="amount" required className={input} />
            </Field>
          </div>
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
          + {dict.payroll.recordPayment}
        </button>
      )}
    </div>
  );
}
