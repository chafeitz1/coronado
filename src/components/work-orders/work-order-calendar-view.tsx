"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ClipboardList } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { card, mutedText } from "@/lib/ui";
import { getMonthGrid, isoDate } from "@/lib/dates";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { WorkOrderRow } from "./types";

export function WorkOrderCalendarView({
  orders,
  today,
  dict,
  locale,
}: {
  orders: WorkOrderRow[];
  today: string;
  dict: Dictionary;
  locale: string;
}) {
  const now = new Date(`${today}T00:00:00Z`);
  const [year, setYear] = useState(now.getUTCFullYear());
  const [month, setMonth] = useState(now.getUTCMonth());

  const grid = useMemo(() => getMonthGrid(year, month), [year, month]);

  const byDate = useMemo(() => {
    const map = new Map<string, WorkOrderRow[]>();
    for (const wo of orders) {
      if (!wo.due_date) continue;
      if (!map.has(wo.due_date)) map.set(wo.due_date, []);
      map.get(wo.due_date)!.push(wo);
    }
    return map;
  }, [orders]);

  const unscheduled = orders.filter((wo) => !wo.due_date);

  const rawMonthLabel = new Date(Date.UTC(year, month, 1)).toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
  });
  const monthLabel = rawMonthLabel.charAt(0).toUpperCase() + rawMonthLabel.slice(1);

  function goPrev() {
    if (month === 0) {
      setYear((y) => y - 1);
      setMonth(11);
    } else {
      setMonth((m) => m - 1);
    }
  }

  function goNext() {
    if (month === 11) {
      setYear((y) => y + 1);
      setMonth(0);
    } else {
      setMonth((m) => m + 1);
    }
  }

  const weekdayLabels = grid.slice(0, 7).map((d) => d.toLocaleDateString(locale, { weekday: "short" }));

  return (
    <div className="space-y-4">
      <div className={`overflow-hidden ${card}`}>
        <div className="flex items-center justify-between border-b border-hairline px-4 py-3">
          <h2 className="text-sm font-semibold text-ink">{monthLabel}</h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={goPrev}
              aria-label="Mes anterior"
              className="flex size-7 items-center justify-center rounded-md text-ink-muted hover:bg-surface-hover active:bg-surface-hover hover:text-ink"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label="Mes siguiente"
              className="flex size-7 items-center justify-center rounded-md text-ink-muted hover:bg-surface-hover active:bg-surface-hover hover:text-ink"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 border-b border-hairline text-center text-xs font-medium uppercase text-ink-faint">
          {weekdayLabels.map((w, i) => (
            <div key={i} className="py-2">
              {w}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {grid.map((day, i) => {
            const key = isoDate(day);
            const inMonth = day.getUTCMonth() === month;
            const isToday = key === today;
            const dayOrders = byDate.get(key) ?? [];
            return (
              <div
                key={i}
                className={`min-h-24 border-b border-r border-hairline p-1.5 last:border-r-0 [&:nth-child(7n)]:border-r-0 ${
                  inMonth ? "" : "bg-canvas-soft"
                }`}
              >
                <p
                  className={`mb-1 inline-flex size-5 items-center justify-center rounded-full text-xs ${
                    isToday ? "bg-primary font-semibold text-on-primary" : inMonth ? "text-ink-secondary" : "text-ink-faint"
                  }`}
                >
                  {day.getUTCDate()}
                </p>
                <div className="space-y-1">
                  {dayOrders.slice(0, 3).map((wo) => (
                    <Link
                      key={wo.id}
                      href={`/work-orders/${wo.id}`}
                      className="flex items-center gap-1 truncate rounded px-1 py-0.5 text-[11px] text-ink-secondary hover:bg-surface-hover active:bg-surface-hover"
                    >
                      <span className="truncate">{wo.title}</span>
                    </Link>
                  ))}
                  {dayOrders.length > 3 && (
                    <p className="px-1 text-[11px] text-ink-faint">+{dayOrders.length - 3}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {unscheduled.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
            {dict.workOrders.unscheduled} <span className="text-ink-faint">· {unscheduled.length}</span>
          </h3>
          <ul className={`divide-y divide-hairline overflow-hidden ${card}`}>
            {unscheduled.map((wo) => (
              <li key={wo.id}>
                <Link href={`/work-orders/${wo.id}`} className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-surface-hover active:bg-surface-hover">
                  <ClipboardList className="size-3.5 shrink-0 text-ink-faint" />
                  <span className="truncate">{wo.title}</span>
                  {wo.asset && <span className={`${mutedText} truncate`}>· {wo.asset.name}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {orders.length === 0 && <EmptyState icon={ClipboardList} message={dict.workOrders.emptyView} />}
    </div>
  );
}
