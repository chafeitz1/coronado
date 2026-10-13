"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

// Installed (standalone) PWAs get no native pull-to-refresh at all on iOS,
// and desktop-browser conventions don't carry over to a home-screen app —
// without this, the only way to force-refresh is closing and reopening the
// app. Mirrors the native gesture: pull down from the very top of the page
// past a threshold to re-fetch the current route's data.
const PULL_THRESHOLD = 70;
const MAX_PULL = 100;
const RESISTANCE = 0.5;

export function PullToRefresh() {
  const router = useRouter();
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const startYRef = useRef(0);
  const pullRef = useRef(0);
  const draggingRef = useRef(false);

  useEffect(() => {
    function onTouchStart(e: TouchEvent) {
      // Bail if the page isn't scrolled to the very top (matches native
      // behavior — pulling mid-list just scrolls), a refresh is already in
      // flight, or a side panel/modal is open (its own scroll area,
      // signaled by the body-scroll-lock every panel sets — see
      // ui/side-panel.tsx) so this gesture doesn't fire underneath it.
      if (window.scrollY > 0 || refreshing || document.body.style.overflow === "hidden") return;
      startYRef.current = e.touches[0].clientY;
      draggingRef.current = true;
      setDragging(true);
    }

    function onTouchMove(e: TouchEvent) {
      if (!draggingRef.current || refreshing) return;
      if (window.scrollY > 0) {
        draggingRef.current = false;
        setDragging(false);
        pullRef.current = 0;
        setPullDistance(0);
        return;
      }
      const delta = e.touches[0].clientY - startYRef.current;
      if (delta <= 0) {
        pullRef.current = 0;
        setPullDistance(0);
        return;
      }
      // Only now — once this is confirmedly a downward pull from the top —
      // do we hijack the touch, so an upward or sideways gesture (normal
      // scrolling) is never intercepted.
      e.preventDefault();
      const clamped = Math.min(delta * RESISTANCE, MAX_PULL);
      pullRef.current = clamped;
      setPullDistance(clamped);
    }

    function onTouchEnd() {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      setDragging(false);
      if (pullRef.current >= PULL_THRESHOLD) {
        setRefreshing(true);
        router.refresh();
        // router.refresh() doesn't expose completion — a fixed beat is long
        // enough for the re-fetch to land while still reading as responsive.
        window.setTimeout(() => {
          setRefreshing(false);
          setPullDistance(0);
          pullRef.current = 0;
        }, 700);
      } else {
        setPullDistance(0);
        pullRef.current = 0;
      }
    }

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd);
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, [router, refreshing]);

  if (pullDistance === 0 && !refreshing) return null;

  const progress = Math.min(pullDistance / PULL_THRESHOLD, 1);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center pt-[env(safe-area-inset-top)] md:hidden"
      style={{
        transform: `translateY(${refreshing ? 16 : pullDistance - 24}px)`,
        opacity: refreshing ? 1 : progress,
        transition: dragging ? "none" : "transform 200ms ease, opacity 200ms ease",
      }}
    >
      <span className="mt-2 flex size-8 items-center justify-center rounded-full bg-surface shadow-[var(--shadow-elevated)]">
        <Loader2
          className={`size-4 text-primary ${refreshing ? "animate-spin" : ""}`}
          style={refreshing ? undefined : { transform: `rotate(${progress * 360}deg)` }}
        />
      </span>
    </div>
  );
}
