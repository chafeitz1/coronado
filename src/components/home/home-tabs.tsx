"use client";

import { useRef, useState } from "react";
import type { Dictionary } from "@/lib/i18n/dictionaries";

const SWIPE_THRESHOLD_PX = 50;

// Tap the pills, or swipe the content — both switch between the normal
// Home dashboard and the read-only guest-routine timeline. Only one pane
// is ever mounted at a time (rather than a scroll-snap row holding both),
// so the two tabs' very different content heights never fight each other
// for the container's height. The swipe handler only reads touch
// positions (no preventDefault/stopPropagation), so it never blocks a
// nested gesture like the purchase rows' own swipe-to-reveal actions —
// starting a drag on one of those rows is free to be "claimed" by the
// row instead, same as swipe behavior in most apps with nested gestures.
export function HomeTabs({
  homeContent,
  routineContent,
  dict,
}: {
  homeContent: React.ReactNode;
  routineContent: React.ReactNode;
  dict: Dictionary;
}) {
  const [active, setActive] = useState<0 | 1>(0);
  const touchStartX = useRef<number | null>(null);

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX) return;
    setActive(deltaX < 0 ? 1 : 0);
  }

  return (
    <div>
      <div className="mb-4 inline-flex rounded-full border border-hairline bg-canvas-soft p-1">
        <button
          type="button"
          onClick={() => setActive(0)}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            active === 0 ? "bg-surface text-ink shadow-[var(--shadow-soft)]" : "text-ink-muted"
          }`}
        >
          {dict.home.tabHome}
        </button>
        <button
          type="button"
          onClick={() => setActive(1)}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            active === 1 ? "bg-surface text-ink shadow-[var(--shadow-soft)]" : "text-ink-muted"
          }`}
        >
          {dict.home.tabRoutine}
        </button>
      </div>

      <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {active === 0 ? homeContent : routineContent}
      </div>
    </div>
  );
}
