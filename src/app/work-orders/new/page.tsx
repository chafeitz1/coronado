import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createWorkOrder } from "@/app/actions/work-orders";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { RecurrenceFields } from "@/components/recurrence-fields";
import { buttonPrimary, card, input, mutedText, pageHeading } from "@/lib/ui";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default async function NewWorkOrderPage() {
  const profile = await requireUser();
  const dict = getDictionary(profile.locale);
  const supabase = await createClient();

  const [{ data: assets }, { data: staff }] = await Promise.all([
    supabase.from("assets").select("id, name").order("name"),
    profile.role === "owner"
      ? supabase.from("profiles").select("id, full_name").eq("role", "staff").order("full_name")
      : Promise.resolve({ data: null }),
  ]);

  return (
    <div className="max-w-lg space-y-6">
      <h1 className={pageHeading}>{dict.workOrderForm.title}</h1>

      <form action={createWorkOrder} className={`space-y-4 p-5 ${card}`}>
        <Field label={dict.workOrderForm.titleLabel}>
          <input name="title" required className={input} />
        </Field>

        <Field label={dict.workOrderForm.descriptionLabel}>
          <textarea name="description" rows={3} className={input} />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label={dict.workOrderForm.priorityLabel}>
            <select name="priority" defaultValue="medium" className={input}>
              <option value="low">{dict.priorities.low}</option>
              <option value="medium">{dict.priorities.medium}</option>
              <option value="high">{dict.priorities.high}</option>
            </select>
          </Field>

          <Field label={dict.workOrderForm.dueDateLabel}>
            <input type="date" name="due_date" className={input} />
          </Field>
        </div>

        <Field label={dict.workOrderForm.assetLabel}>
          <select name="asset_id" defaultValue="" className={input}>
            <option value="">{dict.workOrderForm.noneOption}</option>
            {assets?.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </Field>

        {profile.role === "owner" && (
          <>
            <Field label={dict.workOrderForm.assignLabel}>
              <select name="assigned_to" defaultValue="" className={input}>
                <option value="">{dict.workOrderForm.unassignedOption}</option>
                {staff?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name}
                  </option>
                ))}
              </select>
            </Field>

            <RecurrenceFields dict={dict} />
            <p className={mutedText}>{dict.workOrderForm.recurrenceHint}</p>
          </>
        )}

        <SubmitButton className={buttonPrimary} pendingLabel={dict.workOrderForm.submitPending}>
          {dict.workOrderForm.submit}
        </SubmitButton>
      </form>
    </div>
  );
}
