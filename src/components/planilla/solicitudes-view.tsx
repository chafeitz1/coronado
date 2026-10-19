"use client";

import * as React from "react";
import { Check, Trash2, X } from "lucide-react";

import type { LoanCategory, PayrollEmployee } from "@/lib/types/planilla";
import { Button } from "@/components/payroll-ui/button";
import { Badge } from "@/components/payroll-ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/payroll-ui/select";
import { formatCents } from "@/lib/planilla/payroll-period";
import { formatDisplayDate } from "@/lib/planilla/format-date";
import {
  approveLoanRequestAction,
  createLoanRequestAction,
  deleteLoanRequestAction,
  rejectLoanRequestAction,
} from "@/app/actions/planilla";
import type { LoanRequestRow } from "@/lib/payroll-service/loan-requests";

const CATEGORY_LABEL: Record<LoanCategory, string> = { prestamo: "Préstamo", adelanto: "Adelanto" };
const STATUS_LABEL = { pending: "Pendiente", approved: "Aprobada", rejected: "Rechazada" } as const;

const fieldClass =
  "rounded-md border border-input bg-background px-2 py-1.5 text-sm focus:border-ring focus:outline-none";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Cola de "Solicitudes de dinero": el dueño anota lo que pide un empleado
 *  y luego lo aprueba (se crea el préstamo/adelanto real con su calendario
 *  de cuotas) o lo rechaza. */
export function SolicitudesView({ employees, requests }: { employees: PayrollEmployee[]; requests: LoanRequestRow[] }) {
  const [error, setError] = React.useState<string | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [installments, setInstallments] = React.useState<Record<string, string>>({});

  const [employeeId, setEmployeeId] = React.useState("");
  const [category, setCategory] = React.useState<LoanCategory>("adelanto");
  const [amount, setAmount] = React.useState("");
  const [requestDate, setRequestDate] = React.useState(todayIso);
  const [notes, setNotes] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  async function run(id: string | null, fn: () => Promise<unknown>) {
    setError(null);
    setBusyId(id);
    try {
      await fn(); // las acciones revalidan la página: llegan las solicitudes nuevas
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo completar la acción.");
    } finally {
      setBusyId(null);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const cents = Math.round(parseFloat(amount || "0") * 100);
    if (!employeeId || cents <= 0) {
      setError("Elige un empleado e indica un monto mayor que cero.");
      return;
    }
    setSaving(true);
    await run(null, () =>
      createLoanRequestAction({ employeeId, category, amountCents: cents, requestDate, notes: notes.trim() || null })
    );
    setSaving(false);
    setAmount("");
    setNotes("");
  }

  const pending = requests.filter((r) => r.status === "pending");
  const resolved = requests.filter((r) => r.status !== "pending");

  return (
    <div className="flex flex-col gap-5">
      <form onSubmit={submit} className="flex flex-wrap items-end gap-3 rounded-lg border border-border p-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Empleado</label>
          <Select value={employeeId} onValueChange={setEmployeeId}>
            <SelectTrigger className="h-9 w-48">
              <SelectValue placeholder="Elegir…" />
            </SelectTrigger>
            <SelectContent>
              {employees.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Tipo</label>
          <Select value={category} onValueChange={(v) => setCategory(v as LoanCategory)}>
            <SelectTrigger className="h-9 w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="adelanto">Adelanto</SelectItem>
              <SelectItem value="prestamo">Préstamo</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Monto ($)</label>
          <input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} className={`${fieldClass} w-28 text-right`} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Fecha</label>
          <input type="date" value={requestDate} onChange={(e) => setRequestDate(e.target.value)} className={fieldClass} />
        </div>
        <div className="flex min-w-48 flex-1 flex-col gap-1">
          <label className="text-xs text-muted-foreground">Nota (opcional)</label>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} className={fieldClass} />
        </div>
        <Button type="submit" disabled={saving}>
          Registrar solicitud
        </Button>
      </form>

      {error && <p className="text-sm font-medium text-destructive">{error}</p>}

      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pendientes ({pending.length})</h2>
        {pending.length === 0 && <p className="text-sm text-muted-foreground">No hay solicitudes pendientes.</p>}
        {pending.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border px-4 py-3">
            <div className="min-w-40 flex-1">
              <p className="text-sm font-medium text-foreground">
                {r.employeeName} · {CATEGORY_LABEL[r.category]} {formatCents(r.amountCents)}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDisplayDate(r.requestDate)}
                {r.notes ? ` · ${r.notes}` : ""}
              </p>
            </div>
            {r.category === "prestamo" && (
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                Cuotas
                <input
                  type="number"
                  min="1"
                  value={installments[r.id] ?? "4"}
                  onChange={(e) => setInstallments((prev) => ({ ...prev, [r.id]: e.target.value }))}
                  className={`${fieldClass} w-16 text-right`}
                />
              </label>
            )}
            <Button
              size="sm"
              disabled={busyId === r.id}
              onClick={() => run(r.id, () => approveLoanRequestAction(r.id, parseInt(installments[r.id] ?? "4", 10) || 1))}
            >
              <Check className="size-3.5" />
              Aprobar
            </Button>
            <Button size="sm" variant="outline" disabled={busyId === r.id} onClick={() => run(r.id, () => rejectLoanRequestAction(r.id))}>
              <X className="size-3.5" />
              Rechazar
            </Button>
          </div>
        ))}
      </section>

      {resolved.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Resueltas</h2>
          {resolved.map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-lg border border-border px-4 py-2 text-sm">
              <span className="min-w-0 flex-1 truncate text-foreground">
                {r.employeeName} · {CATEGORY_LABEL[r.category]} {formatCents(r.amountCents)} · {formatDisplayDate(r.requestDate)}
              </span>
              <Badge variant={r.status === "approved" ? "success" : "outline"}>{STATUS_LABEL[r.status]}</Badge>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground hover:text-destructive"
                title="Eliminar"
                disabled={busyId === r.id}
                onClick={() => run(r.id, () => deleteLoanRequestAction(r.id))}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
