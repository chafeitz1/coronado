import { notFound } from "next/navigation";
import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { updateWorkOrder } from "@/app/actions/work-orders";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Combobox } from "@/components/ui/combobox";
import { RecurrenceFields } from "@/components/recurrence-fields";
import { buttonPrimary, card, input, mutedText, pageHeading } from "@/lib/ui";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { IntervalUnit } from "@/lib/types/database";

export default async function EditWorkOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireOwner();
  const dict = getDictionary(profile.locale);
  const supabase = await createClient();

  const { data: workOrder } = await supabase.from("work_orders").select("*").eq("id", id).single();
  if (!workOrder) notFound();

  const [{ data: assets }, { data: staff }, { data: vendors }] = await Promise.all([
    supabase.from("assets").select("id, name").order("name"),
    supabase.from("profiles").select("id, full_name").eq("role", "staff").order("full_name"),
    supabase.from("vendors").select("id, name").order("name"),
  ]);

  return (
    <div className="space-y-6">
      <h1 className={pageHeading}>{dict.workOrderForm.editTitle}</h1>
      <form action={updateWorkOrder.bind(null, id)} className={`space-y-5 p-5 ${card}`}>
        <input
          name="title"
          required
          defaultValue={workOrder.title}
          placeholder={dict.workOrderForm.titleLabel + "... *"}
          className="w-full border-0 border-b-2 border-hairline bg-transparent px-0 py-2 text-lg font-semibold text-ink outline-none placeholder:text-ink-faint focus:border-primary"
        />

        <Field label={dict.workOrderForm.descriptionLabel}>
          <textarea name="description" rows={3} defaultValue={workOrder.description ?? ""} className={input} />
        </Field>

        <Field label={dict.workOrderForm.dueDateLabel}>
          <input type="date" name="due_date" defaultValue={workOrder.due_date ?? ""} className={input} />
        </Field>

        <Field label={dict.workOrderForm.assetLabel}>
          <Combobox
            name="asset_id"
            placeholder={dict.workOrderForm.startTyping}
            noResultsLabel={dict.workOrderForm.noOptions}
            defaultValue={workOrder.asset_id ?? undefined}
            options={(assets ?? []).map((a) => ({ value: a.id, label: a.name }))}
          />
        </Field>

        <Field label={dict.workOrderForm.assignLabel}>
          <Combobox
            name="assigned_to"
            placeholder={dict.workOrderForm.startTyping}
            noResultsLabel={dict.workOrderForm.noOptions}
            defaultValue={workOrder.assigned_to ?? undefined}
            options={(staff ?? []).map((s) => ({ value: s.id, label: s.full_name }))}
          />
        </Field>

        <Field label={dict.workOrderForm.vendorLabel}>
          <Combobox
            name="vendor_id"
            placeholder={dict.workOrderForm.startTyping}
            noResultsLabel={dict.workOrderForm.noOptions}
            defaultValue={workOrder.vendor_id ?? undefined}
            options={(vendors ?? []).map((v) => ({ value: v.id, label: v.name }))}
          />
        </Field>

        <RecurrenceFields
          dict={dict}
          defaultEnabled={!!workOrder.recurrence_interval_value}
          defaultValue={workOrder.recurrence_interval_value ?? 3}
          defaultUnit={(workOrder.recurrence_interval_unit as IntervalUnit) ?? "months"}
        />
        <p className={mutedText}>{dict.workOrderForm.recurrenceHint}</p>

        <SubmitButton className={`w-full ${buttonPrimary}`} pendingLabel={dict.workOrderForm.submitPending}>
          {dict.workOrderForm.submitEdit}
        </SubmitButton>
      </form>
    </div>
  );
}
