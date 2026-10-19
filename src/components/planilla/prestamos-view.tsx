"use client";

import * as React from "react";
import { ChevronDown, HandCoins, Wallet, CheckCircle2, Clock } from "lucide-react";

import type { LoanOverviewEmployee } from "@/lib/payroll-service/payroll";
import { Badge } from "@/components/payroll-ui/badge";
import { formatCents, MONTHS_ES } from "@/lib/planilla/payroll-period";
import { formatDisplayDate } from "@/lib/planilla/format-date";
import { EmployeeAvatar } from "@/components/planilla/employee-avatar";
import { PayrollKpiCard } from "@/components/planilla/payroll-kpi-card";

const CATEGORY_LABEL = { prestamo: "Préstamo", adelanto: "Adelanto" } as const;

function periodLabel(p: { year: number; month: number; half: 1 | 2 }): string {
  return `${MONTHS_ES[p.month - 1].slice(0, 3)} ${p.year} · ${p.half === 1 ? "1ra" : "2da"}`;
}

/** Historial global de préstamos y adelantos: cuánto se ha prestado, cuánto
 *  se ha descontado y cuánto falta, por empleado y por préstamo. */
export function PrestamosView({ rows }: { rows: LoanOverviewEmployee[] }) {
  const [onlyPending, setOnlyPending] = React.useState(false);
  const [open, setOpen] = React.useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const lent = rows.reduce((s, r) => s + r.lentCents, 0);
  const paid = rows.reduce((s, r) => s + r.paidCents, 0);
  const balance = lent - paid;
  const loanCount = rows.reduce((s, r) => s + r.loans.length, 0);
  const visible = onlyPending ? rows.filter((r) => r.balanceCents > 0) : rows;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium text-foreground">Historial de préstamos</p>
          <p className="text-xs text-muted-foreground">Todos los préstamos y adelantos, con lo descontado y lo pendiente.</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" className="size-4 accent-primary" checked={onlyPending} onChange={(e) => setOnlyPending(e.target.checked)} />
          Solo con saldo pendiente
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <PayrollKpiCard icon={HandCoins} label="Total prestado" value={formatCents(lent)} sublabel={`${loanCount} préstamos/adelantos`} category="prestamos" />
        <PayrollKpiCard icon={CheckCircle2} label="Ya descontado" value={formatCents(paid)} sublabel={lent > 0 ? `${((paid / lent) * 100).toFixed(0)}% de lo prestado` : "—"} color="var(--success)" />
        <PayrollKpiCard icon={Clock} label="Pendiente por cobrar" value={formatCents(balance)} sublabel={`${rows.filter((r) => r.balanceCents > 0).length} empleados con saldo`} category="descuentos" />
        <PayrollKpiCard icon={Wallet} label="Empleados con préstamos" value={String(rows.length)} sublabel="en el historial" />
      </div>

      {visible.length === 0 && <p className="text-sm text-muted-foreground">No hay préstamos que mostrar.</p>}

      {visible.map((r) => (
        <div key={r.employee.id} className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
            <EmployeeAvatar name={r.employee.name} employeeId={r.employee.id} sortOrder={r.employee.sortOrder} size="md" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">{r.employee.name}</span>
                <Badge variant={r.employee.status === "ACTIVE" ? "success" : "outline"}>{r.employee.status === "ACTIVE" ? "Activo" : "Ya no labora"}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{r.loans.length} préstamo(s) · prestado {formatCents(r.lentCents)}</p>
            </div>
            <div className="flex items-center gap-5 text-right">
              <div>
                <p className="text-[11px] text-muted-foreground">Descontado</p>
                <p className="text-sm font-semibold tabular-nums text-foreground">{formatCents(r.paidCents)}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Pendiente</p>
                <p className={`text-sm font-semibold tabular-nums ${r.balanceCents > 0 ? "text-destructive" : "text-foreground"}`}>{formatCents(r.balanceCents)}</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
                  <th className="w-6 px-3 py-2" />
                  <th className="px-3 py-2 text-left font-medium">Fecha</th>
                  <th className="px-3 py-2 text-left font-medium">Tipo</th>
                  <th className="px-3 py-2 text-right font-medium">Monto</th>
                  <th className="px-3 py-2 text-right font-medium">Descontado</th>
                  <th className="px-3 py-2 text-right font-medium">Pendiente</th>
                  <th className="px-3 py-2 text-left font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {r.loans.map((l) => {
                  const pending = l.principalCents - l.paidCents;
                  const isOpen = open.has(l.id);
                  return (
                    <React.Fragment key={l.id}>
                      <tr className="cursor-pointer border-b border-border hover:bg-muted/30" onClick={() => toggle(l.id)}>
                        <td className="px-3 py-2">
                          <ChevronDown className={`size-3.5 text-muted-foreground transition-transform ${isOpen ? "" : "-rotate-90"}`} />
                        </td>
                        <td className="px-3 py-2 tabular-nums text-foreground">{formatDisplayDate(l.requestDate)}</td>
                        <td className="px-3 py-2 text-foreground">{CATEGORY_LABEL[l.category]}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-foreground">{formatCents(l.principalCents)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{formatCents(l.paidCents)}</td>
                        <td className={`px-3 py-2 text-right tabular-nums ${pending > 0 ? "font-medium text-destructive" : "text-muted-foreground"}`}>{formatCents(pending)}</td>
                        <td className="px-3 py-2">
                          {l.status === "cancelled" ? (
                            <Badge variant="outline">Cancelado</Badge>
                          ) : pending <= 0 ? (
                            <Badge variant="success">Pagado</Badge>
                          ) : (
                            <Badge variant="outline">Con saldo</Badge>
                          )}
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="border-b border-border bg-muted/20">
                          <td />
                          <td colSpan={6} className="px-3 py-2">
                            {l.installments.length === 0 ? (
                              <p className="text-xs text-muted-foreground">Sin descuentos registrados todavía.</p>
                            ) : (
                              <div className="flex flex-wrap gap-1.5">
                                {l.installments.map((i) => (
                                  <span
                                    key={i.ledgerEntryId}
                                    className={`rounded-md border px-2 py-0.5 text-[11px] tabular-nums ${i.paid ? "border-border text-foreground" : "border-dashed border-border text-muted-foreground"}`}
                                    title={i.paid ? "Descontado" : "Programado"}
                                  >
                                    {periodLabel(i.period)} · {formatCents(i.amountCents)}
                                  </span>
                                ))}
                              </div>
                            )}
                            {l.notes && <p className="mt-1.5 text-xs text-muted-foreground">{l.notes}</p>}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
                {r.unlinkedPaidCents > 0 && (
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <td />
                    <td colSpan={3} className="px-3 py-2">
                      Descuentos sin préstamo asociado en la hoja
                    </td>
                    <td />
                    <td className="px-3 py-2 text-right tabular-nums">{formatCents(r.unlinkedPaidCents)}</td>
                    <td />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
