import { Award, Umbrella, Users, ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { UpcomingObligations } from "@/lib/types/planilla";
import { MONTHS_ES, formatCents } from "@/lib/planilla/payroll-period";
import { payrollCategoryTint, payrollCategoryTextStyle, type PayrollCategoryKey } from "@/lib/planilla/payroll-colors";

/** "Dic 2026" from an ISO date string, in Spanish -- Payroll's own
 *  short-month convention (MONTHS_ES sliced to 3 letters), not
 *  Finance's English MONTH_ABBREVIATIONS, since every other label in
 *  this module (chart axes, Resumen Anual) is already in Spanish. */
function monthYearEs(isoDate: string): string {
  const [year, month] = isoDate.split("-").map(Number);
  return `${MONTHS_ES[month - 1].slice(0, 3)} ${year}`;
}

function ObligationRow({
  icon: Icon,
  category,
  title,
  value,
  sublabel,
}: {
  icon: LucideIcon;
  category: PayrollCategoryKey;
  title: string;
  value: string;
  sublabel: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg px-2 py-2" style={payrollCategoryTint(category, 10)}>
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg" style={payrollCategoryTint(category, 22)}>
        <Icon className="size-4" style={payrollCategoryTextStyle(category)} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-foreground">{title}</p>
        <p className="text-sm font-semibold tabular-nums text-foreground">{value}</p>
        <p className="truncate text-[11px] text-muted-foreground">{sublabel}</p>
      </div>
    </div>
  );
}

/**
 * Registro's "Próximas obligaciones" card -- three real payroll
 * liabilities currently outstanding for the property, each pulled
 * straight from getUpcomingObligations (same formulas Resumen Anual
 * and the employee detail sheet already use, never a separate
 * estimate). `onViewCalendar` is optional -- Registro doesn't have a
 * payroll calendar view yet, so the link only renders once one
 * exists.
 */
export function ProximasObligacionesCard({
  obligations,
  onViewCalendar,
}: {
  obligations: UpcomingObligations;
  onViewCalendar?: () => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-card p-4">
      <p className="text-sm font-medium text-foreground">Próximas obligaciones</p>
      <ObligationRow
        icon={Award}
        category="decimo"
        title="Décimos por pagar"
        value={formatCents(obligations.decimoPendingCents)}
        sublabel={`Vence en ${monthYearEs(obligations.decimoDueDate)}`}
      />
      <ObligationRow
        icon={Umbrella}
        category="vacacion"
        title="Vacaciones por pagar"
        value={formatCents(obligations.vacacionPendingCents)}
        sublabel="Acumulado sin pagar"
      />
      <ObligationRow
        icon={Users}
        category="prestamos"
        title="Préstamos pendientes"
        value={formatCents(obligations.prestamosPendingCents)}
        sublabel={
          obligations.employeesWithLoanBalance > 0
            ? `${obligations.employeesWithLoanBalance} empleado${obligations.employeesWithLoanBalance === 1 ? "" : "s"} con saldo`
            : "Sin saldos pendientes"
        }
      />
      {onViewCalendar && (
        <button
          type="button"
          onClick={onViewCalendar}
          className="mt-1 flex items-center gap-1 self-start text-xs font-medium text-primary hover:underline"
        >
          Ver calendario completo
          <ChevronRight className="size-3.5" />
        </button>
      )}
    </div>
  );
}
