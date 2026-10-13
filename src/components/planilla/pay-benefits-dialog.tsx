"use client";

import * as React from "react";

import type { PayrollEmployee, PayrollEntry } from "@/lib/types/planilla";
import { Button } from "@/components/payroll-ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/payroll-ui/dialog";
import { MONTHS_ES, formatCents } from "@/lib/planilla/payroll-period";
import { getEmployeeAnnualDetailAction, upsertPayrollEntryAction } from "@/app/actions/planilla";

type BenefitKey = "decimoPaidCents" | "vacationPaidCents" | "primaAntiguedadPaidCents";

const BENEFITS: { key: BenefitKey; label: string; hint: string }[] = [
  { key: "decimoPaidCents", label: "Décimo tercer mes", hint: "Se paga el 15 de abril, agosto y diciembre." },
  { key: "vacationPaidCents", label: "Vacación", hint: "Al pagarla, el saldo de vacación vuelve a cero." },
  { key: "primaAntiguedadPaidCents", label: "Prima de antigüedad", hint: "Al pagarla, la prima vuelve a contar desde cero." },
];

/**
 * "Pagar prestaciones" (Oct 2026, per the user): shows what an employee
 * has accrued so far of Décimo / Vacación / Prima as of the quincena
 * being viewed in Registro, lets the person tick which ones they're
 * paying (amount editable -- the real payment may differ from the
 * formula), and records them in THAT quincena's columns. Recording a
 * Vacación or Prima payout is what restarts its accrual (see
 * lastVacationPayout / lastPrimaPayout in services/payroll.ts); Décimo
 * restarts on its own legal calendar segments.
 */
export function PayBenefitsDialog({
  open,
  onOpenChange,
  employee,
  entry,
  period,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: PayrollEmployee | null;
  entry: PayrollEntry | null;
  period: { year: number; month: number; half: 1 | 2 };
  onSaved: () => void;
}) {
  const [balances, setBalances] = React.useState<Record<BenefitKey, number> | null>(null);
  const [checked, setChecked] = React.useState<Record<BenefitKey, boolean>>({
    decimoPaidCents: false,
    vacationPaidCents: false,
    primaAntiguedadPaidCents: false,
  });
  const [amounts, setAmounts] = React.useState<Record<BenefitKey, string>>({
    decimoPaidCents: "",
    vacationPaidCents: "",
    primaAntiguedadPaidCents: "",
  });
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Reset while closed, so reopening for another employee never flashes
  // the previous one's numbers.
  const [lastOpenKey, setLastOpenKey] = React.useState<string | null>(null);
  const openKey = open && employee ? `${employee.id}-${period.year}-${period.month}-${period.half}` : null;
  if (openKey !== lastOpenKey) {
    setLastOpenKey(openKey);
    setBalances(null);
    setError(null);
  }

  React.useEffect(() => {
    if (!open || !employee) return;
    let cancelled = false;
    getEmployeeAnnualDetailAction(employee.id, period.year)
      .then((detail) => {
        if (cancelled) return;
        const row = detail.find((r) => r.month === period.month && r.half === period.half);
        const b: Record<BenefitKey, number> = {
          decimoPaidCents: row ? (row.decimoAccrualBenefitsCents ?? row.decimoAccrualCents) : 0,
          vacationPaidCents: row ? (row.vacationAccrualBenefitsCents ?? row.vacationAccrualCents) : 0,
          primaAntiguedadPaidCents: row ? row.primaAntiguedadAccrualCents : 0,
        };
        setBalances(b);
        // Prefill: an amount already recorded this quincena wins over the
        // formula's balance.
        const next = {} as Record<BenefitKey, string>;
        const nextChecked = {} as Record<BenefitKey, boolean>;
        for (const { key } of BENEFITS) {
          const already = entry?.[key] ?? 0;
          next[key] = ((already || b[key]) / 100).toFixed(2);
          nextChecked[key] = already > 0;
        }
        setAmounts(next);
        setChecked(nextChecked);
      })
      .catch(() => !cancelled && setError("No se pudieron calcular los saldos."));
    return () => {
      cancelled = true;
    };
  }, [open, employee, entry, period.year, period.month, period.half]);

  const totalSelected = BENEFITS.reduce(
    (sum, b) => sum + (checked[b.key] ? Math.round(parseFloat(amounts[b.key] || "0") * 100) : 0),
    0
  );

  async function confirm() {
    if (!employee) return;
    setSaving(true);
    setError(null);
    try {
      const fields: Partial<Record<BenefitKey, number>> = {};
      for (const { key } of BENEFITS) {
        const already = entry?.[key] ?? 0;
        if (checked[key]) fields[key] = Math.round(parseFloat(amounts[key] || "0") * 100);
        else if (already > 0) fields[key] = 0; // un-ticked a previously recorded payout
      }
      await upsertPayrollEntryAction({
        employeeId: employee.id,
        periodYear: period.year,
        periodMonth: period.month,
        periodHalf: period.half,
        ...fields,
      });
      onSaved();
      onOpenChange(false);
    } catch {
      setError("No se pudo guardar. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pagar prestaciones · {employee?.name}</DialogTitle>
          <DialogDescription>
            Saldo acumulado al {period.half === 1 ? "15" : "cierre"} de {MONTHS_ES[period.month - 1]} {period.year}. Marca lo
            que pagas en esta quincena; puedes cambiar el monto si pagaste otra cifra.
          </DialogDescription>
        </DialogHeader>

        {!balances && !error && <p className="text-sm text-muted-foreground">Calculando saldos…</p>}
        {balances && (
          <div className="flex flex-col gap-3">
            {BENEFITS.map((b) => (
              <label key={b.key} className="flex items-start gap-3 rounded-md border border-border p-3">
                <input
                  type="checkbox"
                  className="mt-1 size-4 accent-primary"
                  checked={checked[b.key]}
                  onChange={(e) => setChecked((prev) => ({ ...prev, [b.key]: e.target.checked }))}
                />
                <div className="flex flex-1 flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-foreground">{b.label}</span>
                    <span className="text-xs text-muted-foreground">Acumulado: {formatCents(balances[b.key])}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{b.hint}</span>
                  <input
                    type="number"
                    step="0.01"
                    value={amounts[b.key]}
                    onChange={(e) => setAmounts((prev) => ({ ...prev, [b.key]: e.target.value }))}
                    disabled={!checked[b.key]}
                    className="mt-1 w-36 rounded-md border border-input bg-background px-2 py-1 text-right text-sm tabular-nums disabled:opacity-50"
                  />
                </div>
              </label>
            ))}
          </div>
        )}
        {error && <p className="text-sm font-medium text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={confirm} disabled={saving || !balances}>
            {saving ? "Guardando…" : `Confirmar pago (${formatCents(totalSelected)})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
