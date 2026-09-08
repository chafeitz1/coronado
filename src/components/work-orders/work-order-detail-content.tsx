import { Bell, MessageSquare, Wrench, Building2, Repeat, CalendarCheck, History, X } from "lucide-react";
import { addWorkOrderNote } from "@/app/actions/work-orders";
import { StatusBadge, OverdueBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar } from "@/components/ui/avatar";
import { WorkOrderAttachments } from "@/components/work-order-attachments";
import { WorkOrderStatusButtons } from "@/components/work-order-status-buttons";
import { WorkOrderMenu } from "@/components/work-order-menu";
import { SubmitButton } from "@/components/ui/submit-button";
import { buttonPrimary, card, input, mutedText, pageHeading, sectionHeading } from "@/lib/ui";
import { format, type Dictionary } from "@/lib/i18n/dictionaries";
import { daysUntil, formatLongDate } from "@/lib/dates";
import { isWorkOrderClosed } from "@/lib/types/database";
import type { Locale, WorkOrderStatus } from "@/lib/types/database";

type Person = { full_name: string; avatar_url?: string | null } | null;

export type WorkOrderDetailData = {
  workOrder: {
    id: string;
    title: string;
    description: string | null;
    status: WorkOrderStatus;
    due_date: string | null;
    completed_at: string | null;
    recurrence_interval_value: number | null;
    recurrence_interval_unit: string | null;
    assigned_to: string | null;
    created_at: string;
  };
  asset: { name: string } | null;
  vendor: { name: string } | null;
  assignee: Person;
  creator: Person;
  attachments: { id: string; storagePath: string; fileName: string; publicUrl: string; canDelete: boolean }[];
  notes: { id: string; body: string; notify_owner: boolean; created_at: string; author: Person | Person[] }[];
  activityRows: {
    id: string;
    event_type: "status_changed" | "edited";
    meta: { from?: string; to?: string; fields?: string[] } | null;
    created_at: string;
    actor: Person | Person[];
  }[];
  seriesRows: { id: string; due_date: string | null; status: WorkOrderStatus; completed_at: string | null }[];
};

function single<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

// "Venció ayer" / "Venció hace {days} días" — how late a task is, not just
// its due date, so an overdue detail view reads at a glance without doing
// the date math yourself.
function overdueRelativeLabel(daysLate: number, dict: Dictionary) {
  return daysLate === 1 ? dict.workOrders.overdueYesterday : format(dict.workOrders.overdueDaysAgo, { days: daysLate });
}

