"use client";

import { useMemo, useState } from "react";
import { Plus, CalendarClock } from "lucide-react";
import { AnnouncementRow } from "./announcement-row";
import { NewAnnouncementPanel } from "./new-announcement-panel";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonPrimary, listCard, pageHeading } from "@/lib/ui";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/types/database";
import type { AnnouncementRow as AnnouncementRowType } from "./types";

type Tab = "upcoming" | "history";

export function AnnouncementsView({
  items,
  dict,
  locale,
  isOwner,
}: {
  items: AnnouncementRowType[];
  dict: Dictionary;
  locale: Locale;
  isOwner: boolean;
}) {
  const [tab, setTab] = useState<Tab>("upcoming");
  const [panelOpen, setPanelOpen] = useState(false);

  const upcoming = items.filter((i) => i.status === "pending");
  const history = useMemo(
    () =>
      items
        .filter((i) => i.status === "happened")
        .sort((a, b) => (b.happened_at ?? "").localeCompare(a.happened_at ?? "")),
    [items]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className={pageHeading}>{dict.announcements.title}</h1>
        {isOwner && (
          <button type="button" onClick={() => setPanelOpen(true)} className={buttonPrimary}>
            <Plus className="size-4" /> {dict.announcements.addItem}
          </button>
        )}
      </div>

      <div className="flex gap-5 border-b border-hairline">
        <button type="button" onClick={() => setTab("upcoming")} className={tabClass(tab === "upcoming")}>
          {dict.announcements.upcomingTab}
        </button>
        <button type="button" onClick={() => setTab("history")} className={tabClass(tab === "history")}>
          {dict.announcements.historyTab}
        </button>
      </div>

      {tab === "upcoming" ? (
        upcoming.length === 0 ? (
          <EmptyState icon={CalendarClock} message={dict.announcements.emptyUpcoming} />
        ) : (
          <ul className={listCard}>
            {upcoming.map((item) => (
              <AnnouncementRow key={item.id} item={item} dict={dict} locale={locale} canDelete={isOwner} />
            ))}
          </ul>
        )
      ) : history.length === 0 ? (
        <EmptyState icon={CalendarClock} message={dict.announcements.emptyHistory} />
      ) : (
        <ul className={listCard}>
          {history.map((item) => (
            <AnnouncementRow key={item.id} item={item} dict={dict} locale={locale} canDelete={isOwner} />
          ))}
        </ul>
      )}

      {panelOpen && <NewAnnouncementPanel dict={dict} onClose={() => setPanelOpen(false)} />}
    </div>
  );
}

function tabClass(active: boolean) {
  return `-mb-px border-b-2 px-1 pb-2.5 text-sm font-medium transition-colors ${
    active ? "border-primary text-primary" : "border-transparent text-ink-muted hover:text-ink active:text-ink"
  }`;
}
