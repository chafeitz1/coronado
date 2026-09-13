"use client";

import { useTransition } from "react";
import Image from "next/image";
import { Check, Trash2, Truck } from "lucide-react";
import { togglePurchaseItemStatus, toggleOrderedStatus, deletePurchaseItem } from "@/app/actions/purchase-items";
import { mutedText } from "@/lib/ui";
import { format, type Dictionary } from "@/lib/i18n/dictionaries";
import { formatLongDate } from "@/lib/dates";
import type { Locale } from "@/lib/types/database";
import type { PurchaseItemRow as PurchaseItemRowType } from "./types";

export function PurchaseItemRow({
  item,
  dict,
  locale,
  canDelete,
}: {
  item: PurchaseItemRowType;
  dict: Dictionary;
  locale: Locale;
  canDelete: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const purchased = item.status === "purchased";

  const subtitle = purchased
    ? item.buyer && item.purchased_at
      ? format(dict.purchases.purchasedBy, { name: item.buyer.full_name }) +
        " · " +
        formatLongDate(item.purchased_at.slice(0, 10), locale)
      : null
    : item.requester
      ? format(dict.purchases.requestedBy, { name: item.requester.full_name }) +
        " · " +
        formatLongDate(item.created_at.slice(0, 10), locale)
      : null;

  // Middle step between "requested" and "purchased" — only meaningful for
  // urgent items still pending, so staff/owner can see at a glance what's
  // already ordered (waiting to arrive) versus what still needs ordering.
  const showOrderedControl = item.list_type === "urgent" && !purchased;

  const orderedTitle = item.ordered_at
    ? (item.orderer ? format(dict.purchases.orderedBy, { name: item.orderer.full_name }) + " · " : "") +
      formatLongDate(item.ordered_at.slice(0, 10), locale)
    : dict.purchases.markOrdered;

  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <div className="mt-0.5 flex shrink-0 flex-col items-center gap-1.5">
        <button
          type="button"
          disabled={pending}
          aria-label={purchased ? dict.purchases.unmarkPurchased : dict.purchases.markPurchased}
          onClick={() =>
            startTransition(() => {
              togglePurchaseItemStatus(item.id, purchased ? "pending" : "purchased");
            })
          }
          className={`flex size-5 shrink-0 items-center justify-center rounded border transition-colors disabled:opacity-50 ${
            purchased ? "border-primary bg-primary text-on-primary" : "border-hairline hover:border-primary"
          }`}
        >
          {purchased && <Check className="size-3.5" strokeWidth={3} />}
        </button>

        {showOrderedControl && (
          <button
            type="button"
            disabled={pending}
            title={orderedTitle}
            aria-label={item.ordered_at ? dict.purchases.unmarkOrdered : dict.purchases.markOrdered}
            onClick={() => startTransition(() => toggleOrderedStatus(item.id, !item.ordered_at))}
            className={`flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors disabled:opacity-50 ${
              item.ordered_at
                ? "border-primary bg-primary-soft text-primary"
                : "border-hairline text-ink-faint hover:border-primary hover:text-primary"
            }`}
          >
            <Truck className="size-3" strokeWidth={2.5} />
          </button>
        )}
      </div>

      {item.imageUrl && (
        <a href={item.imageUrl} target="_blank" rel="noreferrer" className="relative size-10 shrink-0 overflow-hidden rounded-md border border-hairline">
          <Image src={item.imageUrl} alt="" fill unoptimized className="object-cover" />
        </a>
      )}

      <div className="min-w-0 flex-1">
        <p className={`truncate font-medium ${purchased ? "text-ink-faint line-through" : "text-ink"}`}>
          {item.title}
          {item.quantity && <span className={purchased ? "" : "text-ink-muted"}> · {item.quantity}</span>}
        </p>
        {item.notes && <p className={`${mutedText} truncate`}>{item.notes}</p>}
        {subtitle && <p className={`${mutedText} truncate`}>{subtitle}</p>}
      </div>

      {canDelete && (
        <button
          type="button"
          disabled={pending}
          aria-label={dict.workOrderDetail.delete}
          onClick={() => {
            if (window.confirm(format(dict.purchases.deleteConfirm, { title: item.title }))) {
              startTransition(() => {
                deletePurchaseItem(item.id, item.image_path);
              });
            }
          }}
          className="shrink-0 rounded-md p-1.5 text-ink-faint transition-colors hover:bg-surface-hover hover:text-status-overdue-fg active:bg-surface-hover disabled:opacity-50"
        >
          <Trash2 className="size-4" />
        </button>
      )}
    </li>
  );
}
