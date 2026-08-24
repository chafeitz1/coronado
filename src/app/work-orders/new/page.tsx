import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createWorkOrder } from "@/app/actions/work-orders";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Combobox } from "@/components/ui/combobox";
import { PhotoDropzone } from "@/components/ui/photo-dropzone";
import { RecurrenceFields } from "@/components/recurrence-fields";
import { buttonPrimary, card, input, mutedText } from "@/lib/ui";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default async function NewWorkOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ asset_id?: string }>;
}) {
  const profile = await requireUser();
  const dict = getDictionary(profile.locale);
  const supabase = await createClient();
  const { asset_id: presetAssetId } = await searchParams;

  const [{ data: assets }, { data: staff }, { data: vendors }] = await Promise.all([
    supabase.from("assets").select("id, name").order("name"),
    profile.role === "owner"
      ? supabase.from("profiles").select("id, full_name").eq("role", "staff").order("full_name")
      : Promise.resolve({ data: null }),
    profile.role === "owner"
      ? supabase.from("vendors").select("id, name").order("name")
      : Promise.resolve({ data: null }),
  ]);

  return (
    <div className="max-w-lg space-y-6">
      <form action={createWorkOrder} className={`space-y-5 p-5 ${card}`}>
        <input
          name="title"
          required
          placeholder={dict.workOrderForm.titleLabel + "... *"}
          className="w-full border-0 border-b-2 border-hairline bg-transparent px-0 py-2 text-lg font-semibold text-ink outline-none placeholder:text-ink-faint focus:border-primary"
        />

        <PhotoDropzone name="photo" label={dict.workOrderForm.addPhoto} />

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
          <Combobox
            name="asset_id"
            placeholder={dict.workOrderForm.startTyping}
            noResultsLabel={dict.workOrderForm.noOptions}
            defaultValue={presetAssetId}
            options={(assets ?? []).map((a) => ({ value: a.id, label: a.name }))}
          />
        </Field>

        {profile.role === "owner" && (
          <>
            <Field label={dict.workOrderForm.assignLabel}>
              <Combobox
                name="assigned_to"
                placeholder={dict.workOrderForm.startTyping}
                noResultsLabel={dict.workOrderForm.noOptions}
                options={(staff ?? []).map((s) => ({ value: s.id, label: s.full_name }))}
              />
            </Field>

            <Field label={dict.workOrderForm.vendorLabel}>
              <Combobox
                name="vendor_id"
                placeholder={dict.workOrderForm.startTyping}
                noResultsLabel={dict.workOrderForm.noOptions}
                options={(vendors ?? []).map((v) => ({ value: v.id, label: v.name }))}
              />
            </Field>

            <RecurrenceFields dict={dict} />
            <p className={mutedText}>{dict.workOrderForm.recurrenceHint}</p>
          </>
        )}

        <SubmitButton className={`w-full ${buttonPrimary}`} pendingLabel={dict.workOrderForm.submitPending}>
          {dict.workOrderForm.submit}
        </SubmitButton>
      </form>
    </div>
  );
}
