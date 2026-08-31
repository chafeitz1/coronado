"use client";

import { useMemo, useState, useTransition } from "react";
import { Check } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { saveEntry, type EntryFormValues } from "@/app/actions/payroll-entries";
import { formatCurrency } from "@/lib/money";
import { hourlyRate, dailyRate, quincenaTotal, type Period } from "@/lib/payroll-accrual";
import { buttonSecondary, buttonUtility, input as inputClass, mutedText } from "@/lib/ui";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { PaymentMethod } from "@/lib/types/database";

export type RegistroEntry = {
  base_pay: number;
  extra_hours: number;
  extra_days: number;
  bonus: number;
  dias_libres: number;
  horas_descontadas: number;
  dias_descontados: number;
  other_deduction: number;
  decimo_paid: number;
  vacation_paid: number;
  prima_paid: number;
  payment_method: PaymentMethod;
};

export type RegistroPerson = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  entry: RegistroEntry | null;
  previousEntry: RegistroEntry | null;
  defaultBasePay: number;
};

const CAT = {
  salario: "bg-primary-soft text-primary",
  bonos: "bg-status-done-bg text-status-done-fg",
  descuentos: "bg-status-overdue-bg text-status-overdue-fg",
  prestaciones: "bg-status-progress-bg text-status-progress-fg",
};

