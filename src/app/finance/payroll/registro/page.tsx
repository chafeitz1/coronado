import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PayrollRegistroView, type RegistroEntry, type RegistroPerson } from "@/components/payroll-registro-view";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { formatMonthYear } from "@/lib/dates";
import { formatCurrency } from "@/lib/money";
import { card, mutedText, pageHeading, sectionHeading } from "@/lib/ui";
import {
  nextPeriod,
  previousPeriod,
  periodRepresentativeDate,
  entryTotal,
  type Period,
} from "@/lib/payroll-accrual";
import type { Locale, PaymentMethod } from "@/lib/types/database";

function periodLabel(p: Period, dict: ReturnType<typeof getDictionary>, locale: Locale): string {
  const quincena = p.half === 1 ? dict.payroll.quincena1Label : dict.payroll.quincena2Label;
  const monthYear = formatMonthYear(`${p.year}-${String(p.month).padStart(2, "0")}`, locale);
  return `${quincena} — ${monthYear}`;
}

type EntryRow = RegistroEntry & {
  person_id: string;
  extra_hours_amount: number;
  extra_days_amount: number;
  horas_descontadas_amount: number;
  dias_descontados_amount: number;
};

export default async function PayrollRegistroPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string; half?: string }>;
}) {
  const profile = await requireOwner();
  const dict = getDictionary(profile.locale);
  const supabase = await createClient();

  const { year, month, half } = await searchParams;
  const today = new Date();
  const period: Period = {
    year: Number(year) || today.getFullYear(),
    month: Number(month) || today.getMonth() + 1,
    half: half === "2" ? 2 : half === "1" ? 1 : today.getDate() <= 15 ? 1 : 2,
  };
  const prev = previousPeriod(period);
  const next = nextPeriod(period);

  const entryColumns =
    "person_id, base_pay, extra_hours, extra_hours_amount, extra_days, extra_days_amount, bonus, dias_libres, horas_descontadas, horas_descontadas_amount, dias_descontados, dias_descontados_amount, other_deduction, decimo_paid, vacation_paid, prima_paid, payment_method";

  const [{ data: staff }, { data: staffDetails }, { data: thisPeriodRows }, { data: prevPeriodRows }, { data: salaryHistory }] =
    await Promise.all([
      supabase.from("profiles").select("id, full_name, avatar_url").eq("role", "staff").order("full_name"),
      supabase.from("staff_details").select("user_id, termination_date"),
      supabase
        .from("payroll_entries")
        .select(entryColumns)
        .eq("period_year", period.year)
        .eq("period_month", period.month)
        .eq("period_half", period.half),
      supabase
        .from("payroll_entries")
        .select(entryColumns)
        .eq("period_year", prev.year)
        .eq("period_month", prev.month)
        .eq("period_half", prev.half),
      supabase.from("staff_salary_history").select("user_id, salary, effective_date").order("effective_date", { ascending: false }),
    ]);

  const terminatedIds = new Set((staffDetails ?? []).filter((s) => s.termination_date).map((s) => s.user_id));
  const activeStaff = (staff ?? []).filter((p) => !terminatedIds.has(p.id));

  const thisPeriodByPerson = new Map<string, EntryRow>();
  for (const e of (thisPeriodRows ?? []) as EntryRow[]) thisPeriodByPerson.set(e.person_id, e);
  const prevPeriodByPerson = new Map<string, EntryRow>();
  for (const e of (prevPeriodRows ?? []) as EntryRow[]) prevPeriodByPerson.set(e.person_id, e);

  const latestSalaryByPerson = new Map<string, number>();
  for (const s of salaryHistory ?? []) {
    if (!latestSalaryByPerson.has(s.user_id)) latestSalaryByPerson.set(s.user_id, s.salary);
  }

  const people: RegistroPerson[] = activeStaff.map((p) => {
    const entry = thisPeriodByPerson.get(p.id) ?? null;
    const previousEntry = prevPeriodByPerson.get(p.id) ?? null;
    return {
      id: p.id,
      full_name: p.full_name,
      avatar_url: p.avatar_url,
      entry: entry ? stripPersonId(entry) : null,
      previousEntry: previousEntry ? stripPersonId(previousEntry) : null,
      defaultBasePay: (latestSalaryByPerson.get(p.id) ?? 0) / 2,
    };
  });

  const thisPeriodEntries = [...thisPeriodByPerson.values()];
  const totalToPay = thisPeriodEntries.reduce((sum, e) => sum + entryTotal(e), 0);
  const cashPay = thisPeriodEntries
    .filter((e) => e.payment_method === ("efectivo" as PaymentMethod))
    .reduce((sum, e) => sum + entryTotal(e), 0);
  const decimoPeriod = thisPeriodEntries.reduce((sum, e) => sum + e.decimo_paid, 0);
  const deductionsPeriod = thisPeriodEntries.reduce(
    (sum, e) => sum + e.horas_descontadas_amount + e.dias_descontados_amount + e.other_deduction,
    0
  );

  function periodHref(p: Period) {
    return `/finance/payroll/registro?year=${p.year}&month=${p.month}&half=${p.half}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className={pageHeading}>{dict.payroll.registroHeading}</h1>
          <p className={mutedText}>{dict.payroll.registroSubtitle}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Kpi label={dict.payroll.kpiTotalToPay} value={formatCurrency(totalToPay)} sub={`${people.length} ${dict.roles.staff}`} />
        <Kpi
          label={dict.payroll.kpiCashPay}
          value={formatCurrency(cashPay)}
          sub={totalToPay > 0 ? `${((cashPay / totalToPay) * 100).toFixed(1)}%` : "—"}
        />
        <Kpi label={dict.payroll.kpiDecimoPeriod} value={formatCurrency(decimoPeriod)} />
        <Kpi label={dict.payroll.kpiDeductionsPeriod} value={formatCurrency(deductionsPeriod)} />
        <Kpi
          label={dict.payroll.kpiNextPayment}
          value={new Date(`${periodRepresentativeDate(next)}T00:00:00`).toLocaleDateString(profile.locale)}
          sub={next.half === 1 ? dict.payroll.quincena1Label : dict.payroll.quincena2Label}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Link
            href={periodHref(prev)}
            aria-label={dict.payroll.prevPeriod}
            className="rounded-md p-1.5 text-ink-muted hover:bg-surface-hover"
          >
            <ChevronLeft className="size-4" />
          </Link>
          <span className="min-w-40 text-center text-sm font-medium text-ink">
            {periodLabel(period, dict, profile.locale)}
          </span>
          <Link
            href={periodHref(next)}
            aria-label={dict.payroll.nextPeriod}
            className="rounded-md p-1.5 text-ink-muted hover:bg-surface-hover"
          >
            <ChevronRight className="size-4" />
          </Link>
        </div>
      </div>

      <PayrollRegistroView period={period} people={people} dict={dict} />
    </div>
  );
}

function stripPersonId(e: EntryRow): RegistroEntry {
  const rest: Partial<EntryRow> = { ...e };
  delete rest.person_id;
  return rest as RegistroEntry;
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className={`p-3.5 ${card}`}>
      <p className={sectionHeading}>{label}</p>
      <p className="mt-1 text-lg font-semibold text-ink">{value}</p>
      {sub && <p className={mutedText}>{sub}</p>}
    </div>
  );
}
