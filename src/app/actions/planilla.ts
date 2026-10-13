"use server";

import { revalidatePath } from "next/cache";

import { requireOwner } from "@/lib/auth";
import * as payroll from "@/lib/payroll-service/payroll";
import { getSalaryChanges, toSalaryChanges } from "@/lib/payroll-service/salary";
import { dailyRateCents, hourlyRateCents, quantityToCents } from "@/lib/planilla/payroll-rates";
import { monthlySalaryAt } from "@/lib/planilla/salary-history";
import type { PaymentMethod } from "@/lib/types/planilla";

/**
 * Acciones de la Planilla. Todas exigen dueño (`requireOwner`) — las
 * lecturas también, porque son server actions invocables desde el
 * cliente — y delegan a `lib/payroll-service/payroll.ts`.
 */

const PATH = "/finance/payroll";

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
  revalidatePath(PATH);
  return entry;
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
  revalidatePath(PATH);
  return entry;
}

export async function duplicatePreviousPeriodAction(year: number, month: number, half: 1 | 2) {
  await requireOwner();
  const copied = await payroll.duplicatePreviousPeriod(year, month, half);
  revalidatePath(PATH);
  return { copied };
}

export async function getRegistroAction(year: number, month: number, half: 1 | 2) {
  await requireOwner();
  return await payroll.getRegistroForPeriod(year, month, half);
}

export async function getEmployeeAnnualDetailAction(employeeId: string, year: number, projectFuture = false) {
  await requireOwner();
  return await payroll.getEmployeeAnnualDetail(employeeId, year, projectFuture);
}
