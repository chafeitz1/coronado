import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/money";
import { formatLongDate } from "@/lib/dates";
import { getDictionary, format } from "@/lib/i18n/dictionaries";
import { card, mutedText, pageHeading, sectionHeading } from "@/lib/ui";
import type { PayrollSubcategory } from "@/lib/types/database";

const SUBCATEGORIES: PayrollSubcategory[] = ["quincena", "decimo", "vacacion", "adelanto", "liquidacion"];

export default async function PayrollAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const profile = await requireOwner();
  const dict = getDictionary(profile.locale);
  const supabase = await createClient();

  const { year: yearParam } = await searchParams;
  const year = Number(yearParam) || new Date().getFullYear();
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;

  const [{ data: staff }, { data: staffDetails }, { data: expenseRows }, { data: loanRows }] = await Promise.all([
    supabase.from("profiles").select("id, full_name").eq("role", "staff").order("full_name"),
    supabase.from("staff_details").select("user_id, termination_date"),
    supabase
      .from("expenses")
      .select("id, person_id, subcategory, amount, date")
      .eq("category", "planilla")
      .gte("date", yearStart)
      .lte("date", yearEnd),
    supabase
      .from("payroll_loans")
      .select("id, person_id, principal_amount, payroll_loan_payments(amount, payment_date)"),
  ]);

  const terminationByPerson = new Map<string, string>();
  for (const s of staffDetails ?? []) {
    if (s.termination_date) terminationByPerson.set(s.user_id, s.termination_date);
  }

  const nameById = new Map((staff ?? []).map((p) => [p.id, p.full_name]));

  // Category totals per person, for the selected year only.
  const totalsByPerson = new Map<string, Record<PayrollSubcategory, number>>();
  function totalsFor(personId: string) {
    let t = totalsByPerson.get(personId);
    if (!t) {
      t = { quincena: 0, decimo: 0, vacacion: 0, adelanto: 0, liquidacion: 0 };
      totalsByPerson.set(personId, t);
    }
    return t;
  }
  for (const e of expenseRows ?? []) {
    if (!e.person_id) continue;
    const sub = e.subcategory as PayrollSubcategory;
    if (!SUBCATEGORIES.includes(sub)) continue;
    totalsFor(e.person_id)[sub] += e.amount;
  }

  // Loan payments received this year, per person (informational — never
  // summed into the row total, it's the opposite direction of money flow).
  const loanPaymentsThisYearByPerson = new Map<string, number>();
  for (const loan of loanRows ?? []) {
    for (const p of loan.payroll_loan_payments) {
      if (p.payment_date < yearStart || p.payment_date > yearEnd) continue;
      loanPaymentsThisYearByPerson.set(
        loan.person_id,
        (loanPaymentsThisYearByPerson.get(loan.person_id) ?? 0) + p.amount
      );
    }
  }

  const rows = (staff ?? []).map((person) => {
    const totals = totalsByPerson.get(person.id) ?? { quincena: 0, decimo: 0, vacacion: 0, adelanto: 0, liquidacion: 0 };
    const total = SUBCATEGORIES.reduce((sum, s) => sum + totals[s], 0);
    return {
      person,
      totals,
      total,
      loanPayments: loanPaymentsThisYearByPerson.get(person.id) ?? 0,
    };
  });
  const grand = {
    totals: SUBCATEGORIES.reduce(
      (acc, s) => ({ ...acc, [s]: rows.reduce((sum, r) => sum + r.totals[s], 0) }),
      {} as Record<PayrollSubcategory, number>
    ),
    total: rows.reduce((sum, r) => sum + r.total, 0),
    loanPayments: rows.reduce((sum, r) => sum + r.loanPayments, 0),
  };

  // Anomalies.
  const anomalies: string[] = [];
  for (const e of expenseRows ?? []) {
    if (e.amount < 0 && e.person_id) {
      anomalies.push(
        format(dict.payroll.auditAnomalyNegativeAmount, {
          name: nameById.get(e.person_id) ?? "?",
          date: formatLongDate(e.date, profile.locale),
          amount: formatCurrency(e.amount),
        })
      );
    }
    const termination = e.person_id ? terminationByPerson.get(e.person_id) : undefined;
    if (termination && e.person_id && e.date > termination) {
      anomalies.push(
        format(dict.payroll.auditAnomalyPostTermination, {
          name: nameById.get(e.person_id) ?? "?",
          date: formatLongDate(e.date, profile.locale),
          termDate: formatLongDate(termination, profile.locale),
        })
      );
    }
  }
  for (const loan of loanRows ?? []) {
    const paid = loan.payroll_loan_payments.reduce((sum, p) => sum + p.amount, 0);
    if (paid > loan.principal_amount + 0.005) {
      anomalies.push(
        format(dict.payroll.auditAnomalyOverpaidLoan, {
          name: nameById.get(loan.person_id) ?? "?",
          paid: formatCurrency(paid),
          principal: formatCurrency(loan.principal_amount),
        })
      );
    }
  }

  const subcategoryLabel: Record<PayrollSubcategory, string> = {
    quincena: dict.payroll.subcategoryQuincena,
    decimo: dict.payroll.subcategoryDecimo,
    vacacion: dict.payroll.subcategoryVacacion,
    adelanto: dict.payroll.subcategoryAdelanto,
    liquidacion: dict.payroll.subcategoryLiquidacion,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className={pageHeading}>{dict.payroll.auditHeading}</h1>
        <div className="flex items-center gap-1">
          <Link
            href={`/finance/payroll/audit?year=${year - 1}`}
            aria-label={dict.payroll.auditPrevYear}
            className="rounded-md p-1.5 text-ink-muted hover:bg-surface-hover"
          >
            <ChevronLeft className="size-4" />
          </Link>
          <span className="min-w-12 text-center text-sm font-medium text-ink">{year}</span>
          <Link
            href={`/finance/payroll/audit?year=${year + 1}`}
            aria-label={dict.payroll.auditNextYear}
            className="rounded-md p-1.5 text-ink-muted hover:bg-surface-hover"
          >
            <ChevronRight className="size-4" />
          </Link>
        </div>
      </div>

      <div className={`overflow-x-auto ${card}`}>
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-hairline text-left">
              <th className="px-4 py-2.5 font-medium text-ink-secondary">{dict.payroll.title}</th>
              {SUBCATEGORIES.map((s) => (
                <th key={s} className="px-3 py-2.5 text-right font-medium text-ink-secondary">
                  {subcategoryLabel[s]}
                </th>
              ))}
              <th className="px-3 py-2.5 text-right font-medium text-ink-secondary">
                {dict.payroll.auditLoanPaymentsHeader}
              </th>
              <th className="px-4 py-2.5 text-right font-medium text-ink-secondary">
                {dict.payroll.auditTotalHeader}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.person.id} className="border-b border-hairline last:border-b-0 hover:bg-surface-hover">
                <td className="px-4 py-2.5">
                  <Link href={`/finance/payroll/${row.person.id}`} className="font-medium text-ink hover:underline">
                    {row.person.full_name}
                  </Link>
                </td>
                {SUBCATEGORIES.map((s) => (
                  <td key={s} className="px-3 py-2.5 text-right text-ink-secondary">
                    {row.totals[s] !== 0 ? formatCurrency(row.totals[s]) : "—"}
                  </td>
                ))}
                <td className="px-3 py-2.5 text-right text-ink-secondary">
                  {row.loanPayments !== 0 ? formatCurrency(row.loanPayments) : "—"}
                </td>
                <td className="px-4 py-2.5 text-right font-medium text-ink">{formatCurrency(row.total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-hairline bg-canvas-soft font-medium">
              <td className="px-4 py-2.5 text-ink">{dict.payroll.auditTotalRow}</td>
              {SUBCATEGORIES.map((s) => (
                <td key={s} className="px-3 py-2.5 text-right text-ink">
                  {formatCurrency(grand.totals[s])}
                </td>
              ))}
              <td className="px-3 py-2.5 text-right text-ink">{formatCurrency(grand.loanPayments)}</td>
              <td className="px-4 py-2.5 text-right text-ink">{formatCurrency(grand.total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="space-y-2">
        <h2 className={sectionHeading}>{dict.payroll.auditAnomaliesHeading}</h2>
        {anomalies.length > 0 ? (
          <ul className={`divide-y divide-hairline ${card}`}>
            {anomalies.map((a, i) => (
              <li key={i} className="px-4 py-2.5 text-sm text-status-overdue-fg">
                {a}
              </li>
            ))}
          </ul>
        ) : (
          <p className={mutedText}>{dict.payroll.auditNoAnomalies}</p>
        )}
      </div>
    </div>
  );
}
