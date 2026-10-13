"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { FormDialog } from "@/components/payroll-ui/form-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/payroll-ui/form";
import { Input } from "@/components/payroll-ui/input";
import { Textarea } from "@/components/payroll-ui/textarea";
import type { PayrollEmployee } from "@/lib/types/planilla";
import { setEmployeeLiquidationAction } from "@/app/actions/planilla";

const liquidationFormSchema = z.object({
  endDate: z.string().min(1, "La fecha es obligatoria."),
  liquidationNotes: z.string(),
});
type LiquidationFormValues = z.infer<typeof liquidationFormSchema>;

/** Marca (o edita) la liquidación de un empleado — la fecha exacta en que
 *  se saldaron las prestaciones (Décimo/Vacación/Prima de Antigüedad) más
 *  un espacio para aclaraciones o disputas de ESA liquidación, aparte de
 *  cualquier otra nota. En Coronado la liquidación es el fin de la
 *  relación laboral: fija `termination_date` (el mismo campo que usa el
 *  Directorio), así que el empleado pasa a "no laboran más". Para
 *  reactivarlo está el botón Reactivar en su tarjeta. La fecha además
 *  reinicia el cálculo de las prestaciones hacia adelante. */
export function LiquidationDialog({
  employee,
  open,
  onOpenChange,
  onSaved,
}: {
  employee: PayrollEmployee;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [submitting, setSubmitting] = React.useState(false);
  const isEditing = employee.endDate !== null;

  const form = useForm<LiquidationFormValues>({
    resolver: zodResolver(liquidationFormSchema),
    defaultValues: { endDate: "", liquidationNotes: "" },
  });

  // react-hook-form's defaultValues only apply once at mount, so
  // without this, opening the dialog for a different employee (or
  // reopening it for the same one after an edit) would keep showing
  // whatever was there the first time. Re-seed every time it opens.
  React.useEffect(() => {
    if (open) {
      form.reset({
        endDate: employee.endDate ?? "",
        liquidationNotes: employee.liquidationNotes ?? "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, employee.id]);

  async function onSubmit(values: LiquidationFormValues) {
    setSubmitting(true);
    try {
      await setEmployeeLiquidationAction({
        employeeId: employee.id,
        endDate: values.endDate,
        liquidationNotes: values.liquidationNotes.trim() || null,
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
      title={isEditing ? "Editar liquidación" : "Marcar liquidación"}
      description={`${employee.name} — fecha exacta de liquidación y notas de aclaración o disputa.`}
      onSubmit={form.handleSubmit(onSubmit)}
      submitting={submitting}
      submitLabel={isEditing ? "Guardar" : "Marcar liquidación"}
    >
      <Form {...form}>
        <form className="flex flex-col gap-4" onSubmit={form.handleSubmit(onSubmit)}>
          <p className="text-xs text-muted-foreground">
            Al marcar la liquidación el empleado pasa a «no laboran más» y el cálculo de Décimo/Vacación/Prima
            de Antigüedad se reinicia desde esta fecha. Puedes reactivarlo después desde su tarjeta.
          </p>
          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha de liquidación</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="liquidationNotes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notas de liquidación</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Aclaraciones, disputas, o cualquier detalle sobre esta liquidación..."
                    rows={4}
                    {...field}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </form>
      </Form>
    </FormDialog>
  );
}
