"use client";

import { useCallback, useEffect, useState } from "react";
import { SidePanel } from "@/components/ui/side-panel";
import { WorkOrderDetailContent, type WorkOrderDetailData } from "./work-order-detail-content";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/types/database";

// The List (table) view can't render a Server Component per row click, so
// this fetches the same JSON the [id] route itself renders from and shows
// it in a slide-over instead of navigating away — same "stay on the list,
// pop the detail on top" pattern as AssetPanel/PersonPanel.
export function WorkOrderPanel({
  workOrderId,
  onClose,
  currentUserId,
  isOwner,
  canManageTasks,
  locale,
  dict,
}: {
  workOrderId: string | null;
  onClose: () => void;
  currentUserId: string;
  isOwner: boolean;
  canManageTasks: boolean;
  locale: Locale;
  dict: Dictionary;
}) {
  // Keyed by the id it was fetched for, so a still-in-flight fetch for a
  // just-closed (or already-swapped-to-another) task can't land stale data
  // — `loaded` below only reads it back out when the id still matches,
  // without needing a synchronous setData(null) in the effect body just to
  // clear the previous task while the new one loads.
  const [data, setData] = useState<{ id: string; detail: WorkOrderDetailData; today: string } | null>(null);

  // Reusable so a mutation made from inside the panel (photo upload, status
  // change, edit, note) can re-fetch this same data — this `data` is plain
  // client state, not part of the Server Component tree, so none of those
  // Server Actions' revalidatePath calls ever reach it on their own. See
  // the `onMutate` prop passed to WorkOrderDetailContent below.
  const load = useCallback((id: string) => {
    let cancelled = false;
    fetch(`/api/work-orders/${id}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("failed to load"))))
      .then((json: WorkOrderDetailData & { today: string }) => {
        if (!cancelled) setData({ id, detail: json, today: json.today });
      })
      .catch(() => {
        if (!cancelled) setData(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!workOrderId) return;
    return load(workOrderId);
  }, [workOrderId, load]);

  const loaded = data && data.id === workOrderId ? data : null;

  return (
    // The floating close "X" only needs hiding once the content has its
    // own inline one (next to the edit/delete menu) — while still loading,
    // there's nothing else on screen to close it with.
    <SidePanel open={!!workOrderId} onClose={onClose} hideClose={!!loaded}>
      {loaded ? (
        <WorkOrderDetailContent
          data={loaded.detail}
          today={loaded.today}
          currentUserId={currentUserId}
          isOwner={isOwner}
          canManageTasks={canManageTasks}
          locale={locale}
          dict={dict}
          onClose={onClose}
          onMutate={() => workOrderId && load(workOrderId)}
        />
      ) : (
        <div className="animate-pulse space-y-3">
          <div className="h-6 w-2/3 rounded bg-canvas-soft" />
          <div className="h-4 w-1/2 rounded bg-canvas-soft" />
          <div className="h-24 rounded bg-canvas-soft" />
        </div>
      )}
    </SidePanel>
  );
}
