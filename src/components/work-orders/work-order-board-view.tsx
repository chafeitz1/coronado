"use client";

import { AlertCircle, ArrowRight, Building2, CalendarClock, CalendarRange, ClipboardList, Repeat } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { OverdueBadge } from "@/components/ui/badge";
import { WorkOrderStatusChip } from "@/components/work-order-status-chip";
import { EmptyState } from "@/components/ui/empty-state";
import { card, mutedText } from "@/lib/ui";
import { format, type Dictionary } from "@/lib/i18n/dictionaries";
import { daysUntil, endOfWeek, formatLongDate } from "@/lib/dates";
import { isWorkOrderClosed } from "@/lib/types/database";
import type { Locale } from "@/lib/types/database";
import type { WorkOrderRow } from "./types";

const UNIT_LABEL_KEYS = {
  days: "unitDays",
  weeks: "unitWeeks",
  months: "unitMonths",
  years: "unitYears",
} as const;

function recurrenceLabel(wo: WorkOrderRow, dict: Dictionary) {
  if (!wo.recurrence_interval_value || !wo.recurrence_interval_unit) return undefined;
  const unit = dict.workOrderDetail[UNIT_LABEL_KEYS[wo.recurrence_interval_unit]];
  return format(dict.workOrderDetail.recurrence, { value: wo.recurrence_interval_value, unit });
}

// "Venció ayer" / "Venció hace {days} días" — how late a task is, not just
// its due date, so an overdue card reads at a glance without doing the
// date math yourself. Same helper as the To Do card and List views.
function overdueRelativeLabel(daysLate: number, dict: Dictionary) {
  return daysLate === 1 ? dict.workOrders.overdueYesterday : format(dict.workOrders.overdueDaysAgo, { days: daysLate });
}

// Colored per column so the board reads at a glance — same red the Overdue
// badge already uses elsewhere, blue for today (reusing the "open" status
// token), amber for this week, and a neutral gray for the unbounded "later"
// bucket since it isn't urgent by definition.
type ColumnTheme = { icon: LucideIcon; fg: string; bg: string };

const THEME: Record<"overdue" | "today" | "week" | "later", ColumnTheme> = {
  overdue: { icon: AlertCircle, fg: "text-status-overdue-fg", bg: "bg-status-overdue-bg" },
  today: { icon: CalendarClock, fg: "text-status-open-fg", bg: "bg-status-open-bg" },
  week: { icon: CalendarRange, fg: "text-status-progress-fg", bg: "bg-status-progress-bg" },
  later: { icon: ArrowRight, fg: "text-ink-faint", bg: "bg-surface-hover" },
};

// Kanban-style triage board: every open task sorted into exactly one of
// four due-date columns — Overdue / Today / This week / Later, the last
// one deliberately unbounded (any future date, or none at all) rather than
// paginated, since "how far out is everything else" is the point of it.
export function WorkOrderBoardView({
  orders,
  today,
  dict,
  locale,
  currentUserId,
  isOwner,
  onSelect,
  emptyMessage,
}: {
  orders: WorkOrderRow[];
  today: string;
  dict: Dictionary;
  locale: Locale;
  currentUserId: string;
  isOwner: boolean;
  onSelect: (workOrderId: string) => void;
  emptyMessage: string;
}) {
  if (orders.length === 0) {
    return <EmptyState icon={ClipboardList} message={emptyMessage} />;
  }

  const endOfThisWeek = endOfWeek(today);

  const overdue: WorkOrderRow[] = [];
  const dueToday: WorkOrderRow[] = [];
  const thisWeek: WorkOrderRow[] = [];
  const later: WorkOrderRow[] = [];

  for (const wo of orders) {
    if (wo.due_date && wo.due_date < today) overdue.push(wo);
    else if (wo.due_date === today) dueToday.push(wo);
    else if (wo.due_date && wo.due_date <= endOfThisWeek) thisWeek.push(wo);
    else later.push(wo);
  }
  for (const bucket of [overdue, dueToday, thisWeek, later]) {
    bucket.sort((a, b) => (a.due_date ?? "9999-99-99").localeCompare(b.due_date ?? "9999-99-99"));
  }

  const columns: { key: keyof typeof THEME; label: string; rows: WorkOrderRow[] }[] = [
    { key: "overdue", label: dict.workOrders.viewOverdue, rows: overdue },
    { key: "today", label: dict.workOrders.viewToday, rows: dueToday },
    { key: "week", label: dict.workOrders.viewThisWeek, rows: thisWeek },
    { key: "later", label: dict.workOrders.boardLater, rows: later },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {columns.map((col) => {
        const theme = THEME[col.key];
        const Icon = theme.icon;
        return (
          <div key={col.key} className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-hairline bg-canvas-soft">
            <div className={`flex items-center gap-2 border-b border-hairline px-3 py-2.5 ${theme.bg}`}>
              <Icon className={`size-4 shrink-0 ${theme.fg}`} strokeWidth={2} />
              <h2 className={`text-sm font-semibold ${theme.fg}`}>{col.label}</h2>
              <span className={`ml-auto text-xs font-medium ${theme.fg}`}>{col.rows.length}</span>
            </div>
            <div className="flex-1 space-y-2 p-2.5">
              {col.rows.length === 0 ? (
                <p className={`${mutedText} px-1`}>{dict.workOrders.boardEmpty}</p>
              ) : (
                col.rows.map((wo) => {
                  const canEdit = isOwner || wo.assigned_to === currentUserId;
                  const overdue = !isWorkOrderClosed(wo.status) && !!wo.due_date && wo.due_date < today;
                  return (
                    <div
                      key={wo.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => onSelect(wo.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") onSelect(wo.id);
                      }}
                      className={`flex cursor-pointer items-start gap-3 p-3 text-left transition-colors hover:bg-surface-hover active:bg-surface-hover ${card}`}
                    >
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <p className="flex items-center gap-1.5 text-sm font-medium text-ink">
                          {wo.recurrence_interval_value && (
                            <span title={recurrenceLabel(wo, dict)} className="shrink-0">
                              <Repeat className="size-3.5 text-ink-faint" strokeWidth={2} />
                            </span>
                          )}
                          <span className="truncate">{wo.title}</span>
                        </p>
                        {wo.due_date && (
                          <p className={`truncate text-xs ${overdue ? "text-status-overdue-fg" : "text-ink-muted"}`}>
                            {overdue
                              ? `${formatLongDate(wo.due_date, locale)} · ${overdueRelativeLabel(-daysUntil(wo.due_date), dict)}`
                              : formatLongDate(wo.due_date, locale)}
                          </p>
                        )}
                        <div className="flex items-center justify-between gap-2">
                          <WorkOrderStatusChip workOrderId={wo.id} status={wo.status} canEdit={canEdit} dict={dict} />
                          {overdue && <OverdueBadge locale={locale} />}
                        </div>
                      </div>
                      {wo.assignee ? (
                        <span className="shrink-0">
                          <Avatar fullName={wo.assignee.full_name} avatarUrl={wo.assignee.avatar_url} />
                        </span>
                      ) : (
                        wo.vendor && (
                          <span className="flex min-w-0 shrink-0 items-center gap-1 text-xs text-ink-muted">
                            <Building2 className="size-3.5 shrink-0" strokeWidth={2} />
                            <span className="max-w-20 truncate">{wo.vendor.name}</span>
                          </span>
                        )
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
