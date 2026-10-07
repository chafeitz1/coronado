"use client";

import { useState } from "react";
import { AlertTriangle, Clock, PartyPopper, Repeat, Megaphone, ShoppingCart } from "lucide-react";
import { StatusBadge, OverdueBadge } from "@/components/ui/badge";
import { WorkOrderPanel } from "@/components/work-orders/work-order-panel";
import { AnnouncementRow } from "@/components/announcements/announcement-row";
import { PurchaseItemRow } from "@/components/purchases/purchase-item-row";
import { card, listCard, listRow, mutedText, sectionHeading } from "@/lib/ui";
import { format, type Dictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/types/database";
import type { AnnouncementRow as AnnouncementRowType } from "@/components/announcements/types";
import type { PurchaseItemRow as PurchaseItemRowType } from "@/components/purchases/types";

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
  dueSoon,
  recent,
  announcementRows,
  purchaseRows,
  dict,
  locale,
  currentUserId,
  isOwner,
  canManageTasks,
}: {
  overdue: OrderRow[];
  dueSoon: OrderRow[];
  recent: OrderRow[];
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
      {/* The three things the owner said matter most, in the order given:
          overdue tasks, pending purchases, announcements — ahead of the
          stat tiles and everything else, not buried under them. */}
      {overdue.length > 0 && (
        <OrderSection
          title={dict.home.overdueTitle}
          icon={AlertTriangle}
          orders={overdue}
          tone="danger"
          dict={dict}
          locale={locale}
          onSelect={setOpenTaskId}
        />
      )}

      {purchaseRows.length > 0 && (
        <section className="space-y-2">
          <h2 className={`flex items-center gap-1.5 ${sectionHeading} text-status-overdue-fg`}>
            <ShoppingCart className="size-3.5" /> {dict.home.urgentPurchasesPending}{" "}
            <span className="text-ink-faint">· {purchaseRows.length}</span>
          </h2>
          <ul className={listCard}>
            {purchaseRows.map((p) => (
              <PurchaseItemRow
                key={p.id}
                item={p}
                dict={dict}
                locale={locale}
                canDelete={isOwner || p.requested_by === currentUserId}
              />
            ))}
          </ul>
        </section>
      )}

      {announcementRows.length > 0 && (
        <section className="space-y-2">
          <h2 className={sectionHeading}>
            <span className="inline-flex items-center gap-1.5">
              <Megaphone className="size-3.5" /> {dict.home.upcomingAnnouncements}{" "}
              <span className="text-ink-faint">· {announcementRows.length}</span>
            </span>
          </h2>
          <ul className={listCard}>
            {announcementRows.map((a) => (
              <AnnouncementRow key={a.id} item={a} dict={dict} locale={locale} canDelete={isOwner} />
            ))}
          </ul>
        </section>
      )}

      {dueSoon.length > 0 && (
        <OrderSection
          title={dict.home.dueSoonTitle}
          icon={Clock}
          orders={dueSoon}
          dict={dict}
          locale={locale}
          onSelect={setOpenTaskId}
        />
      )}

      {overdue.length === 0 && dueSoon.length === 0 && purchaseRows.length === 0 && (
        <div className={`flex items-center gap-3 p-5 text-sm ${card}`}>
          <PartyPopper className="size-5 shrink-0 text-status-done-fg" />
          <p className="text-ink-secondary">{dict.home.allClear}</p>
        </div>
      )}

      {recent.length > 0 && (
        <section className="space-y-2">
          <h2 className={sectionHeading}>{dict.home.recentActivity}</h2>
          <ul className={listCard}>
            {recent.map((wo) => {
              const assignee = Array.isArray(wo.profiles) ? wo.profiles[0] : wo.profiles;
              return (
                <li key={wo.id}>
                  <button type="button" onClick={() => setOpenTaskId(wo.id)} className={`${listRow} w-full text-left`}>
                    <div className="min-w-40 flex-1">
                      <p className="flex items-center gap-1.5 truncate font-medium text-ink">
                        {wo.title}
                        {wo.recurrence_interval_value && (
                          <Repeat className="size-3.5 shrink-0 text-ink-faint" strokeWidth={2} />
                        )}
                      </p>
                      <p className={`${mutedText} truncate`}>{assignee ? assignee.full_name : dict.home.unassigned}</p>
                    </div>
                    <StatusBadge status={wo.status} locale={locale} />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

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

function OrderSection({
  title,
  icon: Icon,
  orders,
  tone,
  dict,
  locale,
  onSelect,
}: {
  title: string;
  icon: typeof AlertTriangle;
  orders: OrderRow[];
  tone?: "danger";
  dict: Dictionary;
  locale: Locale;
  onSelect: (id: string) => void;
}) {
  return (
    <section className="space-y-2">
      <h2 className={sectionHeading}>
        <span className="inline-flex items-center gap-1.5">
          <Icon className={`size-3.5 ${tone === "danger" ? "text-status-overdue-fg" : ""}`} />
          {title} <span className="text-ink-faint">· {orders.length}</span>
        </span>
      </h2>
      <ul className={listCard}>
        {orders.map((wo) => {
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
    </section>
  );
}
