import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PayrollRegistroView, type RegistroPerson } from "@/components/payroll-registro-view";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { formatMonthYear } from "@/lib/dates";
import { mutedText, pageHeading } from "@/lib/ui";
import {
  nextPeriod,
  previousPeriod,
  periodRepresentativeDate,
  type Period,
} from "@/lib/payroll-accrual";
import type { Locale } from "@/lib/types/database";

function periodBounds(p: Period): { start: string; end: string } {
  const pad = (n: number) => String(n).padStart(2, "0");
  if (p.half === 1) return { start: `${p.year}-${pad(p.month)}-01`, end: `${p.year}-${pad(p.month)}-15` };
  return { start: `${p.year}-${pad(p.month)}-16`, end: periodRepresentativeDate(p) };
}

function periodLabel(p: Period, dict: ReturnType<typeof getDictionary>, locale: Locale): string {
  const quincena = p.half === 1 ? dict.payroll.quincena1Label : dict.payroll.quincena2Label;
  const monthYear = formatMonthYear(`${p.year}-${String(p.month).padStart(2, "0")}`, locale);
  return `${quincena} — ${monthYear}`;
}

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
  const bounds = periodBounds(period);
  const prevBounds = periodBounds(prev);

  const [{ data: staff }, { data: staffDetails }, { data: thisPeriodExpenses }, { data: prevPeriodExpenses }] =
    await Promise.all([
      supabase.from("profiles").select("id, full_name, avatar_url").eq("role", "staff").order("full_name"),
      supabase.from("staff_details").select("user_id, termination_date"),
      supabase
        .from("expenses")
        .select("person_id, subcategory, amount")
        .eq("category", "planilla")
        .gte("date", bounds.start)
        .lte("date", bounds.end),
      supabase
        .from("expenses")
        .select("person_id, amount")
        .eq("category", "planilla")
        .eq("subcategory", "quincena")
        .gte("date", prevBounds.start)
        .lte("date", prevBounds.end),
    ]);

  const terminatedIds = new Set((staffDetails ?? []).filter((s) => s.termination_date).map((s) => s.user_id));
  const activeStaff = (staff ?? []).filter((p) => !terminatedIds.has(p.id));

  const registeredByPerson = new Map<string, number>();
  for (const e of thisPeriodExpenses ?? []) {
    if (!e.person_id) continue;
    registeredByPerson.set(e.person_id, (registeredByPerson.get(e.person_id) ?? 0) + e.amount);
  }

  const previousQuincenaByPerson = new Map<string, number>();
  for (const e of prevPeriodExpenses ?? []) {
    if (!e.person_id) continue;
    previousQuincenaByPerson.set(e.person_id, (previousQuincenaByPerson.get(e.person_id) ?? 0) + e.amount);
  }

  const people: RegistroPerson[] = activeStaff.map((p) => ({
    id: p.id,
    full_name: p.full_name,
    avatar_url: p.avatar_url,
    previousQuincena: previousQuincenaByPerson.get(p.id) ?? null,
    registeredThisPeriod: registeredByPerson.get(p.id) ?? 0,
  }));

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
