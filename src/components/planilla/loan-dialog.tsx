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
import { MONTHS_ES, currentPeriod, nextPeriod, formatCents, type Period } from "@/lib/planilla/payroll-period";
import { computeLoanSchedule, defaultLoanStartPeriod, loanPayoffPeriod } from "@/lib/planilla/payroll-loans";
import { createLoanAction } from "@/app/actions/planilla";

const loanFormSchema = z.object({
  category: z.enum(["prestamo", "adelanto"]),
  amount: z.string().min(1, "El monto es obligatorio."),
  requestDate: z.string().min(1, "La fecha es obligatoria."),
  numInstallments: z.string().min(1),
  startPeriodKey: z.string().min(1),
  notes: z.string(),
});
type LoanFormValues = z.infer<typeof loanFormSchema>;

function periodKeyOf(p: Period): string {
  return `${p.year}-${p.month}-${p.half}`;
}

/** The next ~8 months of quincenas from today, going back one period
 *  too (an adelanto or préstamo requested near a period boundary can
 *  legitimately land on the period that just started) -- this is a
 *  synthetic list, not read from the DB, since a loan's future
 *  quincenas may not have a payroll_entries row yet at all (that's the
 *  whole point -- createLoan materializes them). */
function upcomingPeriods(): Period[] {
  let p: Period = currentPeriod();
  const periods: Period[] = [p];
  for (let i = 0; i < 15; i++) {
    p = nextPeriod(p);
    periods.push(p);
  }
  return periods;
}

function periodLabel(p: Period): string {
  return `${MONTHS_ES[p.month - 1]} ${p.year} · ${p.half === 1 ? "1ra" : "2da"} quincena`;
}

export function LoanDialog({
  employeeId,
  defaultCategory,
  open,
  onOpenChange,
  onSaved,
}: {
  employeeId: string;
  defaultCategory: "prestamo" | "adelanto";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [submitting, setSubmitting] = React.useState(false);
  const periods = React.useMemo(() => upcomingPeriods(), []);
  const today = React.useMemo(() => new Date().toISOString().slice(0, 10), []);

  const form = useForm<LoanFormValues>({
    resolver: zodResolver(loanFormSchema),
    defaultValues: {
      category: defaultCategory,
      amount: "",
      requestDate: today,
      numInstallments: "1",
      startPeriodKey: periodKeyOf(defaultLoanStartPeriod(defaultCategory, today) ?? periods[0]),
      notes: "",
    },
  });

  const category = form.watch("category");
  const requestDate = form.watch("requestDate");
  const numInstallmentsRaw = form.watch("numInstallments");
  const startPeriodKey = form.watch("startPeriodKey");
  const amountRaw = form.watch("amount");

  React.useEffect(() => {
    if (open) {
      form.reset({
        category: defaultCategory,
        amount: "",
        requestDate: today,
        numInstallments: "1",
        startPeriodKey: periodKeyOf(defaultLoanStartPeriod(defaultCategory, today) ?? periods[0]),
        notes: "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultCategory]);

  // Re-derive the default start period whenever the type or the
  // request date changes (but leave it alone if the person already
  // picked a different one on purpose -- this effect only fires on
  // category/date changes, never on startPeriodKey itself).
  React.useEffect(() => {
    const def = defaultLoanStartPeriod(category, requestDate);
    if (def) form.setValue("startPeriodKey", periodKeyOf(def));
    if (category === "adelanto") form.setValue("numInstallments", "1");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, requestDate]);

  const numInstallments = Math.max(1, parseInt(numInstallmentsRaw || "1", 10) || 1);
  const amountCents = Math.round(parseFloat(amountRaw || "0") * 100);
  const startPeriod = periods.find((p) => periodKeyOf(p) === startPeriodKey) ?? periods[0];

  const schedule =
    amountCents > 0 ? computeLoanSchedule(amountCents, numInstallments, startPeriod) : [];
  const payoff = loanPayoffPeriod(startPeriod, numInstallments);

  async function onSubmit(values: LoanFormValues) {
    setSubmitting(true);
    try {
      const cents = Math.round(parseFloat(values.amount || "0") * 100);
      const n = values.category === "adelanto" ? 1 : Math.max(1, parseInt(values.numInstallments, 10) || 1);
      const sp = periods.find((p) => periodKeyOf(p) === values.startPeriodKey) ?? periods[0];
      await createLoanAction({
        employeeId,
        category: values.category,
        principalCents: cents,
        requestDate: values.requestDate,
        numInstallments: n,
        startPeriod: sp,
        notes: values.notes.trim() || null,
      });
      onOpenChange(false);
      onSaved();
    } finally {
      setSubmitting(false);
    }
  }

  const isAdelanto = category === "adelanto";

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isAdelanto ? "Nuevo adelanto" : "Nuevo préstamo"}
      description={
        isAdelanto
          ? "Un adelanto se descuenta completo de una sola quincena -- normalmente la que está en curso cuando se solicita."
          : "Un préstamo se reparte en cuotas iguales entre varias quincenas seguidas. Ambos se aplican automáticamente a sus quincenas: no hace falta recordarlo cada vez que se registra la planilla."
      }
      onSubmit={form.handleSubmit(onSubmit)}
      submitting={submitting}
      submitLabel={isAdelanto ? "Registrar adelanto" : "Registrar préstamo"}
    >
      <Form {...form}>
        <form className="flex flex-col gap-4" onSubmit={form.handleSubmit(onSubmit)}>
          <FormField
            control={form.control}
            name="category"
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
                    <SelectItem value="prestamo">Préstamo (en cuotas)</SelectItem>
                    <SelectItem value="adelanto">Adelanto (una sola quincena)</SelectItem>
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
              name="requestDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha de solicitud</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {!isAdelanto && (
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="numInstallments"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cuotas (quincenas)</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" step="1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormItem>
                <FormLabel>Forma de pago</FormLabel>
                <Select value="cuota_fija" disabled>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="cuota_fija">Cuota fija (partes iguales)</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            </div>
          )}

          <FormField
            control={form.control}
            name="startPeriodKey"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{isAdelanto ? "Se descuenta de la quincena" : "Primera cuota en la quincena"}</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {periods.map((p) => (
                      <SelectItem key={periodKeyOf(p)} value={periodKeyOf(p)}>
                        {periodLabel(p)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Calculada automáticamente según la fecha de solicitud -- se puede cambiar si hace falta.
                </p>
              </FormItem>
            )}
          />

          {amountCents > 0 && schedule.length > 0 && (
            <div className="rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
              {isAdelanto ? (
                <p>
                  Se descuenta <span className="font-medium text-foreground">{formatCents(amountCents)}</span> completo
                  de la quincena de <span className="font-medium text-foreground">{periodLabel(startPeriod)}</span>.
                </p>
              ) : (
                <>
                  <p>
                    <span className="font-medium text-foreground">{numInstallments}</span> cuotas de{" "}
                    <span className="font-medium text-foreground">{formatCents(schedule[0].amountCents)}</span>
                    {schedule[schedule.length - 1].amountCents !== schedule[0].amountCents && (
                      <>
                        {" "}(última <span className="font-medium text-foreground">
                          {formatCents(schedule[schedule.length - 1].amountCents)}
                        </span>)
                      </>
                    )}
                    , empezando en {periodLabel(startPeriod)}.
                  </p>
                  <p className="mt-1">
                    Fecha estimada de pago total: <span className="font-medium text-foreground">{periodLabel(payoff)}</span>
                  </p>
                </>
              )}
            </div>
          )}

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
