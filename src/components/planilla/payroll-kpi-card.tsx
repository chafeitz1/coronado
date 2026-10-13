import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { PAYROLL_CATEGORY, type PayrollCategoryKey } from "@/lib/planilla/payroll-colors";

/**
 * Compact KPI card for Payroll's Registro/Resumen Anual/Dashboard --
 * shared across all three per the redesign spec's requirement that a
 * category (Salario, Bonos, Prestaciones, Descuentos, Prestamos) reads
 * the same color everywhere. `category` drives both the icon badge
 * tint and the label's color; omit it (or pass "total") for a neutral
 * KPI like "Total a Pagar" that shouldn't compete with the categorized
 * numbers next to it.
 *
 * `color` is an escape hatch for the couple of KPI cards that need a
 * one-off accent that ISN'T one of the five shared money categories --
 * e.g. "Total a Pagar" reads as a positive/success green in the
 * mockup and "Próximo pago" as an informational purple, neither of
 * which should register as "this is the Salario/Prestamos category"
 * anywhere else that reads PAYROLL_CATEGORY. When given, it overrides
 * `category` entirely for this one card. The VALUE text itself always
 * stays neutral dark regardless of category or color -- only the icon
 * badge and label pick up the tint -- matching the mockup exactly and
 * keeping the big number legible against every accent.
 */
export function PayrollKpiCard({
  icon: Icon,
  label,
  value,
  sublabel,
  category = "total",
  color,
  className,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sublabel?: string;
  category?: PayrollCategoryKey;
  color?: string;
  className?: string;
}) {
  const isNeutral = !color && category === "total";
  const resolvedColor = color ?? PAYROLL_CATEGORY[category].color;
  // The mockup washes the WHOLE card in a soft tint, not just the
  // icon -- a colored icon on an otherwise white card reads as
  // decoration, while a full-card wash is what actually makes 5 KPI
  // cards scannable as 5 distinct categories at a glance.
  const cardStyle: React.CSSProperties = isNeutral
    ? {}
    : {
        backgroundColor: `color-mix(in oklch, ${resolvedColor} 7%, var(--card))`,
        borderColor: `color-mix(in oklch, ${resolvedColor} 22%, var(--border))`,
      };
  const iconTintStyle: React.CSSProperties = isNeutral
    ? { backgroundColor: "color-mix(in oklch, var(--foreground) 8%, transparent)" }
    : { backgroundColor: `color-mix(in oklch, ${resolvedColor} 18%, transparent)` };
  const accentTextStyle: React.CSSProperties | undefined = isNeutral ? undefined : { color: resolvedColor };
  return (
    <div className={cn("flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-3", className)} style={cardStyle}>
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg" style={iconTintStyle}>
        <Icon className="size-4" style={accentTextStyle} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium" style={accentTextStyle ?? { color: "var(--muted-foreground)" }}>
          {label}
        </p>
        <p className="text-lg font-semibold tabular-nums text-foreground">{value}</p>
        {sublabel && <p className="truncate text-[11px] text-muted-foreground">{sublabel}</p>}
      </div>
    </div>
  );
}

export { PAYROLL_CATEGORY };