// The full task view — status, meta grid, attachments, notes, activity log,
// recurrence history — factored out of the detail route's page.tsx so it
// can be rendered two ways with the same markup and logic: as that route's
// own page content (direct navigation, and the To Do view's inline detail
// column), and inside WorkOrderPanel's client-fetched side panel for the
// List (table) view, which can't render a Server Component itself.
export function WorkOrderDetailContent({
  data,
  today,
  currentUserId,
  isOwner,
  locale,
  dict,
  onClose,
}: {
  data: WorkOrderDetailData;
  // ISO date string ("YYYY-MM-DD") — needed to tell whether this task is
  // overdue. Passed in rather than computed here since this component
  // renders both server-side (the [id] route) and client-side (the List
  // view's panel), and "now" belongs to whichever fetched the data.
  today: string;
  currentUserId: string;
  isOwner: boolean;
  locale: Locale;
  dict: Dictionary;
  // Only set when rendered inside WorkOrderPanel's side panel — adds a
  // close "X" next to the edit/delete menu so it's on the same row
  // regardless of how the status buttons below happen to wrap. The [id]
  // route itself renders this with no onClose, since a standalone page
  // has nothing to "close" to.
  onClose?: () => void;
}) {
  const { workOrder, asset, vendor, assignee, creator, attachments, notes, activityRows, seriesRows } = data;
  const canChangeStatus = isOwner || workOrder.assigned_to === currentUserId;
  const overdue = !isWorkOrderClosed(workOrder.status) && !!workOrder.due_date && workOrder.due_date < today;

  const unitLabels: Record<string, string> = {
    days: dict.workOrderDetail.unitDays,
    weeks: dict.workOrderDetail.unitWeeks,
    months: dict.workOrderDetail.unitMonths,
    years: dict.workOrderDetail.unitYears,
  };

  const fieldLabels: Record<string, string> = {
    title: dict.workOrderDetail.fieldTitle,
    description: dict.workOrderDetail.fieldDescription,
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
    ...activityRows.map((row) => {
      const actor = single(row.actor);
      const meta = row.meta ?? {};
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
            <div className="flex flex-wrap items-center gap-2">
              <h1 className={pageHeading}>{workOrder.title}</h1>
              {overdue && <OverdueBadge locale={locale} />}
            </div>
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
          <div className="flex shrink-0 items-center gap-1">
            <WorkOrderMenu
              workOrderId={workOrder.id}
              workOrderTitle={workOrder.title}
              canEdit={isOwner}
              canDelete={isOwner}
              dict={dict}
            />
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="flex size-7 shrink-0 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-canvas-soft active:bg-canvas-soft hover:text-ink active:text-ink"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {canChangeStatus ? (
            <WorkOrderStatusButtons workOrderId={workOrder.id} status={workOrder.status} dict={dict} />
          ) : (
            <StatusBadge status={workOrder.status} locale={locale} />
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
                  date: formatLongDate(workOrder.completed_at.slice(0, 10), locale),
                })}
              </span>
            )}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-4 border-t border-hairline p-5">
        <div className="space-y-1">
          <p className={sectionHeading}>{dict.workOrderForm.dueDateLabel}</p>
          {workOrder.due_date ? (
            overdue ? (
              <div className="text-status-overdue-fg">
                <p className="text-sm font-medium">{formatLongDate(workOrder.due_date, locale)}</p>
                <p className="text-xs">{overdueRelativeLabel(-daysUntil(workOrder.due_date), dict)}</p>
              </div>
            ) : (
              <p className="text-sm text-ink">{formatLongDate(workOrder.due_date, locale)}</p>
            )
          ) : (
            <p className="text-sm text-ink">{dict.workOrders.noDueDate}</p>
          )}
        </div>
        <div className="space-y-1">
          <p className={sectionHeading}>{dict.workOrderDetail.assignedToLabel}</p>
          {assignee ? (
            <div className="flex items-center gap-2">
              <Avatar fullName={assignee.full_name} avatarUrl={assignee.avatar_url ?? null} />
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
          {notes.map((note) => {
            const author = single(note.author);
            return (
              <li key={note.id} className="flex gap-3 rounded-md border border-hairline p-3.5 text-sm">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                  <MessageSquare className="size-4" strokeWidth={2} />
                </span>
                <div className="min-w-0">
                  <p className="text-ink">{note.body}</p>
                  <p className={`mt-1.5 flex items-center gap-1 text-xs ${mutedText}`}>
                    {author?.full_name ?? "—"} · {new Date(note.created_at).toLocaleString(locale)}
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
          {notes.length === 0 && <EmptyState icon={MessageSquare} message={dict.workOrderDetail.emptyNotes} />}
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
          {!isOwner && (
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
                <span className={`block text-xs ${mutedText}`}>{new Date(entry.createdAt).toLocaleString(locale)}</span>
              </p>
            </li>
          ))}
        </ul>
      </section>

      {seriesRows.length > 0 && (
        <section className="space-y-3 border-t border-hairline p-5">
          <h2 className={sectionHeading}>{dict.workOrderDetail.historyTitle}</h2>
          <ul className="space-y-3">
            {seriesRows.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-1.5 text-ink-secondary">
                  <Repeat className="size-3.5 text-ink-faint" />
                  {row.due_date
                    ? format(dict.workOrderDetail.historyDueDate, { date: formatLongDate(row.due_date, locale) })
                    : dict.workOrders.noDueDate}
                </span>
                <span className="flex items-center gap-3">
                  {row.completed_at && (
                    <span className={`text-xs ${mutedText}`}>{formatLongDate(row.completed_at.slice(0, 10), locale)}</span>
                  )}
                  <StatusBadge status={row.status} locale={locale} />
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
