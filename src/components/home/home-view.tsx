"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, PartyPopper, Repeat, Megaphone, ShoppingCart } from "lucide-react";
import { StatusBadge, OverdueBadge } from "@/components/ui/badge";
import { WorkOrderPanel } from "@/components/work-orders/work-order-panel";
import { AnnouncementRow } from "@/components/announcements/announcement-row";
import { PurchaseItemRow } from "@/components/purchases/purchase-item-row";
import { card, listCard, listRow, mutedText, sectionHeading } from "@/lib/ui";
import { format, type Dictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/types/database";
import type { AnnouncementRow as AnnouncementRowType } from "@/components/announcements/types";
import type { PurchaseItemRow as PurchaseItemRowType } from "@/components/purchases/types";
import type { ActivityEvent } from "./types";

// Home is a dashboard, not another place to see every row — each list here
// caps at this many so the page stays a single glance instead of growing
// as tall as the full /work-orders, /purchases or /announcements list
// would. A "Ver todas" link covers the rest when a section is truncated.
const MAX_HOME_ITEMS = 7;

type OrderRow = {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
  recurrence_interval_value: number | null;
  profiles: { full_name: string } | { full_name: string }[] | null;
};

// Rows here open the full detail as a panel over the home page instead of
// navigating to /work-orders, /purchases or /announcements — you're
// browsing the home dashboard, so tapping something shouldn't take you
// somewhere else to act on it. Work orders reuse the same WorkOrderPanel
// the Tasks list already opens on row click; purchases and announcements
// are rendered with their own real row components (which already carry
// their action buttons), so acting on them here needs no panel at all.
export function HomeView({
  overdue,
  activity,
  announcementRows,
  purchaseRows,
  dict,
  locale,
  currentUserId,
  isOwner,
  canManageTasks,
}: {
  overdue: OrderRow[];
  activity: ActivityEvent[];
  announcementRows: AnnouncementRowType[];
  purchaseRows: PurchaseItemRowType[];
  dict: Dictionary;
  locale: Locale;
  currentUserId: string;
  isOwner: boolean;
  // Owner or staff — any staff member can work any task regardless of who
  // it's assigned to, not just its own assignee.
  canManageTasks: boolean;
}) {
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);

  return (
    <>
      {/* Mobile: a single stacked column, in the order the owner said
          matters most (overdue tasks, pending purchases, announcements,
          recent activity) — plain flex-col, so that priority order is just
          DOM order. Desktop has the room to show three of these side by
          side instead of one long scroll: overdue tasks on the left,
          recent activity in the middle, purchases over announcements on
          the right — explicit grid placement rather than reordering the
          DOM, so the mobile order above stays intact underneath it. */}
      <div className="flex flex-col gap-6 md:grid md:grid-cols-3 md:items-start md:gap-x-6 md:gap-y-8">
        {overdue.length > 0 && (
          <OrderSection
            title={dict.home.overdueTitle}
            icon={AlertTriangle}
            orders={overdue}
            tone="danger"
            dict={dict}
            locale={locale}
            onSelect={setOpenTaskId}
            className="md:col-start-1 md:row-start-1"
            viewAllHref="/work-orders?view=overdue"
          />
        )}

        {purchaseRows.length > 0 && (
          <section className="space-y-2 md:col-start-3 md:row-start-1">
            <h2 className={`flex items-center gap-1.5 ${sectionHeading} text-status-overdue-fg`}>
              <ShoppingCart className="size-3.5" /> {dict.home.urgentPurchasesPending}{" "}
              <span className="text-ink-faint">· {purchaseRows.length}</span>
            </h2>
            <ul className={listCard}>
              {purchaseRows.slice(0, MAX_HOME_ITEMS).map((p) => (
                <PurchaseItemRow
                  key={p.id}
                  item={p}
                  dict={dict}
                  locale={locale}
                  canDelete={isOwner || p.requested_by === currentUserId}
                />
              ))}
            </ul>
            {purchaseRows.length > MAX_HOME_ITEMS && <ViewAllLink href="/purchases" dict={dict} />}
          </section>
        )}

        {announcementRows.length > 0 && (
          <section className="space-y-2 md:col-start-3 md:row-start-2">
            <h2 className={sectionHeading}>
              <span className="inline-flex items-center gap-1.5">
                <Megaphone className="size-3.5" /> {dict.home.upcomingAnnouncements}{" "}
                <span className="text-ink-faint">· {announcementRows.length}</span>
              </span>
            </h2>
            <ul className={listCard}>
              {announcementRows.slice(0, MAX_HOME_ITEMS).map((a) => (
                <AnnouncementRow key={a.id} item={a} dict={dict} locale={locale} canDelete={isOwner} />
              ))}
            </ul>
            {announcementRows.length > MAX_HOME_ITEMS && <ViewAllLink href="/announcements" dict={dict} />}
          </section>
        )}

        {overdue.length === 0 && purchaseRows.length === 0 && (
          <div className={`flex items-center gap-3 p-5 text-sm md:col-span-3 ${card}`}>
            <PartyPopper className="size-5 shrink-0 text-status-done-fg" />
            <p className="text-ink-secondary">{dict.home.allClear}</p>
          </div>
        )}

        {activity.length > 0 && (
          <section className="space-y-2 md:col-start-2 md:row-start-1 md:row-span-2">
            <h2 className={sectionHeading}>{dict.home.recentActivity}</h2>
            <ul className={listCard}>
              {activity.slice(0, MAX_HOME_ITEMS).map((event) => (
                <li key={event.id}>
                  <button
                    type="button"
                    onClick={() => setOpenTaskId(event.workOrderId)}
                    className={`${listRow} w-full flex-col items-start gap-0.5 text-left`}
                  >
                    <p className="text-sm text-ink">
                      <span className="font-medium">{event.actorName}</span> {event.text}
                    </p>
                    <p className={mutedText}>{new Date(event.createdAt).toLocaleString(locale)}</p>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <WorkOrderPanel
        workOrderId={openTaskId}
        onClose={() => setOpenTaskId(null)}
        currentUserId={currentUserId}
        isOwner={isOwner}
        canManageTasks={canManageTasks}
        locale={locale}
        dict={dict}
      />
    </>
  );
}

function ViewAllLink({ href, dict }: { href: string; dict: Dictionary }) {
  return (
    <Link href={href} className="block text-sm font-medium text-primary hover:underline active:underline">
      {dict.home.viewAllLink}
    </Link>
  );
}

function OrderSection({
  title,
  icon: Icon,
  orders,
  tone,
  dict,
  locale,
  onSelect,
  className,
  viewAllHref,
}: {
  title: string;
  icon: typeof AlertTriangle;
  orders: OrderRow[];
  tone?: "danger";
  dict: Dictionary;
  locale: Locale;
  onSelect: (id: string) => void;
  className?: string;
  viewAllHref?: string;
}) {
  return (
    <section className={`space-y-2 ${className ?? ""}`}>
      <h2 className={sectionHeading}>
        <span className="inline-flex items-center gap-1.5">
          <Icon className={`size-3.5 ${tone === "danger" ? "text-status-overdue-fg" : ""}`} />
          {title} <span className="text-ink-faint">· {orders.length}</span>
        </span>
      </h2>
      <ul className={listCard}>
        {orders.slice(0, MAX_HOME_ITEMS).map((wo) => {
          const assignee = Array.isArray(wo.profiles) ? wo.profiles[0] : wo.profiles;
          return (
            <li key={wo.id}>
              <button type="button" onClick={() => onSelect(wo.id)} className={`${listRow} w-full text-left`}>
                <div className="min-w-40 flex-1">
                  <p className="flex items-center gap-1.5 truncate font-medium text-ink">
                    {wo.title}
                    {wo.recurrence_interval_value && (
                      <Repeat className="size-3.5 shrink-0 text-ink-faint" strokeWidth={2} />
                    )}
                  </p>
                  <p className={`${mutedText} truncate`}>
                    {assignee ? assignee.full_name : dict.home.unassigned}
                    {wo.due_date ? ` · ${format(dict.workOrders.dueDate, { date: wo.due_date })}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {tone === "danger" ? <OverdueBadge locale={locale} /> : <StatusBadge status={wo.status} locale={locale} />}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
      {viewAllHref && orders.length > MAX_HOME_ITEMS && <ViewAllLink href={viewAllHref} dict={dict} />}
    </section>
  );
}
