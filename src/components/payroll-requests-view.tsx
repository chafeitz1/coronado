"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Field } from "@/components/ui/field";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import {
  createLoanRequest,
  approveLoanRequest,
  rejectLoanRequest,
  deleteLoanRequest,
} from "@/app/actions/payroll-loan-requests";
import { formatCurrency } from "@/lib/money";
import { formatLongDate } from "@/lib/dates";
import { buttonGhost, buttonSecondary, card, input, mutedText, sectionHeading } from "@/lib/ui";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Locale, LoanCategory, LoanRequestStatus } from "@/lib/types/database";

export type LoanRequest = {
  id: string;
  person_id: string;
  person_name: string;
  category: LoanCategory;
  amount: number;
  request_date: string;
  status: LoanRequestStatus;
  notes: string | null;
};

export function PayrollRequestsView({
  staff,
  requests,
  dict,
  locale,
}: {
  staff: { id: string; full_name: string }[];
  requests: LoanRequest[];
  dict: Dictionary;
  locale: Locale;
}) {
  const categoryLabel: Record<LoanCategory, string> = {
    prestamo: dict.payroll.categoryPrestamoOption,
    adelanto: dict.payroll.categoryAdelantoOption,
  };
  const statusLabel: Record<LoanRequestStatus, string> = {
    pending: "",
    approved: dict.payroll.statusApproved,
    rejected: dict.payroll.statusRejected,
  };

  const pending = requests.filter((r) => r.status === "pending");
  const history = requests.filter((r) => r.status !== "pending");

  const [addingRequest, setAddingRequest] = useState(false);
  const [addPending, startAdd] = useTransition();

  function handleAddRequest(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startAdd(async () => {
      await createLoanRequest(formData);
      setAddingRequest(false);
    });
  }

  return (
    <div className="space-y-6">
      {addingRequest ? (
        <form onSubmit={handleAddRequest} className={`space-y-3 p-4 ${card}`}>
          <div className="flex flex-wrap gap-3">
            <Field label={dict.payroll.personLabel}>
              <select name="person_id" required defaultValue="" className={input}>
                <option value="" disabled>
                  —
                </option>
                {staff.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={dict.payroll.categoryLabel}>
              <select name="category" required defaultValue="adelanto" className={input}>
                <option value="adelanto">{dict.payroll.categoryAdelantoOption}</option>
                <option value="prestamo">{dict.payroll.categoryPrestamoOption}</option>
              </select>
            </Field>
          </div>
          <div className="flex flex-wrap gap-3">
            <Field label={dict.payroll.requestDateLabel}>
              <input type="date" name="request_date" required className={input} />
            </Field>
            <Field label={dict.payroll.amountLabel}>
              <input type="number" step="0.01" min="0.01" name="amount" required className={input} />
            </Field>
          </div>
          <Field label={dict.payroll.notesLabel}>
            <input name="notes" className={input} />
          </Field>
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={addPending} className={buttonSecondary}>
              {addPending ? dict.payroll.submitPending : dict.payroll.submit}
            </button>
            <button type="button" onClick={() => setAddingRequest(false)} className={buttonGhost}>
              {dict.vendorForm.cancel}
            </button>
          </div>
        </form>
      ) : (
        <button type="button" onClick={() => setAddingRequest(true)} className={buttonGhost}>
          + {dict.payroll.newRequest}
        </button>
      )}

      <div className="space-y-2">
        <h2 className={sectionHeading}>{dict.payroll.pendingRequestsHeading}</h2>
        {pending.length > 0 ? (
          <div className="space-y-3">
            {pending.map((r) => (
              <RequestCard key={r.id} request={r} categoryLabel={categoryLabel} dict={dict} locale={locale} />
            ))}
          </div>
        ) : (
          <p className={mutedText}>{dict.payroll.emptyRequests}</p>
        )}
      </div>

      <div className="space-y-2">
        <h2 className={sectionHeading}>{dict.payroll.historyHeading}</h2>
        {history.length > 0 ? (
          <ul className={card}>
            {history.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-hairline px-4 py-3 last:border-b-0"
              >
                <span className="font-medium text-ink">{r.person_name}</span>
                <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-medium text-primary">
                  {categoryLabel[r.category]}
                </span>
                <span className={mutedText}>{formatLongDate(r.request_date, locale)}</span>
                <span className="ml-auto text-sm font-medium text-ink">{formatCurrency(r.amount)}</span>
                <span
                  className={`text-xs font-semibold ${r.status === "approved" ? "text-status-done-fg" : "text-status-overdue-fg"}`}
                >
                  {statusLabel[r.status]}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className={mutedText}>{dict.payroll.emptyHistory}</p>
        )}
      </div>
    </div>
  );
}

function RequestCard({
  request,
  categoryLabel,
  dict,
  locale,
}: {
  request: LoanRequest;
  categoryLabel: Record<LoanCategory, string>;
  dict: Dictionary;
  locale: Locale;
}) {
  const [approving, setApproving] = useState(false);
  const [approvePending, startApprove] = useTransition();
  const [rejectPending, startReject] = useTransition();

  function handleApprove(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startApprove(async () => {
      await approveLoanRequest(request.id, formData);
    });
  }

  function handleReject() {
    startReject(async () => {
      await rejectLoanRequest(request.id, new FormData());
    });
  }

  return (
    <div className={`space-y-3 p-4 ${card}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-ink">{request.person_name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-medium text-primary">
              {categoryLabel[request.category]}
            </span>
            <span className={mutedText}>{formatLongDate(request.request_date, locale)}</span>
            <span className="text-sm font-semibold text-ink">{formatCurrency(request.amount)}</span>
          </div>
          {request.notes && <p className={`mt-1 ${mutedText}`}>{request.notes}</p>}
        </div>
        <form action={deleteLoanRequest.bind(null, request.id)}>
          <ConfirmSubmitButton confirmMessage={dict.payroll.deleteRequestConfirm} className={buttonGhost}>
            <Trash2 className="size-3.5" />
          </ConfirmSubmitButton>
        </form>
      </div>

      {approving ? (
        <form onSubmit={handleApprove} className="flex flex-wrap items-end gap-3 border-t border-hairline pt-3">
          <Field label={dict.payroll.approveInstallmentsPrompt}>
            <input type="number" step="1" min="1" name="num_installments" required defaultValue={1} className={input} />
          </Field>
          <div className="flex gap-2">
            <button type="submit" disabled={approvePending} className={buttonSecondary}>
              {approvePending ? dict.payroll.submitPending : dict.payroll.approve}
            </button>
            <button type="button" onClick={() => setApproving(false)} className={buttonGhost}>
              {dict.vendorForm.cancel}
            </button>
          </div>
        </form>
      ) : (
        <div className="flex gap-2 border-t border-hairline pt-3">
          <button type="button" onClick={() => setApproving(true)} className={buttonSecondary}>
            {dict.payroll.approve}
          </button>
          <button type="button" disabled={rejectPending} onClick={handleReject} className={buttonGhost}>
            {rejectPending ? dict.payroll.submitPending : dict.payroll.reject}
          </button>
        </div>
      )}
    </div>
  );
}
