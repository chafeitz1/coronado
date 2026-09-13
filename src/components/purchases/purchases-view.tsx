"use client";

import { useMemo, useState } from "react";
import { Plus, ShoppingCart, AlertCircle, Copy, Check, Package, Truck } from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";
import { PurchaseItemRow } from "./purchase-item-row";
import { NewPurchaseItemPanel } from "./new-purchase-item-panel";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonPrimary, buttonSecondary, listCard, mutedText, pageHeading, sectionHeading } from "@/lib/ui";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/types/database";
import type { PurchaseItemRow as PurchaseItemRowType } from "./types";

type Tab = "pending" | "purchased";

export function PurchasesView({
  items,
  dict,
  locale,
  currentUserId,
  isOwner,
}: {
  items: PurchaseItemRowType[];
  dict: Dictionary;
  locale: Locale;
  currentUserId: string;
  isOwner: boolean;
}) {
  const [tab, setTab] = useState<Tab>("pending");
  const [panelOpen, setPanelOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const pendingUrgent = items.filter((i) => i.status === "pending" && i.list_type === "urgent");
  const pendingUrgentToOrder = pendingUrgent.filter((i) => !i.ordered_at);
  const pendingUrgentOrdered = pendingUrgent.filter((i) => i.ordered_at);
  const pendingGroceries = items.filter((i) => i.status === "pending" && i.list_type === "groceries");
  const purchased = useMemo(
    () =>
      items
        .filter((i) => i.status === "purchased")
        .sort((a, b) => (b.purchased_at ?? "").localeCompare(a.purchased_at ?? "")),
    [items]
  );

  const groceriesText = useMemo(() => {
    const lines = pendingGroceries.map((i) => `- ${i.title}${i.quantity ? ` (${i.quantity})` : ""}`);
    return `${dict.purchases.whatsappHeader}\n${lines.join("\n")}`;
  }, [pendingGroceries, dict.purchases.whatsappHeader]);

  function canDelete(item: PurchaseItemRowType) {
    return isOwner || item.requested_by === currentUserId;
  }

  async function copyList() {
    try {
      await navigator.clipboard.writeText(groceriesText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can be unavailable (permissions, non-secure context) —
      // WhatsApp button below still works as a fallback.
    }
  }

  function sendWhatsapp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(groceriesText)}`, "_blank");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className={pageHeading}>{dict.purchases.title}</h1>
        <button type="button" onClick={() => setPanelOpen(true)} className={buttonPrimary}>
          <Plus className="size-4" /> {dict.purchases.addItem}
        </button>
      </div>

      <div className="flex gap-5 border-b border-hairline">
        <button type="button" onClick={() => setTab("pending")} className={tabClass(tab === "pending")}>
          {dict.purchases.pendingTab}
        </button>
        <button type="button" onClick={() => setTab("purchased")} className={tabClass(tab === "purchased")}>
          {dict.purchases.purchasedTab}
        </button>
      </div>

      {tab === "pending" ? (
        <div className="space-y-6">
          {pendingUrgent.length > 0 && (
            <section className="space-y-3">
              <h2 className={`flex items-center gap-1.5 ${sectionHeading} text-status-overdue-fg`}>
                <AlertCircle className="size-3.5" /> {dict.purchases.urgentListTitle} ({pendingUrgent.length})
              </h2>

              {/* Both group headers stay visible even when a group is empty —
                  a fixed two-zone layout reads at a glance ("top zone is
                  always what's still to order") without having to check
                  which label is which every time. */}
              <div className="space-y-1.5">
                <p className={`flex items-center gap-1.5 px-1 ${mutedText}`}>
                  <Package className="size-3.5" />
                  {dict.purchases.toOrderGroupTitle} ({pendingUrgentToOrder.length})
                </p>
                {pendingUrgentToOrder.length > 0 && (
                  <ul className={listCard}>
                    {pendingUrgentToOrder.map((item) => (
                      <PurchaseItemRow key={item.id} item={item} dict={dict} locale={locale} canDelete={canDelete(item)} />
                    ))}
                  </ul>
                )}
              </div>

              <div className="space-y-1.5">
                <p className={`flex items-center gap-1.5 px-1 ${mutedText}`}>
                  <Truck className="size-3.5 text-primary" />
                  {dict.purchases.orderedGroupTitle} ({pendingUrgentOrdered.length})
                </p>
                {pendingUrgentOrdered.length > 0 && (
                  <ul className={listCard}>
                    {pendingUrgentOrdered.map((item) => (
                      <PurchaseItemRow key={item.id} item={item} dict={dict} locale={locale} canDelete={canDelete(item)} />
                    ))}
                  </ul>
                )}
              </div>
            </section>
          )}

          <section className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className={sectionHeading}>
                {dict.purchases.groceriesListTitle} ({pendingGroceries.length})
              </h2>
              {pendingGroceries.length > 0 && (
                <div className="flex items-center gap-2">
                  <button type="button" onClick={copyList} className={buttonSecondary}>
                    {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                    {copied ? dict.purchases.copied : dict.purchases.copyList}
                  </button>
                  <button type="button" onClick={sendWhatsapp} className={buttonSecondary}>
                    <WhatsAppIcon className="size-3.5" />
                    {dict.purchases.sendWhatsapp}
                  </button>
                </div>
              )}
            </div>
            {pendingGroceries.length === 0 && pendingUrgent.length === 0 ? (
              <EmptyState icon={ShoppingCart} message={dict.purchases.emptyGroceries} />
            ) : pendingGroceries.length === 0 ? (
              <p className={`${mutedText} px-1`}>{dict.purchases.emptyGroceries}</p>
            ) : (
              <ul className={listCard}>
                {pendingGroceries.map((item) => (
                  <PurchaseItemRow key={item.id} item={item} dict={dict} locale={locale} canDelete={canDelete(item)} />
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : purchased.length === 0 ? (
        <EmptyState icon={ShoppingCart} message={dict.purchases.emptyPurchased} />
      ) : (
        <ul className={listCard}>
          {purchased.map((item) => (
            <PurchaseItemRow key={item.id} item={item} dict={dict} locale={locale} canDelete={canDelete(item)} />
          ))}
        </ul>
      )}

      {panelOpen && <NewPurchaseItemPanel dict={dict} onClose={() => setPanelOpen(false)} />}
    </div>
  );
}

function tabClass(active: boolean) {
  return `-mb-px border-b-2 px-1 pb-2.5 text-sm font-medium transition-colors ${
    active ? "border-primary text-primary" : "border-transparent text-ink-muted hover:text-ink active:text-ink"
  }`;
}
