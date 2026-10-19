"use server";

import { revalidatePath } from "next/cache";

import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import * as payroll from "@/lib/payroll-service/payroll";
import { getSalaryChanges, toSalaryChanges } from "@/lib/payroll-service/salary";
import { dailyRateCents, hourlyRateCents, quantityToCents } from "@/lib/planilla/payroll-rates";
import { monthlySalaryAt } from "@/lib/planilla/salary-history";
import type { ActionResult } from "@/lib/planilla/action-result";
import type { LedgerCategory, LedgerDirection, LoanCategory, LoanPaymentMethod, PaymentMethod } from "@/lib/types/planilla";

/**
 * Acciones de la Planilla. Todas exigen dueño (`requireOwner`) — las
 * lecturas también, porque son server actions invocables desde el
 * cliente — y delegan a `lib/payroll-service/payroll.ts`.
 */

const PATH = "/finance/payroll";

async function safe<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    console.error("planilla read failed", e);
    return { ok: false, error: e instanceof Error ? e.message : "Error desconocido" };
  }
}

export async function upsertPayrollEntryAction(input: {
  employeeId: string;
  periodYear: number;
  periodMonth: number;
  periodHalf: 1 | 2;
  extraHoursCents?: number;
  extraDaysCents?: number;
  bonusCents?: number;
  diasLibresCents?: number;
  horasDescontadasCents?: number;
  diasDescontadosCents?: number;
  otherDeductionCents?: number;
  decimoPaidCents?: number;
  vacationPaidCents?: number;
  primaAntiguedadPaidCents?: number;
  paymentMethod?: PaymentMethod;
  paid?: boolean;
  notes?: string | null;
}) {
  await requireOwner();
  const entry = await payroll.upsertEntry(input);
  // Devuelve la quincena ya recalculada: un solo viaje en vez de guardar + recargar.
  const registro = await payroll.getRegistroForPeriod(input.periodYear, input.periodMonth, input.periodHalf);
  return { entry, registro };
}

const QUANTITY_FIELD_RATE = {
  extraHours: "hourly",
  extraDays: "daily",
  horasDescontadas: "hourly",
  diasDescontados: "daily",
} as const;

/** Las cuatro columnas que se capturan como cantidad (horas/días): el
 *  monto se calcula acá UNA vez con el sueldo vigente en esa quincena y
 *  se congela junto con la cantidad — un aumento posterior nunca
 *  recalcula una quincena ya registrada. */
export async function upsertPayrollQuantityFieldAction(input: {
  employeeId: string;
  periodYear: number;
  periodMonth: number;
  periodHalf: 1 | 2;
  field: "extraHours" | "extraDays" | "horasDescontadas" | "diasDescontados";
  quantity: number;
}) {
  await requireOwner();
  const changes = toSalaryChanges(await getSalaryChanges(input.employeeId));
  const baseSalaryCents = monthlySalaryAt(changes, input.periodYear, input.periodMonth, input.periodHalf);
  const rate =
    QUANTITY_FIELD_RATE[input.field] === "hourly"
      ? hourlyRateCents({ baseSalaryCents })
      : dailyRateCents({ baseSalaryCents });
  const cents = quantityToCents(input.quantity, rate);

  const centsField = `${input.field}Cents` as
    | "extraHoursCents"
    | "extraDaysCents"
    | "horasDescontadasCents"
    | "diasDescontadosCents";

  const entry = await payroll.upsertEntry({
    employeeId: input.employeeId,
    periodYear: input.periodYear,
    periodMonth: input.periodMonth,
    periodHalf: input.periodHalf,
    [input.field]: input.quantity,
    [centsField]: cents,
  });
  const registro = await payroll.getRegistroForPeriod(input.periodYear, input.periodMonth, input.periodHalf);
  return { entry, registro };
}

export async function duplicatePreviousPeriodAction(year: number, month: number, half: 1 | 2) {
  await requireOwner();
  const copied = await payroll.duplicatePreviousPeriod(year, month, half);
  return { copied };
}

export async function getRegistroAction(year: number, month: number, half: 1 | 2) {
  await requireOwner();
  return safe(() => payroll.getRegistroForPeriod(year, month, half));
}

export async function getEmployeeAnnualDetailAction(employeeId: string, year: number, projectFuture = false) {
  await requireOwner();
  return await payroll.getEmployeeAnnualDetail(employeeId, year, projectFuture);
}

// ── Reportes ────────────────────────────────────────────────────────────

// ── Ledger y préstamos ──────────────────────────────────────────────────

export async function getLedgerEntriesAction(employeeId: string) {
  await requireOwner();
  return await payroll.getLedgerEntries(employeeId);
}

export async function getLedgerBalanceAction(employeeId: string) {
  await requireOwner();
  return await payroll.getLedgerBalance(employeeId);
}

