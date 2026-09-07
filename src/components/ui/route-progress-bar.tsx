"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// A thin top-of-page bar that appears while a click-triggered navigation is
// in flight — without it, tapping a link on mobile gives no feedback at all
// until the new page suddenly appears (no :hover to confirm the tap, and
// most transitions aren't instant on a slow connection). Listens for clicks
// on any internal <a> anywhere in the app (event delegation on `document`,
// same trick nextjs-toploader-style libraries use) instead of wrapping
// every Link component individually, and hides again once the route
// actually changes. A short delay before showing avoids flashing on
// already-prefetched, near-instant navigations.
export function RouteProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentUrl = `${pathname}?${searchParams.toString()}`;
  const [visible, setVisible] = useState(false);
  const showTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The route just changed — hide the bar. Setting state during render
  // (guarded by comparing against the last-seen URL) instead of in an
  // effect, per React's "adjusting state when a prop changes" pattern.
  const [prevUrl, setPrevUrl] = useState(currentUrl);
  if (currentUrl !== prevUrl) {
    setPrevUrl(currentUrl);
    setVisible(false);
  }

  // Cancel a still-pending "show" timer left over from the click that
  // triggered this navigation, so it can't pop the bar back up for the
  // page that just finished loading.
  useEffect(() => {
    if (showTimeout.current) clearTimeout(showTimeout.current);
  }, [currentUrl]);

  useEffect(() => {
    function armShow() {
      if (showTimeout.current) clearTimeout(showTimeout.current);
      showTimeout.current = setTimeout(() => setVisible(true), 150);
    }

    function onClick(e: MouseEvent) {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as HTMLElement)?.closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || anchor.target === "_blank") return;
      let target: URL;
      try {
        target = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (target.origin !== window.location.origin) return;
      if (target.pathname === window.location.pathname && target.search === window.location.search) return;
      armShow();
    }

    document.addEventListener("click", onClick);
    window.addEventListener("popstate", armShow);
    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener("popstate", armShow);
      if (showTimeout.current) clearTimeout(showTimeout.current);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-[100] h-0.5 overflow-hidden bg-primary/15" aria-hidden>
      <div className="h-full w-1/3 animate-[route-progress_1.1s_ease-in-out_infinite] rounded-full bg-primary" />
    </div>
  );
}
