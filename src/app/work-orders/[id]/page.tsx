import { notFound } from "next/navigation";
import { Bell, MessageSquare, Wrench, Building2, Repeat, CalendarCheck, History } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { addWorkOrderNote } from "@/app/actions/work-orders";
import { StatusBadge, PriorityBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar } from "@/components/ui/avatar";
import { WorkOrderAttachments } from "@/components/work-order-attachments";
import { WorkOrderStatusButtons } from "@/components/work-order-status-buttons";
import { WorkOrderMenu } from "@/components/work-order-menu";
import { SubmitButton } from "@/components/ui/submit-button";
import { buttonPrimary, card, input, mutedText, pageHeading, sectionHeading } from "@/lib/ui";
import { getDictionary, format } from "@/lib/i18n/dictionaries";
import { formatLongDate } from "@/lib/dates";

export default async function WorkOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireUser();
  const dict = getDictionary(profile.locale);
  const supabase = await createClient();

  const { data: workOrder } = await supabase
    .from("work_orders")
    .select(
      "*, assets(name), vendors(name), assignee:profiles!work_orders_assigned_to_fkey(full_name, avatar_url), creator:profiles!work_orders_created_by_fkey(full_name)"
    )
    .eq("id", id)
    .single();

  if (!workOrder) notFound();

  // Every occurrence of a recurring task shares a series_id (pointing at
  // the root task) — fetch the rest of that series so the detail page can
  // show what happened on past cycles, not just this one occurrence.
  const seriesId = workOrder.series_id ?? workOrder.id;
  const { data: seriesRows } = workOrder.recurrence_interval_value
    ? await supabase
        .from("work_orders")
        .select("id, due_date, status, completed_at, created_at")
        .or(`id.eq.${seriesId},series_id.eq.${seriesId}`)
        .neq("id", workOrder.id)
        .order("due_date", { ascending: false, nullsFirst: false })
    : { data: null };

  const { data: notes } = await supabase
    .from("work_order_notes")
    .select("id, body, notify_owner, created_at, author:profiles(full_name)")
    .eq("work_order_id", id)
    .order("created_at", { ascending: true });

  const { data: attachmentRows } = await supabase
    .from("attachments")
    .select("id, storage_path, file_name, uploaded_by")
    .eq("work_order_id", id)
    .order("created_at", { ascending: true });

  const { data: activityRows } = await supabase
    .from("work_order_activity")
    .select("id, event_type, meta, created_at, actor:profiles(full_name)")
    .eq("work_order_id", id)
    .order("created_at", { ascending: false });

  const isOwner = profile.role === "owner";
  const canChangeStatus = isOwner || workOrder.assigned_to === profile.id;

  const attachments = (attachmentRows ?? []).map((row) => ({
    id: row.id,
    storagePath: row.storage_path,
    fileName: row.file_name,
    publicUrl: supabase.storage.from("attachments").getPublicUrl(row.storage_path).data.publicUrl,
    canDelete: isOwner || row.uploaded_by === profile.id,
  }));

  const asset = single(workOrder.assets);
  const vendor = single(workOrder.vendors);
  const assignee = single(workOrder.assignee);
  const creator = single(workOrder.creator);

  const unitLabels: Record<string, string> = {
    days: dict.workOrderDetail.unitDays,
    weeks: dict.workOrderDetail.unitWeeks,
    months: dict.workOrderDetail.unitMonths,
    years: dict.workOrderDetail.unitYears,
  };

  const fieldLabels: Record<string, string> = {
    title: dict.workOrderDetail.fieldTitle,
    description: dict.workOrderDetail.fieldDescription,
    priority: dict.workOrderDetail.fieldPriority,
    due_date: dict.workOrderDetail.fieldDueDate,
    asset_id: dict.workOrderDetail.fieldAsset,
    assigned_to: dict.workOrderDetail.fieldAssignee,
    vendor_id: dict.workOrderDetail.fieldVendor,
    recurrence: dict.workOrderDetail.fieldRecurrence,
  };

  // Newest first, with a synthetic "created" entry (derived from the work
  // order's own created_by/created_at — no need to log that separately)
  // sorted in alongside the real logged rows (status changes, edits).
  const activity = [
    ...(activityRows ?? []).map((row) => {
      const actor = single(row.actor);
      const meta = (row.meta ?? {}) as { from?: string; to?: string; fields?: string[] };
      const text =
        row.event_type === "status_changed"
          ? format(dict.workOrderDetail.activityStatusChanged, {
              from: dict.statuses[meta.from as keyof typeof dict.statuses] ?? meta.from ?? "",
              to: dict.statuses[meta.to as keyof typeof dict.statuses] ?? meta.to ?? "",
            })
          : format(dict.workOrderDetail.activityEdited, {
              fields: (meta.fields ?? []).map((f) => fieldLabels[f] ?? f).join(", "),
            });
      return { id: row.id, actorName: actor?.full_name ?? "—", createdAt: row.created_at, text };
    }),
    {
      id: "created",
      actorName: creator?.full_name ?? "—",
      createdAt: workOrder.created_at,
      text: dict.workOrderDetail.activityCreated,
    },
  ].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return (
    <div className={`overflow-hidden ${card}`}>
      <div className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <h1 className={pageHeading}>{workOrder.title}</h1>
            {/* A recurring task is always requested by the owner — not
                worth the line, same reasoning as the list row. One-off
                tasks keep it, since who asked is actually useful there. */}
            {!workOrder.recurrence_interval_value && (
              <p className={mutedText}>{format(dict.workOrderDetail.createdBy, { name: creator?.full_name ?? "—" })}</p>
            )}
          </div>
          {/* Its own row, aligned with the title, so wrapping status
              buttons below (narrow screens: 4 buttons don't fit one line)
              can't drag it along and leave it floating mid-block. */}
          <WorkOrderMenu
            workOrderId={workOrder.id}
            workOrderTitle={workOrder.title}
            canEdit={isOwner}
            canDelete={isOwner}
            dict={dict}
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {canChangeStatus ? (
            <WorkOrderStatusButtons workOrderId={workOrder.id} status={workOrder.status} dict={dict} />
          ) : (
            <StatusBadge status={workOrder.status} locale={profile.locale} />
          )}
        </div>
        {(workOrder.recurrence_interval_value || workOrder.completed_at) && (
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
            {workOrder.recurrence_interval_value && (
              <span className="flex items-center gap-1.5">
                <Repeat className="size-3.5" />
                {format(dict.workOrderDetail.recurrence, {
                  value: workOrder.recurrence_interval_value,
                  unit: unitLabels[workOrder.recurrence_interval_unit ?? ""] ?? workOrder.recurrence_interval_unit ?? "",
                })}
              </span>
            )}
            {workOrder.completed_at && (
              <span className="flex items-center gap-1.5">
                <CalendarCheck className="size-3.5" />
                {format(dict.workOrderDetail.completedOn, {
                  date: formatLongDate(workOrder.completed_at.slice(0, 10), profile.locale),
                })}
              </span>
            )}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-4 border-t border-hairline p-5 sm:grid-cols-3">
        <div className="space-y-1">
          <p className={sectionHeading}>{dict.workOrderForm.dueDateLabel}</p>
          <p className="text-sm text-ink">
            {workOrder.due_date ? formatLongDate(workOrder.due_date, profile.locale) : dict.workOrders.noDueDate}
          </p>
        </div>
        <div className="space-y-1">
          <p className={sectionHeading}>{dict.workOrderForm.priorityLabel}</p>
          <PriorityBadge priority={workOrder.priority} locale={profile.locale} />
        </div>
        <div className="space-y-1">
          <p className={sectionHeading}>{dict.workOrderDetail.assignedToLabel}</p>
          {assignee ? (
            <div className="flex items-center gap-2">
              <Avatar fullName={assignee.full_name} avatarUrl={assignee.avatar_url} />
              <span className="truncate text-sm text-ink">{assignee.full_name}</span>
            </div>
          ) : (
            <p className="text-sm text-ink-muted">{dict.workOrderDetail.unassigned}</p>
          )}
        </div>
      </div>

      {(asset || vendor) && (
        <div className="flex flex-wrap gap-x-8 gap-y-3 border-t border-hairline p-5 text-sm">
          {asset && (
            <span className="flex items-center gap-2">
              <Wrench className="size-4 text-ink-faint" strokeWidth={2} />
              {asset.name}
            </span>
          )}
          {vendor && (
            <span className="flex items-center gap-2">
              <Building2 className="size-4 text-ink-faint" strokeWidth={2} />
              {vendor.name}
            </span>
          )}
        </div>
      )}

      {workOrder.description && (
        <section className="space-y-2 border-t border-hairline p-5">
          <h2 className={sectionHeading}>{dict.workOrderDetail.descriptionTitle}</h2>
          <p className="text-sm text-ink-secondary">{workOrder.description}</p>
        </section>
      )}

      <section className="space-y-3 border-t border-hairline p-5">
        <h2 className={sectionHeading}>{dict.workOrderDetail.attachmentsTitle}</h2>
        <WorkOrderAttachments workOrderId={workOrder.id} attachments={attachments} dict={dict} />
      </section>

      <section className="space-y-4 border-t border-hairline p-5">
        <h2 className={sectionHeading}>{dict.workOrderDetail.notesTitle}</h2>

        <ul className="space-y-3">
          {notes?.map((note) => {
            const author = single(note.author);
            return (
              <li key={note.id} className="flex gap-3 rounded-md border border-hairline p-3.5 text-sm">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                  <MessageSquare className="size-4" strokeWidth={2} />
                </span>
                <div className="min-w-0">
                  <p className="text-ink">{note.body}</p>
                  <p className={`mt-1.5 flex items-center gap-1 text-xs ${mutedText}`}>
                    {author?.full_name ?? "—"} · {new Date(note.created_at).toLocaleString(profile.locale)}
                    {note.notify_owner && (
                      <span className="ml-1 inline-flex items-center gap-1 text-status-progress-fg">
                        <Bell className="size-3" /> {dict.workOrderDetail.notifiedOwner}
                      </span>
                    )}
                  </p>
                </div>
              </li>
            );
          })}
          {(!notes || notes.length === 0) && <EmptyState icon={MessageSquare} message={dict.workOrderDetail.emptyNotes} />}
        </ul>

        <form action={addWorkOrderNote} className="space-y-3 rounded-md border border-hairline p-4">
          <input type="hidden" name="work_order_id" value={workOrder.id} />
          <textarea
            name="body"
            required
            rows={2}
            placeholder={dict.workOrderDetail.notePlaceholder}
            className={input}
          />
          {profile.role !== "owner" && (
            <label className="flex items-center gap-2 text-sm text-ink-muted">
              <input type="checkbox" name="notify_owner" className="size-4 rounded border-hairline accent-primary" />
              <Bell className="size-3.5" /> {dict.workOrderDetail.notifyOwner}
            </label>
          )}
          <SubmitButton className={buttonPrimary} pendingLabel={dict.workOrderDetail.addNotePending}>
            {dict.workOrderDetail.addNote}
          </SubmitButton>
        </form>
      </section>

      <section className="space-y-3 border-t border-hairline p-5">
        <h2 className={sectionHeading}>{dict.workOrderDetail.activityTitle}</h2>
        <ul className="space-y-3">
          {activity.map((entry) => (
            <li key={entry.id} className="flex gap-3 text-sm">
              <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-canvas-soft text-ink-faint">
                <History className="size-3.5" strokeWidth={2} />
              </span>
              <p className="text-ink-secondary">
                <span className="font-medium text-ink">{entry.actorName}</span> {entry.text}
                <span className={`block text-xs ${mutedText}`}>
                  {new Date(entry.createdAt).toLocaleString(profile.locale)}
                </span>
              </p>
            </li>
          ))}
        </ul>
      </section>

      {seriesRows && seriesRows.length > 0 && (
        <section className="space-y-3 border-t border-hairline p-5">
          <h2 className={sectionHeading}>{dict.workOrderDetail.historyTitle}</h2>
          <ul className="space-y-3">
            {seriesRows.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-1.5 text-ink-secondary">
                  <Repeat className="size-3.5 text-ink-faint" />
                  {row.due_date
                    ? format(dict.workOrderDetail.historyDueDate, { date: formatLongDate(row.due_date, profile.locale) })
                    : dict.workOrders.noDueDate}
                </span>
                <span className="flex items-center gap-3">
                  {row.completed_at && (
                    <span className={`text-xs ${mutedText}`}>
                      {formatLongDate(row.completed_at.slice(0, 10), profile.locale)}
                    </span>
                  )}
                  <StatusBadge status={row.status} locale={profile.locale} />
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function single<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}
