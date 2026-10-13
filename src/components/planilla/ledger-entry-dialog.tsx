"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { FormDialog } from "@/components/payroll-ui/form-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/payroll-ui/form";
import { Input } from "@/components/payroll-ui/input";
import { Textarea } from "@/components/payroll-ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/payroll-ui/select";
import type { LedgerCategory, LedgerDirection } from "@/lib/types/planilla";
import { MONTHS_ES } from "@/lib/planilla/payroll-period";
import { createLedgerEntryAction } from "@/app/actions/planilla";
import { LEDGER_CATEGORY_LABEL, GENERIC_LEDGER_CATEGORIES } from "@/components/planilla/ledger-labels";

const ledgerFormSchema = z.object({
  category: z.string().min(1),
  direction: z.string().min(1),
  amount: z.string().min(1, "El monto es obligatorio."),
  entryDate: z.string().min(1, "La fecha es obligatoria."),
  payrollEntryId: z.string(),
  notes: z.string(),
});
type LedgerFormValues = z.infer<typeof ledgerFormSchema>;

const NO_PERIOD = "__none__";

/** A period this employee actually has a real quincena for, to
 *  optionally tie a ledger movement to -- required for a "payment"
 *  (abono) entry to actually reduce THAT period's displayed total via
 *  `ledgerForPeriod` in payroll.ts; optional but common for a "debt"
 *  (préstamo/adelanto otorgado) entry, since money is often handed out
 *  alongside a regular payroll run. Built from whatever the caller
 *  already has loaded (EmployeeDetailSheet's annual detail rows) so
 *  this dialog doesn't need its own fetch. */
export interface LedgerPeriodOption {
  payrollEntryId: string;
  year: number;
  month: number;
  half: 1 | 2;
}

export function LedgerEntryDialog({
  employeeId,
  periodOptions,
  open,
  onOpenChange,
  onSaved,
}: {
  employeeId: string;
  periodOptions: LedgerPeriodOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [submitting, setSubmitting] = React.useState(false);

  const form = useForm<LedgerFormValues>({
    resolver: zodResolver(ledgerFormSchema),
    defaultValues: {
      category: "herramienta",
      direction: "debt",
      amount: "",
      entryDate: new Date().toISOString().slice(0, 10),
      payrollEntryId: NO_PERIOD,
      notes: "",
    },
  });

  React.useEffect(() => {
    if (open) {
      form.reset({
        category: "herramienta",
        direction: "debt",
        amount: "",
        entryDate: new Date().toISOString().slice(0, 10),
        payrollEntryId: NO_PERIOD,
        notes: "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function onSubmit(values: LedgerFormValues) {
    setSubmitting(true);
    try {
      await createLedgerEntryAction({
        employeeId,
        category: values.category as LedgerCategory,
        direction: values.direction as LedgerDirection,
        amountCents: Math.round(parseFloat(values.amount || "0") * 100),
        entryDate: values.entryDate,
        payrollEntryId: values.payrollEntryId === NO_PERIOD ? null : values.payrollEntryId,
        notes: values.notes.trim() || null,
      });
      onOpenChange(false);
      onSaved();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Agregar movimiento"
      description="Herramienta, daño u otro cargo/abono para este empleado -- préstamos y adelantos ahora se registran aparte, con su propio calendario de cuotas."
      onSubmit={form.handleSubmit(onSubmit)}
      submitting={submitting}
      submitLabel="Agregar"
    >
      <Form {...form}>
        <form className="flex flex-col gap-4" onSubmit={form.handleSubmit(onSubmit)}>
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Categoría</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {GENERIC_LEDGER_CATEGORIES.map((key) => (
                      <SelectItem key={key} value={key}>
                        {LEDGER_CATEGORY_LABEL[key]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="direction"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="debt">Otorgado (el empleado lo debe)</SelectItem>
                    <SelectItem value="payment">Abono (el empleado pagó)</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monto</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="entryDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="payrollEntryId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Aplicar a la quincena (opcional)</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={NO_PERIOD}>Ninguna — no aplica a una quincena específica</SelectItem>
                    {periodOptions.map((p) => (
                      <SelectItem key={p.payrollEntryId} value={p.payrollEntryId}>
                        {MONTHS_ES[p.month - 1]} {p.year} · {p.half === 1 ? "1ra" : "2da"} quincena
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Un abono solo se descuenta del total de esa quincena si se aplica a una.
                </p>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notas</FormLabel>
                <FormControl>
                  <Textarea placeholder="Opcional" rows={2} {...field} />
                </FormControl>
              </FormItem>
            )}
          />
        </form>
      </Form>
    </FormDialog>
  );
}
