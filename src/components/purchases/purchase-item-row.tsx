"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { Check, Trash2, Truck } from "lucide-react";
import {
  togglePurchaseItemStatus,
  toggleOrderedStatus,
  deletePurchaseItem,
} from "@/app/actions/purchase-items";
import { mutedText } from "@/lib/ui";
import { format, type Dictionary } from "@/lib/i18n/dictionaries";
import { formatLongDate } from "@/lib/dates";
import type { Locale } from "@/lib/types/database";
import type { PurchaseItemRow as PurchaseItemRowType } from "./types";

// Width of each revealed swipe-action button, and the drag distance (half
// that) past which lifting the finger snaps it fully open instead of
// springing back closed.
const SWIPE_ACTION_WIDTH = 72;
const SWIPE_OPEN_THRESHOLD = SWIPE_ACTION_WIDTH / 2;

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

  // Swipe-right reveals "mark purchased/pending" (always available), swipe-
  // left reveals "delete" (only when canDelete — mirrors the trash icon
  // below, which stays for non-touch users). Touch-only: mouse drags don't
  // fire touch events, so this never engages on desktop.
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    startOffset: number;
    axis: "x" | "y" | null;
  }>({
    startX: 0,
    startY: 0,
    startOffset: 0,
    axis: null,
  });
  const rightSwipeMax = SWIPE_ACTION_WIDTH;
  const leftSwipeMax = canDelete ? SWIPE_ACTION_WIDTH : 0;

  function handleTouchStart(e: React.TouchEvent) {
    const touch = e.touches[0];
    dragRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startOffset: offset,
      axis: null,
    };
    setDragging(true);
  }

  function handleTouchMove(e: React.TouchEvent) {
    const touch = e.touches[0];
    const dx = touch.clientX - dragRef.current.startX;
    const dy = touch.clientY - dragRef.current.startY;
    if (dragRef.current.axis === null) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      dragRef.current.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    }
    if (dragRef.current.axis !== "x") return;
    const next = Math.min(
      rightSwipeMax,
      Math.max(-leftSwipeMax, dragRef.current.startOffset + dx),
    );
    setOffset(next);
  }

  function handleTouchEnd() {
    if (offset > SWIPE_OPEN_THRESHOLD) setOffset(rightSwipeMax);
    else if (offset < -SWIPE_OPEN_THRESHOLD) setOffset(-leftSwipeMax);
    else setOffset(0);
    setDragging(false);
  }

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
    ? (item.orderer
        ? format(dict.purchases.orderedBy, { name: item.orderer.full_name }) +
          " · "
        : "") + formatLongDate(item.ordered_at.slice(0, 10), locale)
    : dict.purchases.markOrdered;

  return (
    <li className="relative overflow-hidden">
      <div
        className="absolute inset-y-0 left-0 flex"
        style={{ width: SWIPE_ACTION_WIDTH }}
      >
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            startTransition(() =>
              togglePurchaseItemStatus(
                item.id,
                purchased ? "pending" : "purchased",
              ),
            );
            setOffset(0);
          }}
          className="flex flex-1 flex-col items-center justify-center gap-1 bg-primary text-[11px] font-medium text-on-primary"
        >
          <Check className="size-4" strokeWidth={2.5} />
          {purchased
            ? dict.purchases.unmarkPurchased
            : dict.purchases.markPurchased}
        </button>
      </div>

      {canDelete && (
        <div
          className="absolute inset-y-0 right-0 flex"
          style={{ width: SWIPE_ACTION_WIDTH }}
        >
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              const confirmMessage = purchased
                ? dict.purchases.deleteConfirmPurchased
                : dict.purchases.deleteConfirm;
              if (
                window.confirm(format(confirmMessage, { title: item.title }))
              ) {
                startTransition(() =>
                  deletePurchaseItem(item.id, item.image_path),
                );
              }
              setOffset(0);
            }}
            className="flex flex-1 flex-col items-center justify-center gap-1 bg-status-overdue-fg text-[11px] font-medium text-white"
          >
            <Trash2 className="size-4" strokeWidth={2.5} />
            {dict.workOrderDetail.delete}
          </button>
        </div>
      )}

      <div
        className={`relative flex items-start gap-3 bg-surface px-4 py-3 ${dragging ? "" : "transition-transform duration-200 ease-out"}`}
        style={{ transform: `translateX(${offset}px)`, touchAction: "pan-y" }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="mt-0.5 flex shrink-0 flex-col items-center gap-1.5">
          <button
            type="button"
            disabled={pending}
            aria-label={
              purchased
                ? dict.purchases.unmarkPurchased
                : dict.purchases.markPurchased
            }
            onClick={() =>
              startTransition(() => {
                togglePurchaseItemStatus(
                  item.id,
                  purchased ? "pending" : "purchased",
                );
              })
            }
            className={`flex size-5 shrink-0 items-center justify-center rounded border transition-colors disabled:opacity-50 ${
              purchased
                ? "border-primary bg-primary text-on-primary"
                : "border-hairline hover:border-primary active:border-primary"
            }`}
          >
            {purchased && <Check className="size-3.5" strokeWidth={3} />}
          </button>

          {showOrderedControl && (
            <button
              type="button"
              disabled={pending}
              title={orderedTitle}
              aria-label={
                item.ordered_at
                  ? dict.purchases.unmarkOrdered
                  : dict.purchases.markOrdered
              }
              onClick={() =>
                startTransition(() =>
                  toggleOrderedStatus(item.id, !item.ordered_at),
                )
              }
              className={`flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors disabled:opacity-50 ${
                item.ordered_at
                  ? "border-primary bg-primary-soft text-primary"
                  : "border-hairline text-ink-faint hover:border-primary hover:text-primary active:border-primary active:text-primary"
              }`}
            >
              <Truck className="size-3" strokeWidth={2.5} />
            </button>
          )}
        </div>

        {item.imageUrl && (
          <a
            href={item.imageUrl}
            target="_blank"
            rel="noreferrer"
            className="relative size-10 shrink-0 overflow-hidden rounded-md border border-hairline"
          >
            <Image
              src={item.imageUrl}
              alt=""
              fill
              unoptimized
              className="object-cover"
            />
          </a>
        )}

        <div className="min-w-0 flex-1">
          <p
            className={`truncate font-medium ${purchased ? "text-ink-faint line-through" : "text-ink"}`}
          >
            {item.title}
            {item.quantity && (
              <span className={purchased ? "" : "text-ink-muted"}>
                {" "}
                · {item.quantity}
              </span>
            )}
          </p>
          {item.notes && (
            <p className={`${mutedText} truncate`}>{item.notes}</p>
          )}
          {subtitle && <p className={`${mutedText} truncate`}>{subtitle}</p>}
        </div>

        {canDelete && (
          <button
            type="button"
            disabled={pending}
            aria-label={dict.workOrderDetail.delete}
            onClick={() => {
              const confirmMessage = purchased
                ? dict.purchases.deleteConfirmPurchased
                : dict.purchases.deleteConfirm;
              if (
                window.confirm(format(confirmMessage, { title: item.title }))
              ) {
                startTransition(() => {
                  deletePurchaseItem(item.id, item.image_path);
                });
              }
            }}
            className="shrink-0 rounded-md p-1.5 text-ink-faint transition-colors hover:bg-surface-hover hover:text-status-overdue-fg active:bg-surface-hover active:text-status-overdue-fg disabled:opacity-50"
          >
            <Trash2 className="size-4" />
          </button>
        )}
      </div>
    </li>
  );
}