export function PayrollRegistroView({
  period,
  people,
  dict,
}: {
  period: Period;
  people: RegistroPerson[];
  dict: Dictionary;
}) {
  const [duplicated, setDuplicated] = useState(false);
  const canDuplicate = people.some((p) => !p.entry && p.previousEntry);

  return (
    <div className="space-y-3">
      {canDuplicate && (
        <button type="button" onClick={() => setDuplicated(true)} className={buttonUtility}>
          {dict.payroll.duplicatePreviousPeriod}
        </button>
      )}
      <div className="overflow-x-auto rounded-md border border-hairline bg-surface">
        <table className="w-full min-w-[1100px] text-sm">
          <thead>
            <tr className="text-left text-xs">
              <th className="px-3 py-2.5 font-medium text-ink-secondary">{dict.payroll.title}</th>
              <th className={`px-2 py-2.5 font-medium ${CAT.salario}`}>{dict.payroll.baseLabel}</th>
              <th className={`px-2 py-2.5 font-medium ${CAT.bonos}`}>{dict.payroll.extraHoursLabel}</th>
              <th className={`px-2 py-2.5 font-medium ${CAT.bonos}`}>{dict.payroll.extraDaysLabel}</th>
              <th className={`px-2 py-2.5 font-medium ${CAT.bonos}`}>{dict.payroll.bonusLabel}</th>
              <th className={`px-2 py-2.5 font-medium ${CAT.bonos}`}>{dict.payroll.diasLibresLabel}</th>
              <th className={`px-2 py-2.5 font-medium ${CAT.descuentos}`}>{dict.payroll.horasDescontadasLabel}</th>
              <th className={`px-2 py-2.5 font-medium ${CAT.descuentos}`}>{dict.payroll.diasDescontadosLabel}</th>
              <th className={`px-2 py-2.5 font-medium ${CAT.descuentos}`}>{dict.payroll.otherDeductionLabel}</th>
              <th className={`px-2 py-2.5 font-medium ${CAT.prestaciones}`}>{dict.payroll.subcategoryDecimo}</th>
              <th className={`px-2 py-2.5 font-medium ${CAT.prestaciones}`}>{dict.payroll.subcategoryVacacion}</th>
              <th className={`px-2 py-2.5 font-medium ${CAT.prestaciones}`}>{dict.payroll.primaTitle}</th>
              <th className="px-2 py-2.5 font-medium text-ink-secondary">{dict.payroll.paymentMethodLabel}</th>
              <th className="px-2 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {people.map((person) => (
              <RegistroRow
                key={`${person.id}-${duplicated}`}
                person={person}
                period={period}
                duplicated={duplicated}
                dict={dict}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function emptyValues(basePay: number): EntryFormValues {
  return {
    base_pay: basePay,
    extra_hours: 0,
    extra_days: 0,
    bonus: 0,
    dias_libres: 0,
    horas_descontadas: 0,
    dias_descontados: 0,
    other_deduction: 0,
    decimo_paid: 0,
    vacation_paid: 0,
    prima_paid: 0,
    payment_method: "efectivo",
  };
}

function fromEntry(entry: RegistroEntry): EntryFormValues {
  return {
    base_pay: entry.base_pay,
    extra_hours: entry.extra_hours,
    extra_days: entry.extra_days,
    bonus: entry.bonus,
    dias_libres: entry.dias_libres,
    horas_descontadas: entry.horas_descontadas,
    dias_descontados: entry.dias_descontados,
    other_deduction: entry.other_deduction,
    decimo_paid: entry.decimo_paid,
    vacation_paid: entry.vacation_paid,
    prima_paid: entry.prima_paid,
    payment_method: entry.payment_method,
  };
}

function RegistroRow({
  person,
  period,
  duplicated,
  dict,
}: {
  person: RegistroPerson;
  period: Period;
  duplicated: boolean;
  dict: Dictionary;
}) {
  const initial = useMemo(() => {
    if (person.entry) return fromEntry(person.entry);
    if (duplicated && person.previousEntry) return fromEntry(person.previousEntry);
    return emptyValues(person.defaultBasePay);
  }, [person, duplicated]);

  const [values, setValues] = useState<EntryFormValues>(initial);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof EntryFormValues>(key: K, value: EntryFormValues[K]) {
    setSaved(false);
    setValues((v) => ({ ...v, [key]: value }));
  }

  function handleSave() {
    startTransition(async () => {
      await saveEntry(person.id, period, values);
      setSaved(true);
    });
  }

  const extraHoursAmount = values.extra_hours * hourlyRate(values.base_pay);
  const extraDaysAmount = values.extra_days * dailyRate(values.base_pay);
  const horasDescontadasAmount = values.horas_descontadas * hourlyRate(values.base_pay);
  const diasDescontadosAmount = values.dias_descontados * dailyRate(values.base_pay);
  const total = quincenaTotal({
    base_pay: values.base_pay,
    extra_hours_amount: extraHoursAmount,
    extra_days_amount: extraDaysAmount,
    bonus: values.bonus,
    dias_libres: values.dias_libres,
    horas_descontadas_amount: horasDescontadasAmount,
    dias_descontados_amount: diasDescontadosAmount,
    other_deduction: values.other_deduction,
    decimo_paid: 0,
    vacation_paid: 0,
    prima_paid: 0,
  });

  const cell = "px-2 py-2";
  const numberInput = "w-20 rounded border border-hairline bg-surface px-1.5 py-1 text-right text-sm outline-none focus:border-primary";

  return (
    <tr className="border-t border-hairline transition-colors focus-within:bg-primary-soft/30 hover:bg-surface-hover">
      <td className={`${cell} whitespace-nowrap`}>
        <div className="flex items-center gap-2">
          <Avatar fullName={person.full_name} avatarUrl={person.avatar_url} size="sm" />
          <div>
            <p className="font-medium text-ink">{person.full_name}</p>
            <p className={mutedText}>{formatCurrency(total)}</p>
          </div>
        </div>
      </td>
      <td className={cell}>
        <input
          type="number"
          step="0.01"
          min="0"
          className={numberInput}
          value={values.base_pay}
          onChange={(e) => set("base_pay", Number(e.target.value) || 0)}
        />
      </td>
      <QuantityCell value={values.extra_hours} amount={extraHoursAmount} onChange={(v) => set("extra_hours", v)} unit="h" />
      <QuantityCell value={values.extra_days} amount={extraDaysAmount} onChange={(v) => set("extra_days", v)} unit="d" />
      <td className={cell}>
        <input
          type="number"
          step="0.01"
          min="0"
          className={numberInput}
          value={values.bonus}
          onChange={(e) => set("bonus", Number(e.target.value) || 0)}
        />
      </td>
      <td className={cell}>
        <input
          type="number"
          step="0.01"
          min="0"
          className={numberInput}
          value={values.dias_libres}
          onChange={(e) => set("dias_libres", Number(e.target.value) || 0)}
        />
      </td>
      <QuantityCell
        value={values.horas_descontadas}
        amount={horasDescontadasAmount}
        onChange={(v) => set("horas_descontadas", v)}
        unit="h"
      />
      <QuantityCell
        value={values.dias_descontados}
        amount={diasDescontadosAmount}
        onChange={(v) => set("dias_descontados", v)}
        unit="d"
      />
      <td className={cell}>
        <input
          type="number"
          step="0.01"
          min="0"
          className={numberInput}
          value={values.other_deduction}
          onChange={(e) => set("other_deduction", Number(e.target.value) || 0)}
        />
      </td>
      <td className={cell}>
        <input
          type="number"
          step="0.01"
          min="0"
          className={numberInput}
          value={values.decimo_paid}
          onChange={(e) => set("decimo_paid", Number(e.target.value) || 0)}
        />
      </td>
      <td className={cell}>
        <input
          type="number"
          step="0.01"
          min="0"
          className={numberInput}
          value={values.vacation_paid}
          onChange={(e) => set("vacation_paid", Number(e.target.value) || 0)}
        />
      </td>
      <td className={cell}>
        <input
          type="number"
          step="0.01"
          min="0"
          className={numberInput}
          value={values.prima_paid}
          onChange={(e) => set("prima_paid", Number(e.target.value) || 0)}
        />
      </td>
      <td className={cell}>
        <select
          className={`${inputClass} w-32 py-1 text-sm`}
          value={values.payment_method}
          onChange={(e) => set("payment_method", e.target.value as PaymentMethod)}
        >
          <option value="efectivo">{dict.payroll.methodEfectivo}</option>
          <option value="transferencia">{dict.payroll.methodTransferencia}</option>
          <option value="yappy">{dict.payroll.methodYappy}</option>
          <option value="cheque">{dict.payroll.methodCheque}</option>
        </select>
      </td>
      <td className={cell}>
        <button
          type="button"
          onClick={handleSave}
          disabled={pending}
          aria-label={dict.payroll.saveRow}
          className={`${buttonSecondary} px-2.5 py-1.5`}
        >
          {saved && !pending ? <Check className="size-3.5" /> : dict.payroll.saveRow}
        </button>
      </td>
    </tr>
  );
}

function QuantityCell({
  value,
  amount,
  onChange,
  unit,
}: {
  value: number;
  amount: number;
  onChange: (v: number) => void;
  unit: string;
}) {
  return (
    <td className="px-2 py-2">
      <div className="flex items-center gap-1">
        <input
          type="number"
          step="0.01"
          min="0"
          className="w-14 rounded border border-hairline bg-surface px-1.5 py-1 text-right text-sm outline-none focus:border-primary"
          value={value}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
        />
        <span className="text-xs text-ink-faint">{unit}</span>
      </div>
      <p className="mt-0.5 text-xs text-ink-faint">{formatCurrency(amount)}</p>
    </td>
  );
}