export async function createLedgerEntryAction(input: {
  employeeId: string;
  category: LedgerCategory;
  direction: LedgerDirection;
  amountCents: number;
  entryDate: string;
  payrollEntryId?: string | null;
  notes?: string | null;
}) {
  await requireOwner();
  const entry = await payroll.createLedgerEntry(input);
  revalidatePath(PATH);
  return entry;
}

export async function deleteLedgerEntryAction(id: string) {
  await requireOwner();
  await payroll.deleteLedgerEntry(id);
  revalidatePath(PATH);
}

export async function getLoansAction(employeeId: string) {
  await requireOwner();
  return await payroll.getLoansForEmployee(employeeId);
}

export async function createLoanAction(input: {
  employeeId: string;
  category: LoanCategory;
  principalCents: number;
  paymentMethod?: LoanPaymentMethod;
  requestDate: string;
  numInstallments: number;
  startPeriod?: { year: number; month: number; half: 1 | 2 };
  installmentAmountsCents?: number[];
  notes?: string | null;
}) {
  await requireOwner();
  const loan = await payroll.createLoan(input);
  revalidatePath(PATH);
  return loan;
}

export async function cancelLoanAction(loanId: string) {
  await requireOwner();
  await payroll.cancelLoan(loanId);
  revalidatePath(PATH);
}

export async function deleteLoanAction(loanId: string) {
  await requireOwner();
  await payroll.deleteLoan(loanId);
  revalidatePath(PATH);
}

// ── Empleado (solo lo que Planilla escribe; el resto lo edita el Directorio) ──

/** Liquidación = fin de la relación laboral: fija `termination_date` (el
 *  empleado pasa a "no laboran más") y guarda las notas de liquidación.
 *  `endDate: null` reactiva al empleado. */
export async function setEmployeeLiquidationAction(input: {
  employeeId: string;
  endDate: string | null;
  liquidationNotes?: string | null;
}) {
  await requireOwner();
  await payroll.setEmployeeLiquidation(input.employeeId, input.endDate, input.liquidationNotes);
  revalidatePath(PATH);
}

// ── Solicitudes de dinero (cola previa a un préstamo/adelanto real) ─────

export async function createLoanRequestAction(input: {
  employeeId: string;
  category: LoanCategory;
  amountCents: number;
  requestDate: string;
  notes?: string | null;
}) {
  const owner = await requireOwner();
  if (input.amountCents <= 0) throw new Error("El monto debe ser mayor que cero.");
  const supabase = await createClient();
  const { error } = await supabase.from("payroll_loan_requests").insert({
    person_id: input.employeeId,
    category: input.category,
    amount: input.amountCents / 100,
    request_date: input.requestDate,
    status: "pending",
    notes: input.notes ?? null,
    loan_id: null,
    created_by: owner.id,
  });
  if (error) throw new Error(error.message);
  revalidatePath(PATH);
}

/** Aprobar = crear el préstamo/adelanto real (con su calendario de cuotas
 *  aplicado a las quincenas) y marcar la solicitud como aprobada. */
export async function approveLoanRequestAction(requestId: string, numInstallments: number) {
  await requireOwner();
  const supabase = await createClient();
  const { data: request, error } = await supabase
    .from("payroll_loan_requests")
    .select("person_id, category, amount, request_date, notes, status")
    .eq("id", requestId)
    .single();
  if (error || !request) throw new Error("Solicitud no encontrada.");
  if (request.status !== "pending") throw new Error("Esta solicitud ya fue resuelta.");

  const category: LoanCategory = request.category === "adelanto" ? "adelanto" : "prestamo";
  const loan = await payroll.createLoan({
    employeeId: request.person_id,
    category,
    principalCents: Math.round(Number(request.amount) * 100),
    requestDate: request.request_date,
    numInstallments: category === "adelanto" ? 1 : Math.max(1, Math.round(numInstallments)),
    notes: request.notes,
  });
  const { error: updErr } = await supabase
    .from("payroll_loan_requests")
    .update({ status: "approved", loan_id: loan.id })
    .eq("id", requestId);
  if (updErr) throw new Error(updErr.message);
  revalidatePath(PATH);
}

export async function rejectLoanRequestAction(requestId: string) {
  await requireOwner();
  const supabase = await createClient();
  const { error } = await supabase.from("payroll_loan_requests").update({ status: "rejected" }).eq("id", requestId);
  if (error) throw new Error(error.message);
  revalidatePath(PATH);
}

export async function deleteLoanRequestAction(requestId: string) {
  await requireOwner();
  const supabase = await createClient();
  const { error } = await supabase.from("payroll_loan_requests").delete().eq("id", requestId);
  if (error) throw new Error(error.message);
  revalidatePath(PATH);
}

export async function getEmployeeLedgerBundleAction(employeeId: string) {
  await requireOwner();
  return await payroll.getEmployeeLedgerBundle(employeeId);
}

