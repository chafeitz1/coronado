"use client";

import { useTransition } from "react";
import { Check, Trash2 } from "lucide-react";
import { toggleAnnouncementStatus, deleteAnnouncement } from "@/app/actions/announcements";
import { mutedText } from "@/lib/ui";
import { format, type Dictionary } from "@/lib/i18n/dictionaries";
import { formatLongDate, isoDateOffset } from "@/lib/dates";
import type { Locale } from "@/lib/types/database";
import type { AnnouncementRow as AnnouncementRowType } from "./types";

export function AnnouncementRow({
  item,
  dict,
  locale,
  canDelete,
}: {
  item: AnnouncementRowType;
  dict: Dictionary;
  locale: Locale;
  canDelete: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const happened = item.status === "happened";

  const dateLabel =
    item.end_date && item.end_date !== item.start_date
      ? `${formatLongDate(item.start_date, locale)} – ${formatLongDate(item.end_date, locale)}`
      : formatLongDate(item.start_date, locale);

  // Pending and the last day of its window has already passed — same
  // "overdue" red text used for tasks, applied here since nobody confirmed
  // it happened.
  const overdue = !happened && (item.end_date ?? item.start_date) < isoDateOffset(0);

  const subtitle = happened
    ? item.marker && item.happened_at
      ? format(dict.announcements.markedBy, { name: item.marker.full_name }) +
        " · " +
        formatLongDate(item.happened_at.slice(0, 10), locale)
      : null
    : item.creator
      ? format(dict.announcements.postedBy, { name: item.creator.full_name })
      : null;

  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <button
        type="button"
        disabled={pending}
        aria-label={happened ? dict.announcements.unmarkHappened : dict.announcements.markHappened}
        onClick={() =>
          startTransition(() => {
            toggleAnnouncementStatus(item.id, happened ? "pending" : "happened");
          })
        }
        className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border transition-colors disabled:opacity-50 ${
          happened ? "border-primary bg-primary text-on-primary" : "border-hairline hover:border-primary active:border-primary"
        }`}
      >
        {happened && <Check className="size-3.5" strokeWidth={3} />}
      </button>

      <div className="min-w-0 flex-1">
        <p className={`truncate font-medium ${happened ? "text-ink-faint line-through" : "text-ink"}`}>{item.title}</p>
        <p className={`truncate text-sm ${overdue ? "text-status-overdue-fg" : mutedText}`}>{dateLabel}</p>
        {item.notes && <p className={`${mutedText} truncate`}>{item.notes}</p>}
        {subtitle && <p className={`${mutedText} truncate`}>{subtitle}</p>}
      </div>

      {canDelete && (
        <button
          type="button"
          disabled={pending}
          aria-label={dict.workOrderDetail.delete}
          onClick={() => {
            if (window.confirm(format(dict.announcements.deleteConfirm, { title: item.title }))) {
              startTransition(() => {
                deleteAnnouncement(item.id);
              });
            }
          }}
          className="shrink-0 rounded-md p-1.5 text-ink-faint transition-colors hover:bg-surface-hover hover:text-status-overdue-fg active:bg-surface-hover active:text-status-overdue-fg disabled:opacity-50"
        >
          <Trash2 className="size-4" />
        </button>
      )}
    </li>
  );
}
