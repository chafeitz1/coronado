"use client";

import * as React from "react";
import { Plus, Trash2, X } from "lucide-react";

import type { PayrollLedgerEntry, PayrollLoanWithSchedule } from "@/lib/types/planilla";
import { Button } from "@/components/payroll-ui/button";
import { formatCents, MONTHS_ES } from "@/lib/planilla/payroll-period";
import { formatDisplayDate } from "@/lib/planilla/format-date";
import { getLedgerEntriesAction, getLedgerBalanceAction, deleteLedgerEntryAction, getLoansAction, cancelLoanAction } from "@/app/actions/planilla";
import { LedgerEntryDialog, type LedgerPeriodOption } from "@/components/planilla/ledger-entry-dialog";
import { LoanDialog } from "@/components/planilla/loan-dialog";
import { LEDGER_CATEGORY_LABEL } from "@/components/planilla/ledger-labels";

function periodLabel(p: { year: number; month: number; half: 1 | 2 }): string {
  return `${MONTHS_ES[p.month - 1].slice(0, 3)} ${p.year} · ${p.half === 1 ? "1ra" : "2da"}`;
}

/** One préstamo/adelanto card -- principal, cuota schedule progress
 *  (derived live from its real linked ledger rows, see
 *  getLoansForEmployee), and a cancel action for whatever hasn't been
 *  paid out yet. */
function LoanCard({ loan, onCancelled }: { loan: PayrollLoanWithSchedule; onCancelled: () => void }) {
  const [cancelling, setCancelling] = React.useState(false);
  const sorted = [...loan.installments].sort((a, b) => {
    const ao = a.period.year * 24 + (a.period.month - 1) * 2 + (a.period.half - 1);
    const bo = b.period.year * 24 + (b.period.month - 1) * 2 + (b.period.half - 1);
    return ao - bo;
  });
  const paidCount = sorted.filter((i) => i.paid).length;
  const nextPending = sorted.find((i) => !i.paid);
  const last = sorted[sorted.length - 1];
  const isAdelanto = loan.category === "adelanto";
  const canCancel = loan.status === "active" && Boolean(nextPending);

  async function handleCancel() {
    setCancelling(true);
    try {
      await cancelLoanAction(loan.id);
      onCancelled();
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="rounded-md border border-border p-3 text-xs">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-foreground">
            {LEDGER_CATEGORY_LABEL[loan.category]} · {formatCents(loan.principalCents)}
            {loan.status === "cancelled" && <span className="ml-2 text-muted-foreground">(cancelado)</span>}
          </p>
          <p className="mt-0.5 text-muted-foreground">Solicitado {formatDisplayDate(loan.requestDate)}</p>
        </div>
        {canCancel && (
          <Button
            variant="ghost"
            size="icon"
            className="size-6 text-muted-foreground hover:text-destructive"
            title="Cancelar cuotas pendientes"
            disabled={cancelling}
            onClick={handleCancel}
          >
            <X className="size-3.5" />
          </Button>
        )}
      </div>
      {isAdelanto ? (
        <p className="mt-2 text-muted-foreground">
          {sorted[0]
            ? `Descontado de ${periodLabel(sorted[0].period)} -- ${sorted[0].paid ? "ya aplicado" : "pendiente"}.`
            : "Cuota cancelada -- ya no se descuenta de ninguna quincena."}
        </p>
      ) : (
        <div className="mt-2 space-y-1 text-muted-foreground">
          <p>
            {paidCount} de {sorted.length} cuotas pagadas · {formatCents(sorted[0]?.amountCents ?? 0)} c/u
          </p>
          {nextPending && (
            <p>
              Próxima cuota: {periodLabel(nextPending.period)} · {formatCents(nextPending.amountCents)}
            </p>
          )}
          {last && <p>Pago total estimado: {periodLabel(last.period)}</p>}
        </div>
      )}
      {loan.notes && <p className="mt-1 text-muted-foreground italic">{loan.notes}</p>}
    </div>
  );
}

/** Préstamos/Adelantos (calendario de cuotas auto-aplicado) +
 *  Herramientas/Daños/Otros (el ledger genérico de siempre). Separadas
 *  en dos secciones porque, desde 2026-08-28, préstamos y adelantos ya
 *  no son un movimiento suelto -- son un calendario completo que se
 *  materializa de una vez sobre las quincenas futuras que le tocan
 *  (ver createLoan en services/payroll.ts) para que el descuento nunca
 *  dependa de que alguien se acuerde de aplicarlo a mano. */
export function LedgerSection({
  employeeId,
  periodOptions,
  onChanged,
}: {
  employeeId: string;
  periodOptions: LedgerPeriodOption[];
  /** Called after any mutation here (new/cancelled loan, new/deleted
   *  generic movement) so the parent sheet's own annual detail table
   *  -- which a loan's materialized future cuotas change -- refetches
   *  too, instead of only this section's own local state. */
  onChanged?: () => void;
}) {
  const [entries, setEntries] = React.useState<PayrollLedgerEntry[] | null>(null);
  const [loans, setLoans] = React.useState<PayrollLoanWithSchedule[] | null>(null);
  const [balanceCents, setBalanceCents] = React.useState<number | null>(null);
  const [addOpen, setAddOpen] = React.useState(false);
  const [loanDialog, setLoanDialog] = React.useState<"prestamo" | "adelanto" | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const load = React.useCallback(() => {
    getLedgerEntriesAction(employeeId).then(setEntries);
    getLoansAction(employeeId).then(setLoans);
    getLedgerBalanceAction(employeeId).then(setBalanceCents);
    onChanged?.();
  }, [employeeId, onChanged]);

  React.useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await deleteLedgerEntryAction(id);
      load();
    } finally {
      setDeletingId(null);
    }
  }

  const periodLabelForEntry = (payrollEntryId: string | null) => {
    if (!payrollEntryId) return "—";
    const p = periodOptions.find((o) => o.payrollEntryId === payrollEntryId);
    if (!p) return "—";
    return periodLabel(p);
  };

  // Préstamos/adelantos now render as their own cards (via `loans`,
  // with the real schedule) -- excluded here so the same money doesn't
  // show up twice.
  const genericEntries = (entries ?? []).filter((e) => e.category !== "prestamo" && e.category !== "adelanto");

  return (
    <div className="mt-6 border-t border-border pt-4">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-foreground">Préstamos y adelantos</h3>
          <p className="text-xs text-muted-foreground">
            Saldo actual: {balanceCents === null ? "…" : formatCents(balanceCents)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setLoanDialog("prestamo")}>
            <Plus className="size-3.5" />
            Préstamo
          </Button>
          <Button variant="outline" size="sm" onClick={() => setLoanDialog("adelanto")}>
            <Plus className="size-3.5" />
            Adelanto
          </Button>
        </div>
      </div>

      {loans !== null && loans.length === 0 && (
        <p className="py-3 text-center text-xs text-muted-foreground">Sin préstamos ni adelantos registrados.</p>
      )}
      {loans !== null && loans.length > 0 && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {loans.map((loan) => (
            <LoanCard key={loan.id} loan={loan} onCancelled={load} />
          ))}
        </div>
      )}

      <div className="mb-2 mt-6 flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Herramientas, daños y otros movimientos</h3>
        <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="size-3.5" />
          Agregar movimiento
        </Button>
      </div>

      {genericEntries.length === 0 && (
        <p className="py-4 text-center text-xs text-muted-foreground">Sin movimientos registrados.</p>
      )}

      {genericEntries.length > 0 && (
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-1.5 font-medium">Fecha</th>
              <th className="py-1.5 font-medium">Categoría</th>
              <th className="py-1.5 font-medium">Quincena</th>
              <th className="py-1.5 text-right font-medium">Monto</th>
              <th className="py-1.5 font-medium">Notas</th>
              <th className="py-1.5" />
            </tr>
          </thead>
          <tbody>
            {genericEntries.map((e) => (
              <tr key={e.id} className="border-b border-border last:border-0">
                <td className="py-1.5 text-foreground">{formatDisplayDate(e.entryDate)}</td>
                <td className="py-1.5 text-muted-foreground">{LEDGER_CATEGORY_LABEL[e.category]}</td>
                <td className="py-1.5 text-muted-foreground">{periodLabelForEntry(e.payrollEntryId)}</td>
                <td
                  className={`py-1.5 text-right tabular-nums ${
                    e.direction === "debt" ? "text-destructive" : "text-foreground"
                  }`}
                >
                  {e.direction === "debt" ? "+" : "-"}
                  {formatCents(e.amountCents)}
                </td>
                <td className="py-1.5 max-w-48 truncate text-muted-foreground" title={e.notes ?? undefined}>
                  {e.notes ?? "—"}
                </td>
                <td className="py-1.5 text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6 text-muted-foreground hover:text-destructive"
                    title="Eliminar movimiento"
                    disabled={deletingId === e.id}
                    onClick={() => handleDelete(e.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <LedgerEntryDialog
        employeeId={employeeId}
        periodOptions={periodOptions}
        open={addOpen}
        onOpenChange={setAddOpen}
        onSaved={load}
      />
      <LoanDialog
        employeeId={employeeId}
        defaultCategory={loanDialog ?? "prestamo"}
        open={loanDialog !== null}
        onOpenChange={(next) => setLoanDialog(next ? loanDialog : null)}
        onSaved={load}
      />
    </div>
  );
}
